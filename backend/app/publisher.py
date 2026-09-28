"""Restricted operator CLI. Never expose these commands as public HTTP routes."""
import argparse
import asyncio
import hashlib
import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Literal

from PIL import Image
from pydantic import Field

from .db import client
from .models import Model, Style, Theme
from .services import finish_deletion

DIMENSIONS = {"thumbnail": (600, 800), "hero": (1800, 680), "mobileHero": (1080, 1200),
              "mobile": (1080, 1920), "desktop": (2560, 1440), "whatsapp": (1080, 1920),
              "status": (1080, 1920)}
REQUIRED = {"thumbnail", "hero", "mobileHero", "mobile", "desktop"}


class ImportAsset(Model):
    path: str
    alt: str = Field(min_length=1, max_length=1000)


class ImportPost(Model):
    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=120)
    title: str = Field(min_length=1, max_length=160)
    quote: str = Field(min_length=1, max_length=1000)
    attribution: str | None = Field(default=None, max_length=200)
    description: str = Field(max_length=3000)
    themes: list[Theme] = Field(min_length=1)
    styles: list[Style] = Field(min_length=1)
    editorial_date: date
    editorial_approved: bool = False
    rights_approved: bool = False
    assets: dict[Literal["thumbnail", "hero", "mobileHero", "mobile", "desktop", "whatsapp", "status"], ImportAsset]


def validate_manifest(path: Path):
    records = [ImportPost.model_validate(p) for p in json.loads(path.read_text(encoding="utf-8"))]
    if len({p.slug for p in records}) != len(records):
        raise ValueError("Duplicate slugs in manifest")
    files = {}
    for post in records:
        if not REQUIRED <= post.assets.keys():
            raise ValueError(f"{post.slug}: missing required artwork")
        for role, asset in post.assets.items():
            source = (path.parent / asset.path).resolve()
            if source.stat().st_size > 20 * 1024 * 1024:
                raise ValueError(f"{source.name}: exceeds 20 MiB")
            with Image.open(source) as img:
                if img.format != "JPEG" or img.size != DIMENSIONS[role]:
                    raise ValueError(f"{source.name}: expected JPEG {DIMENSIONS[role]}")
                img.verify()
            files[(post.slug, role)] = source
    return records, files


async def import_manifest(path: Path):
    records, files = validate_manifest(path)
    async with client(admin=True) as db:
        for post in records:
            existing = (await db.table("posts").select("id,status").eq("slug", post.slug).execute()).data
            if existing and existing[0]["status"] == "published":
                raise ValueError(f"Withdraw {post.slug} before replacing it")
            payload = post.model_dump(mode="json", exclude={"assets"})
            payload["status"] = "draft"
            row = (await db.table("posts").upsert(payload, on_conflict="slug").execute()).data[0]
            for role, asset in post.assets.items():
                data = files[(post.slug, role)].read_bytes()
                checksum = hashlib.sha256(data).hexdigest()
                object_path = f"{row['id']}/{checksum}/{role}.jpg"
                await db.storage.from_("wallpapers-drafts").upload(
                    object_path, data, {"content-type": "image/jpeg", "upsert": "true"})
                width, height = DIMENSIONS[role]
                await db.table("post_assets").upsert({
                    "post_id": row["id"], "role": role, "bucket": "wallpapers-drafts",
                    "object_path": object_path, "mime": "image/jpeg", "width": width,
                    "height": height, "alt": asset.alt, "checksum": checksum,
                }, on_conflict="post_id,role").execute()
            await db.table("post_assets").delete().eq("post_id", row["id"]).not_.in_("role", list(post.assets)).execute()
            print(f"Imported draft {post.slug} ({row['id']})")


async def publish(db, target: str, operator: str):
    members = (await db.table("collection_posts").select("post_id").eq("collection_id", target).execute()).data
    if len(members) != 5:
        raise ValueError("Five posts required")
    for member in members:
        assets = (await db.table("post_assets").select("*").eq("post_id", member["post_id"]).execute()).data
        for asset in assets:
            data = await db.storage.from_(asset["bucket"]).download(asset["object_path"])
            if hashlib.sha256(data).hexdigest() != asset["checksum"]:
                raise ValueError("Stored image checksum mismatch")
            await db.storage.from_("wallpapers-public").upload(
                asset["object_path"], data,
                {"content-type": "image/jpeg", "cache-control": "86400", "upsert": "true"})
            # Read back before registering a published asset.
            copied = await db.storage.from_("wallpapers-public").download(asset["object_path"])
            if hashlib.sha256(copied).hexdigest() != asset["checksum"]:
                raise ValueError("Published image verification failed")
            await db.table("post_assets").update({"bucket": "wallpapers-public"}).eq("id", asset["id"]).execute()
    await db.rpc("publish_collection", {"target": target, "operator_label": operator}).execute()


async def cleanup(db, apply: bool):
    # Versioned paths are nested. Traverse every prefix, including paginated directories.
    cutoff = datetime.now(UTC) - timedelta(days=7)
    refs = set()
    offset = 0
    while True:
        rows = (await db.table("post_assets").select("bucket,object_path").range(offset, offset+999).execute()).data
        refs.update((r["bucket"], r["object_path"]) for r in rows)
        if len(rows) < 1000:
            break
        offset += 1000
    for bucket in ("wallpapers-drafts", "wallpapers-public"):
        pending = [""]
        while pending:
            prefix = pending.pop()
            offset = 0
            while True:
                rows = await db.storage.from_(bucket).list(prefix, {"limit": 100, "offset": offset})
                for row in rows:
                    path = f"{prefix}/{row['name']}".lstrip("/")
                    if not row.get("id"):
                        pending.append(path)
                    elif (bucket, path) not in refs and row.get("created_at"):
                        created = datetime.fromisoformat(row["created_at"])
                        if created < cutoff:
                            print(f"{'Removing' if apply else 'Orphan'} {bucket}/{path}")
                            if apply:
                                await db.storage.from_(bucket).remove([path])
                if len(rows) < 100:
                    break
                offset += 100


async def run(args):
    if args.command == "validate":
        records, _ = validate_manifest(Path(args.manifest))
        print(f"Validated {len(records)} posts")
        return
    if args.command == "import":
        await import_manifest(Path(args.manifest))
        return
    async with client(admin=True) as db:
        if args.command == "assemble":
            print((await db.rpc("assemble_collection", {"day": args.date, "members": args.posts}).execute()).data)
        elif args.command == "publish":
            await publish(db, args.target, args.operator)
        elif args.command == "withdraw":
            await db.rpc("withdraw_content", {"target": args.target, "is_post": args.post,
                                               "operator_label": args.operator}).execute()
        elif args.command == "reconcile":
            await db.rpc("reconcile_counts").execute()
        elif args.command == "retry-deletions":
            for job in (await db.rpc("pending_deletions").execute()).data:
                done = await finish_deletion(db, job["user_id"])
                print(f"Deletion {job['id']}: {'complete' if done else 'pending'}")
        elif args.command == "cleanup":
            await cleanup(db, args.apply)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("validate", "import"):
        commands.add_parser(name).add_argument("manifest")
    assemble = commands.add_parser("assemble")
    assemble.add_argument("date")
    assemble.add_argument("posts", nargs=5)
    for name in ("publish", "withdraw"):
        p = commands.add_parser(name)
        p.add_argument("target")
        p.add_argument("--operator", required=True)
        if name == "withdraw":
            p.add_argument("--post", action="store_true")
    commands.add_parser("reconcile")
    commands.add_parser("retry-deletions")
    commands.add_parser("cleanup").add_argument("--apply", action="store_true")
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
