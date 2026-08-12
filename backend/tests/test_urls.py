"""
URL CRUD tests: creation (random code + custom alias + collision/reserved
handling + scheme restriction), listing (search/pagination), ownership
isolation between users, update/delete, and stats.
"""
import pytest


async def test_create_url_random_code(client, auth_headers):
    response = await client.post(
        "/api/v1/urls", json={"original_url": "https://example.com/a"}, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["is_custom_alias"] is False
    assert len(data["short_code"]) == 7
    assert data["short_url"].endswith(data["short_code"])


async def test_create_url_custom_alias(client, auth_headers):
    response = await client.post(
        "/api/v1/urls",
        json={"original_url": "https://example.com/b", "custom_alias": "my-alias"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["short_code"] == "my-alias"
    assert data["is_custom_alias"] is True


async def test_create_url_duplicate_alias_rejected(client, auth_headers):
    payload = {"original_url": "https://example.com/c", "custom_alias": "taken"}
    first = await client.post("/api/v1/urls", json=payload, headers=auth_headers)
    assert first.status_code == 201

    second = await client.post("/api/v1/urls", json=payload, headers=auth_headers)
    assert second.status_code == 409


@pytest.mark.parametrize("reserved", ["api", "docs", "health"])
async def test_create_url_reserved_alias_rejected(client, auth_headers, reserved):
    response = await client.post(
        "/api/v1/urls",
        json={"original_url": "https://example.com/d", "custom_alias": reserved},
        headers=auth_headers,
    )
    assert response.status_code == 422


async def test_create_url_rejects_non_http_scheme(client, auth_headers):
    response = await client.post(
        "/api/v1/urls", json={"original_url": "javascript:alert(1)"}, headers=auth_headers
    )
    assert response.status_code == 422


async def test_create_url_requires_auth(client):
    response = await client.post("/api/v1/urls", json={"original_url": "https://example.com/e"})
    assert response.status_code == 401


async def test_list_urls_pagination(client, auth_headers):
    for i in range(3):
        await client.post(
            "/api/v1/urls",
            json={"original_url": f"https://example.com/{i}"},
            headers=auth_headers,
        )

    response = await client.get("/api/v1/urls?page=1&page_size=2", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["total_pages"] == 2


async def test_list_urls_search(client, auth_headers):
    await client.post(
        "/api/v1/urls",
        json={"original_url": "https://findme.example.com/x"},
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/urls", json={"original_url": "https://other.example.com/y"}, headers=auth_headers
    )

    response = await client.get("/api/v1/urls?search=findme", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert "findme" in data["items"][0]["original_url"]


async def test_users_cannot_see_each_others_urls(client, auth_headers):
    created = await client.post(
        "/api/v1/urls", json={"original_url": "https://example.com/private"}, headers=auth_headers
    )
    url_id = created.json()["id"]

    other_email = "other@example.com"
    await client.post(
        "/api/v1/auth/register", json={"email": other_email, "password": "TestPass123"}
    )
    other_login = await client.post(
        "/api/v1/auth/login", json={"email": other_email, "password": "TestPass123"}
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    # 404, not 403 — someone else's URL existing isn't confirmed either way.
    response = await client.get(f"/api/v1/urls/{url_id}", headers=other_headers)
    assert response.status_code == 404

    list_response = await client.get("/api/v1/urls", headers=other_headers)
    assert list_response.json()["total"] == 0


async def test_update_url_partial_update(client, auth_headers):
    created = await client.post(
        "/api/v1/urls", json={"original_url": "https://example.com/f"}, headers=auth_headers
    )
    url_id = created.json()["id"]

    response = await client.patch(
        f"/api/v1/urls/{url_id}", json={"is_active": False}, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False
    assert data["original_url"] == "https://example.com/f"


async def test_delete_url(client, auth_headers):
    created = await client.post(
        "/api/v1/urls", json={"original_url": "https://example.com/g"}, headers=auth_headers
    )
    url_id = created.json()["id"]

    delete_response = await client.delete(f"/api/v1/urls/{url_id}", headers=auth_headers)
    assert delete_response.status_code == 204

    get_response = await client.get(f"/api/v1/urls/{url_id}", headers=auth_headers)
    assert get_response.status_code == 404


async def test_url_stats(client, auth_headers):
    await client.post(
        "/api/v1/urls", json={"original_url": "https://example.com/h"}, headers=auth_headers
    )
    response = await client.get("/api/v1/urls/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_urls"] == 1
    assert data["active_urls"] == 1
