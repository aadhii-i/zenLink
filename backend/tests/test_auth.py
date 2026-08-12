"""
Auth endpoint tests: register, login, refresh (including the single-use
denylist enforcement from Phase 6), profile get/update (including the
partial-update bug fixed in Phase 6), and the auth-specific rate limit.
"""
import pytest

from app.core.config import settings
from app.core.rate_limit import limiter


async def test_register_success(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "TestPass123", "full_name": "New User"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data
    assert "hashed_password" not in data


async def test_register_duplicate_email_rejected(client, registered_user):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": registered_user["email"], "password": "AnotherPass123"},
    )
    assert response.status_code == 409


@pytest.mark.parametrize(
    "password",
    ["short1A", "alllowercase1", "ALLUPPERCASE1", "NoDigitsHere"],
)
async def test_register_weak_password_rejected(client, password):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "password": password},
    )
    assert response.status_code == 422


async def test_login_success(client, registered_user):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password_rejected(client, registered_user):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user["email"], "password": "WrongPass123"},
    )
    assert response.status_code == 401


async def test_login_nonexistent_email_rejected(client):
    response = await client.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": "Whatever123"}
    )
    assert response.status_code == 401


async def test_get_profile_requires_auth(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_get_profile_with_valid_token(client, auth_headers, registered_user):
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == registered_user["email"]


async def test_update_profile_partial_update_does_not_clear_omitted_fields(client, auth_headers):
    first = await client.patch(
        "/api/v1/auth/me", json={"full_name": "Original Name"}, headers=auth_headers
    )
    assert first.status_code == 200
    assert first.json()["full_name"] == "Original Name"

    # Regression test for the Phase 6 fix: an empty body must NOT wipe
    # full_name — only fields actually present in the request are applied.
    second = await client.patch("/api/v1/auth/me", json={}, headers=auth_headers)
    assert second.status_code == 200
    assert second.json()["full_name"] == "Original Name"


async def test_refresh_token_issues_new_pair(client, registered_user):
    response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": registered_user["refresh_token"]}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] != registered_user["access_token"]
    assert data["refresh_token"] != registered_user["refresh_token"]


async def test_refresh_token_is_single_use(client, registered_user):
    first = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": registered_user["refresh_token"]}
    )
    assert first.status_code == 200

    # Reusing the SAME (now-rotated) refresh token must be rejected — this
    # is the Phase 6 denylist doing its job.
    second = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": registered_user["refresh_token"]}
    )
    assert second.status_code == 401


async def test_access_token_cannot_be_used_as_refresh_token(client, registered_user):
    response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": registered_user["access_token"]}
    )
    assert response.status_code == 401


async def test_auth_rate_limit_enforced(client):
    """
    The one test that re-enables rate limiting — every other test disables
    it in the `client` fixture for determinism.
    """
    limiter.enabled = True
    try:
        for _ in range(settings.AUTH_RATE_LIMIT_PER_MINUTE):
            await client.post(
                "/api/v1/auth/login", json={"email": "x@example.com", "password": "wrong"}
            )
        response = await client.post(
            "/api/v1/auth/login", json={"email": "x@example.com", "password": "wrong"}
        )
        assert response.status_code == 429
    finally:
        limiter.enabled = False
