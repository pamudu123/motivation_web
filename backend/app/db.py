from contextlib import asynccontextmanager

from httpx import AsyncClient
from supabase import AsyncClientOptions, acreate_client

from .config import get_settings


@asynccontextmanager
async def client(token: str | None = None, *, admin: bool = False):
    settings = get_settings()
    if admin and not settings.supabase_secret_key:
        raise RuntimeError("SUPABASE_SECRET_KEY is required for administrative operations")
    key = (
        settings.supabase_secret_key.get_secret_value()
        if admin
        else settings.supabase_publishable_key
    )
    async with AsyncClient(timeout=settings.request_timeout) as transport:
        options = AsyncClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            postgrest_client_timeout=settings.request_timeout,
            httpx_client=transport,
        )
        db = await acreate_client(str(settings.supabase_url).rstrip("/"), key, options=options)
        if token:
            db.postgrest.auth(token)
        try:
            yield db
        finally:
            await db.auth.close()
