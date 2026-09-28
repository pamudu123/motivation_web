from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from supabase_auth.errors import AuthApiError

from app.config import get_settings
from app.main import app, identity, public_db
from app.models import ProfileUpdate
from app.publisher import validate_manifest


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key")
    get_settings.cache_clear()
    with TestClient(app) as test:
        yield test
    app.dependency_overrides.clear()
    get_settings.cache_clear()


class Query:
    def __init__(self, data):
        self.data = data

    def __getattr__(self, name):
        return lambda *args, **kwargs: self

    async def execute(self):
        return SimpleNamespace(data=self.data, count=len(self.data))


def test_guest_private_requests_rejected(api):
    for path in ("/me", "/me/saved", "/me/reactions"):
        response = api.get("/api/v1" + path)
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "unauthenticated"
        assert response.headers["cache-control"] == "private, no-store"


def test_empty_daily_and_missing_slug(api):
    app.dependency_overrides[public_db] = lambda: Query([])
    assert api.get("/api/v1/collections/daily").json() == {"date": None, "posts": []}
    assert api.get("/api/v1/posts/missing").status_code == 404


def test_invalid_filters_and_pages(api):
    app.dependency_overrides[public_db] = lambda: Query([])
    for query in (
        "limit=101",
        "offset=-1",
        "themes=Invalid",
        "style=Unknown",
        "ids=bad",
        "date=bad",
    ):
        response = api.get("/api/v1/posts?" + query)
        assert response.status_code == 422
        assert response.json()["error"]["requestId"]


def test_search_passes_filters_before_pagination(api):
    db = SimpleNamespace(
        rpc=lambda name, params: Query(
            {"posts": [], "total": 120, "offset": params["skip"], "limit": params["take"]}
        )
    )
    app.dependency_overrides[public_db] = lambda: db
    result = api.get("/api/v1/posts?offset=104&limit=8&themes=Focus,Calm&sort=liked")
    assert result.status_code == 200
    assert result.json() == {"posts": [], "total": 120, "offset": 104, "limit": 8}


def test_profile_cannot_change_identity():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        ProfileUpdate.model_validate({"displayName": "A", "themes": [], "id": "another-user"})
    with pytest.raises(ValidationError):
        ProfileUpdate(display_name="   ")
    assert ProfileUpdate(display_name=" A ", themes=["Focus", "Focus"]).themes == ["Focus"]


@pytest.mark.parametrize("status, expected", [(401, 401), (403, 401), (500, 503), (429, 503)])
def test_auth_failure_is_not_confused_with_outage(api, status, expected):
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def fake_client(*args):
        yield SimpleNamespace(
            auth=SimpleNamespace(
                get_user=AsyncMock(side_effect=AuthApiError("Failed", status, "test"))
            )
        )

    with patch("app.main.client", fake_client):
        assert (
            api.get("/api/v1/me", headers={"Authorization": "Bearer test"}).status_code == expected
        )


def test_profile_mutation_rejects_unknown_fields(api):
    app.dependency_overrides[identity] = lambda: (Query([]), "user", "token")
    assert api.patch("/api/v1/me", json={"displayName": "A", "role": "admin"}).status_code == 422


def test_import_requires_assets(tmp_path):
    import json

    source = tmp_path / "manifest.json"
    source.write_text(
        json.dumps(
            [
                {
                    "slug": "test",
                    "title": "Test",
                    "quote": "Start",
                    "description": "",
                    "themes": ["Focus"],
                    "styles": ["Minimal"],
                    "editorialDate": "2026-01-01",
                    "assets": {},
                }
            ]
        )
    )
    with pytest.raises(ValueError, match="missing required"):
        validate_manifest(source)


def test_error_does_not_leak_upstream_details(api):
    from postgrest.exceptions import APIError

    def fail():
        raise APIError({"code": "42501", "message": "SECRET upstream SQL"})

    app.dependency_overrides[public_db] = fail
    response = api.get("/api/v1/posts")
    assert response.status_code == 403
    assert "SECRET" not in response.text
