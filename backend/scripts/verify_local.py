"""End-to-end against local Supabase only; never accepts a hosted URL."""

import asyncio
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))


async def verify():
    import httpx
    from PIL import Image

    from app.config import get_settings
    from app.db import client
    from app.main import app
    from app.publisher import DIMENSIONS, REQUIRED, import_manifest, publish

    if str(get_settings().supabase_url).rstrip("/") != "http://127.0.0.1:54321":
        raise RuntimeError("This verification is restricted to local Supabase")
    tag = uuid4().hex[:10]
    user_ids = []
    post_ids = []
    collection_id = None
    paths = []
    async with client(admin=True) as admin:
        try:
            tokens = []
            for suffix in ("a", "b"):
                email = f"spark-{tag}-{suffix}@example.test"
                password = uuid4().hex + "Aa1!"
                user = (
                    await admin.auth.admin.create_user(
                        {"email": email, "password": password, "email_confirm": True}
                    )
                ).user
                user_ids.append(str(user.id))
                async with client() as auth:
                    response = await auth.auth.sign_in_with_password(
                        {"email": email, "password": password}
                    )
                    tokens.append(response.session.access_token)
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                assets = {}
                for role in REQUIRED:
                    file = root / f"{role}.jpg"
                    Image.new("RGB", DIMENSIONS[role], "#d4b69a").save(file, "JPEG")
                    assets[role] = {"path": file.name, "alt": "Local test artwork"}
                manifest = [
                    {
                        "slug": f"test-{tag}-{i}",
                        "title": f"Local test {i}",
                        "quote": "A quiet start",
                        "description": "Local fixture only",
                        "themes": ["Focus"],
                        "styles": ["Minimal"],
                        "editorialDate": "2026-01-02",
                        "editorialApproved": True,
                        "rightsApproved": True,
                        "assets": assets,
                    }
                    for i in range(5)
                ]
                source = root / "manifest.json"
                source.write_text(json.dumps(manifest), encoding="utf-8")
                await import_manifest(source)
                await import_manifest(source)
            rows = (
                await admin.table("posts")
                .select("id")
                .like("slug", f"test-{tag}-%")
                .order("slug")
                .execute()
            ).data
            post_ids = [r["id"] for r in rows]
            assert len(post_ids) == 5, "Import retry duplicated posts"
            collection_id = (
                await admin.rpc(
                    "assemble_collection", {"day": "2026-01-02", "members": post_ids}
                ).execute()
            ).data
            await publish(admin, collection_id, "local-integration-test")
            paths = [
                r["object_path"]
                for r in (
                    await admin.table("post_assets")
                    .select("object_path")
                    .in_("post_id", post_ids)
                    .execute()
                ).data
            ]
            print("PASS real local Storage import, retry and atomic publication")
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as api:
                r = await api.get("/api/v1/collections/daily?date=2999-01-01")
                assert r.status_code == 200, r.text
                assert len(r.json()["posts"]) == 5
                assert r.json()["date"] == "2026-01-02"
                asset = r.json()["posts"][0]["versions"]["mobile"]["src"]
                async with httpx.AsyncClient() as remote:
                    image = await remote.get(asset)
                    assert image.status_code == 200 and image.headers["content-type"].startswith(
                        "image/jpeg"
                    )
                headers = [{"Authorization": f"Bearer {t}"} for t in tokens]
                for h in headers:
                    r = await api.get("/api/v1/me", headers=h)
                    assert r.status_code == 200, r.text
                target = post_ids[0]
                writes = await asyncio.gather(
                    *[
                        api.put(
                            f"/api/v1/me/likes/{target}", json={"active": True}, headers=headers[0]
                        )
                        for _ in range(5)
                    ]
                )
                assert all(r.status_code == 200 for r in writes), [r.text for r in writes]
                r = await api.put(
                    f"/api/v1/me/saves/{target}", json={"active": True}, headers=headers[0]
                )
                assert r.status_code == 200, r.text
                assert r.json()["likeCount"] == 1
                assert (await api.get("/api/v1/me/saved", headers=headers[1])).json()["total"] == 0
                assert (await api.get("/api/v1/me/saved", headers=headers[0])).json()["total"] == 1
                async with client(tokens[1]) as other:
                    assert not (
                        await other.table("profiles").select("id").eq("id", user_ids[0]).execute()
                    ).data
                    try:
                        await (
                            other.table("saves")
                            .insert({"user_id": user_ids[0], "post_id": target})
                            .execute()
                        )
                    except Exception:  # noqa: BLE001, S110 -- cleanup / explicit expected denial in integration harness
                        pass
                    else:
                        raise AssertionError("RLS allowed cross-user insertion")
                print(
                    "PASS real local Auth, FastAPI bearer verification, concurrent reactions and direct RLS"
                )
                r = await api.request(
                    "DELETE", "/api/v1/me", headers=headers[0], json={"confirmation": "DELETE"}
                )
                assert r.status_code == 202, r.text
                assert r.json()["status"] == "complete", r.text
                assert (await api.get("/api/v1/me", headers=headers[0])).status_code == 401
                assert (
                    await admin.table("post_stats")
                    .select("like_count")
                    .eq("post_id", target)
                    .single()
                    .execute()
                ).data["like_count"] == 0
                print("PASS real local account deletion, revoked identity and counter cascade")
        finally:
            for uid in user_ids:
                try:
                    await admin.auth.admin.delete_user(uid)
                except Exception:  # noqa: BLE001, S110 -- cleanup / explicit expected denial in integration harness
                    pass
            if collection_id:
                await admin.table("collections").delete().eq("id", collection_id).execute()
            if post_ids:
                await admin.table("posts").delete().in_("id", post_ids).execute()
            if paths:
                for bucket in ("wallpapers-drafts", "wallpapers-public"):
                    await admin.storage.from_(bucket).remove(paths)


if __name__ == "__main__":
    # Capture CLI credentials without printing or persisting them.
    command = "npx.cmd" if os.name == "nt" else "npx"
    result = subprocess.run(
        [command, "--yes", "supabase", "status", "-o", "json"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    config = json.loads(result.stdout)
    os.environ["SUPABASE_URL"] = config["API_URL"]
    os.environ["SUPABASE_PUBLISHABLE_KEY"] = config["PUBLISHABLE_KEY"]
    os.environ["SUPABASE_SECRET_KEY"] = config["SECRET_KEY"]
    asyncio.run(verify())
