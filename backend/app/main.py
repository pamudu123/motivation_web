import asyncio
import base64
import json
import logging
import time
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from .config import get_settings
from .db import client
from .models import (
    Collection,
    Collections,
    Daily,
    DeleteAccount,
    Deletion,
    DesiredState,
    Page,
    Post,
    Profile,
    ProfileUpdate,
    Reaction,
    ReactionResult,
    Style,
    Theme,
)
from .services import catalogue, finish_deletion, profile

log = logging.getLogger("daily_spark")


@asynccontextmanager
async def lifespan(app):
    get_settings()  # Fail before serving requests if configuration is incomplete.
    yield


app = FastAPI(title="Daily Spark API", version="1.0.0", lifespan=lifespan)
bearer = HTTPBearer(auto_error=False)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = str(uuid4())
    started = time.monotonic()
    try:
        async with asyncio.timeout(get_settings().request_timeout + 3):
            response = await call_next(request)
    except (TimeoutError, httpx.HTTPError):
        response = error(
            request, 503, "service_unavailable", "The service is temporarily unavailable."
        )
    except Exception:  # noqa: BLE001 -- redact all unexpected errors at the HTTP boundary
        log.error("request_failed id=%s", request.state.request_id)
        response = error(request, 500, "internal_error", "The request could not be completed.")
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["Cache-Control"] = "private, no-store"
    log.info(
        "request id=%s method=%s path=%s status=%s ms=%.0f",
        request.state.request_id,
        request.method,
        request.url.path,
        response.status_code,
        (time.monotonic() - started) * 1000,
    )
    return response


def error(request, status, code, message, fields=None):
    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "code": code,
                "message": message,
                "fields": fields,
                "requestId": getattr(request.state, "request_id", ""),
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    codes = {
        401: "unauthenticated",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "invalid_input",
        429: "rate_limited",
        503: "service_unavailable",
    }
    return error(
        request, exc.status_code, codes.get(exc.status_code, "request_failed"), str(exc.detail)
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return error(
        request,
        422,
        "invalid_input",
        "Check the supplied fields.",
        [{"field": ".".join(map(str, e["loc"])), "message": e["msg"]} for e in exc.errors()],
    )


@app.exception_handler(APIError)
async def database_error(request, exc):
    status = {"42501": 403, "23505": 409, "23503": 409, "23514": 422, "P0002": 404}.get(
        exc.code, 503
    )
    return error(
        request, status, "database_request_failed", "The data operation could not be completed."
    )


async def public_db():
    async with client() as db:
        yield db


async def identity(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if not credentials:
        raise HTTPException(401, "Please sign in.")
    token = credentials.credentials
    async with client(token) as db:
        try:
            user = (await db.auth.get_user(token)).user
        except AuthApiError as exc:
            raise HTTPException(
                401 if exc.status in (400, 401, 403, 404) else 503,
                "Session expired."
                if exc.status in (400, 401, 403, 404)
                else "Authentication service unavailable.",
            ) from exc
        if not user:
            raise HTTPException(401, "Please sign in.")
        yield db, str(user.id), token


DB = Annotated[object, Depends(public_db)]
User = Annotated[tuple, Depends(identity)]
Offset = Annotated[int, Query(ge=0, le=1000000)]
Limit = Annotated[int, Query(ge=1, le=100)]


def csv_ids(value: str | None):
    if value is None:
        return None
    parts = value.split(",") if value else []
    if len(parts) > 100:
        raise HTTPException(422, "At most 100 IDs are allowed.")
    try:
        return [str(UUID(p)) for p in parts]
    except ValueError as exc:
        raise HTTPException(422, "Invalid post ID.") from exc


@app.get("/api/v1/posts", response_model=Page)
async def posts(
    db: DB,
    search: str = Query("", max_length=200),
    themes: str = Query("", max_length=200),
    style: Style | None = None,
    sort: Literal["newest", "liked"] = "newest",
    date: date | None = None,
    offset: Offset = 0,
    limit: Limit = 24,
    ids: str | None = Query(None, max_length=3700),
    exclude: UUID | None = None,
):
    from typing import get_args

    selected = [t for t in themes.split(",") if t]
    if any(t not in get_args(Theme) for t in selected):
        raise HTTPException(422, "Unknown theme.")
    return await catalogue(
        db,
        q=search.strip(),
        selected_themes=selected,
        selected_style=style,
        ordering=sort,
        on_date=str(date) if date else None,
        skip=offset,
        take=limit,
        selected_ids=csv_ids(ids),
        excluded=str(exclude) if exclude else None,
    )


@app.get("/api/v1/posts/{slug}", response_model=Post)
async def post(slug: str, db: DB):
    rows = (await db.table("posts").select("*").eq("slug", slug).limit(1).execute()).data
    if not rows:
        raise HTTPException(404, "Wallpaper not found.")
    result = await catalogue(db, selected_ids=[rows[0]["id"]], take=1)
    if not result["posts"]:
        raise HTTPException(404, "Wallpaper not found.")
    return result["posts"][0]


@app.get("/api/v1/collections/daily", response_model=Daily)
async def daily(db: DB, date: date | None = None):
    today = datetime.now(UTC).date()
    requested = min(date or today, today)
    rows = (
        await db.table("collections")
        .select("id,editorial_date")
        .lte("editorial_date", str(requested))
        .order("editorial_date", desc=True)
        .limit(1)
        .execute()
    ).data
    if not rows:
        return {"date": None, "posts": []}
    page = await catalogue(db, collection=rows[0]["id"], take=5)
    if len(page["posts"]) != 5:
        raise HTTPException(503, "The collection is temporarily unavailable.")
    return {"date": rows[0]["editorial_date"], "posts": page["posts"]}


@app.get("/api/v1/collections", response_model=Collections)
async def collections(db: DB, before: date | None = None, offset: Offset = 0, limit: Limit = 24):
    query = db.table("collections").select("id,editorial_date", count="exact")
    if before:
        query = query.lt("editorial_date", str(before))
    result = (
        await query.order("editorial_date", desc=True).range(offset, offset + limit - 1).execute()
    )
    summaries = []
    for row in result.data:
        page = await catalogue(db, collection=row["id"], take=1)
        if page["posts"]:
            summaries.append(
                Collection(
                    date=row["editorial_date"],
                    post_count=page["total"],
                    representative=page["posts"][0],
                )
            )
    return Collections(collections=summaries, total=result.count or 0, offset=offset, limit=limit)


@app.get("/api/v1/me", response_model=Profile)
async def me(user: User):
    return await profile(user[0], user[1])


@app.patch("/api/v1/me", response_model=Profile)
async def update_me(body: ProfileUpdate, user: User):
    db, uid, _ = user
    await profile(db, uid)
    await db.table("profiles").update(body.model_dump()).eq("id", uid).execute()
    return await profile(db, uid)


@app.get("/api/v1/me/reactions", response_model=list[Reaction])
async def reactions(user: User, ids: str = Query("", max_length=3700)):
    db, uid, _ = user
    selected = csv_ids(ids)
    if not selected:
        return []
    liked = {
        r["post_id"]
        for r in (
            await db.table("likes")
            .select("post_id")
            .eq("user_id", uid)
            .in_("post_id", selected)
            .execute()
        ).data
    }
    saved = {
        r["post_id"]
        for r in (
            await db.table("saves")
            .select("post_id")
            .eq("user_id", uid)
            .in_("post_id", selected)
            .execute()
        ).data
    }
    page = await catalogue(db, selected_ids=selected, take=100)
    return [
        Reaction(
            post_id=p.id,
            liked=str(p.id) in liked,
            saved=str(p.id) in saved,
            like_count=p.like_count,
        )
        for p in page["posts"]
    ]


@app.get("/api/v1/me/{kind}", response_model=Page)
async def private_collection(
    kind: Literal["liked", "saved"], user: User, offset: Offset = 0, limit: Limit = 24
):
    return await catalogue(user[0], reaction_kind=kind, skip=offset, take=limit)


@app.put("/api/v1/me/{kind}/{post_id}", response_model=ReactionResult)
async def react(kind: Literal["likes", "saves"], post_id: UUID, body: DesiredState, user: User):
    return (
        await user[0]
        .rpc(
            "set_reaction",
            {
                "kind": "liked" if kind == "likes" else "saved",
                "target": str(post_id),
                "active": body.active,
            },
        )
        .execute()
    ).data


@app.delete("/api/v1/me", response_model=Deletion, status_code=202)
async def delete_me(body: DeleteAccount, user: User):
    if not get_settings().supabase_secret_key:
        raise HTTPException(503, "Account administration is not configured.")
    _, uid, token = user
    # Token was verified by get_user; AMR time proves authentication, unlike refreshed iat.
    claims = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
    times = [a.get("timestamp", 0) for a in claims.get("amr", [])]
    if not times or max(times) < time.time() - 300:
        raise HTTPException(403, "Sign in again before deleting your account.")
    async with client(admin=True) as admin:
        job = (await admin.rpc("deletion_job", {"target": uid}).execute()).data
        complete = await finish_deletion(admin, uid, token)
        return Deletion(job_id=job["id"], status="complete" if complete else "pending")


@app.get("/api/v1/health/live")
async def live():
    return {"status": "ok"}


@app.get("/api/v1/health/ready")
async def ready(db: DB):
    async with asyncio.timeout(3):
        await db.table("collections").select("id").limit(1).execute()
    return {"status": "ready"}
