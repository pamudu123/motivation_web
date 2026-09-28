from urllib.parse import quote

from .config import get_settings
from .models import Post


def post_document(row: dict) -> Post:
    base = str(get_settings().supabase_url).rstrip("/")
    assets = {
        a["role"]: {
            "src": f"{base}/storage/v1/object/public/{a['bucket']}/{quote(a['object_path'], safe='/')}",
            "width": a["width"], "height": a["height"], "type": a["mime"], "alt": a["alt"],
        }
        for a in row["assets"]
    }
    return Post(
        id=row["id"], slug=row["slug"], title=row["title"], quote=row["quote"],
        attribution=row.get("attribution"), description=row["description"],
        published_at=row["editorial_date"], themes=row["themes"], styles=row["styles"],
        thumbnail=assets["thumbnail"], hero=assets["hero"], mobile_hero=assets["mobileHero"],
        versions={k: v for k, v in assets.items() if k in ("mobile", "desktop", "whatsapp", "status")},
        like_count=row["like_count"],
    )


async def catalogue(db, **params):
    result = (await db.rpc("catalogue", params).execute()).data
    result["posts"] = [post_document(p) for p in result["posts"]]
    return result


async def profile(db, user_id: str):
    result = await db.table("profiles").select("id,display_name,themes").eq("id", user_id).execute()
    if not result.data:
        await db.table("profiles").upsert(
            {"id": user_id}, on_conflict="id", ignore_duplicates=True
        ).execute()
        result = await db.table("profiles").select("id,display_name,themes").eq("id", user_id).execute()
    if not result.data:
        from fastapi import HTTPException
        raise HTTPException(403, "Account unavailable")
    counts = (await db.rpc("reaction_counts").execute()).data
    return {**result.data[0], **counts}


async def finish_deletion(admin, user_id: str, token: str | None = None) -> bool:
    from supabase_auth.errors import AuthApiError
    try:
        if token:
            await admin.auth.admin.sign_out(token, scope="global")
        try:
            await admin.auth.admin.delete_user(user_id)
        except AuthApiError as exc:
            if exc.status != 404:
                raise
        await admin.rpc("finish_deletion", {"target": user_id, "completed": True}).execute()
        return True
    except Exception:
        await admin.rpc("finish_deletion", {"target": user_id, "completed": False}).execute()
        return False
