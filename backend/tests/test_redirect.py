"""
Redirect resolution: 404/410 handling, cache-first behavior, cache
invalidation on update, and that a successful redirect records a click.

Uses `redirect_client` (not `client`) wherever click-recording matters —
see conftest.py for why the background task's own DB session needs a
separate patch.
"""


async def test_redirect_unknown_code_returns_404(client):
    response = await client.get("/does-not-exist", follow_redirects=False)
    assert response.status_code == 404


async def test_redirect_success(redirect_client, auth_headers):
    created = await redirect_client.post(
        "/api/v1/urls",
        json={"original_url": "https://example.com/target", "custom_alias": "redirtest"},
        headers=auth_headers,
    )
    assert created.status_code == 201

    response = await redirect_client.get("/redirtest", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"] == "https://example.com/target"


async def test_redirect_success_anonymous_url(redirect_client):
    """An anonymously-created URL (owner_id = NULL) redirects exactly like an owned one."""
    created = await redirect_client.post(
        "/api/v1/urls",
        json={"original_url": "https://example.com/anon-target", "custom_alias": "anonredirect"},
    )
    assert created.status_code == 201

    response = await redirect_client.get("/anonredirect", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"] == "https://example.com/anon-target"


async def test_redirect_inactive_url_returns_410(redirect_client, auth_headers):
    created = await redirect_client.post(
        "/api/v1/urls",
        json={"original_url": "https://example.com/inactive", "custom_alias": "inactivetest"},
        headers=auth_headers,
    )
    url_id = created.json()["id"]

    await redirect_client.patch(
        f"/api/v1/urls/{url_id}", json={"is_active": False}, headers=auth_headers
    )

    response = await redirect_client.get("/inactivetest", follow_redirects=False)
    assert response.status_code == 410


async def test_redirect_records_click(redirect_client, auth_headers):
    created = await redirect_client.post(
        "/api/v1/urls",
        json={"original_url": "https://example.com/tracked", "custom_alias": "clicktest"},
        headers=auth_headers,
    )
    url_id = created.json()["id"]

    await redirect_client.get("/clicktest", follow_redirects=False)

    # No sleep/poll needed: Starlette runs BackgroundTasks as part of the
    # same response cycle, before the client's await returns.
    stats = await redirect_client.get(f"/api/v1/urls/{url_id}", headers=auth_headers)
    assert stats.json()["click_count"] == 1


async def test_redirect_cache_invalidated_on_update(redirect_client, auth_headers):
    """
    Regression test for the Phase 4 fix: updating a URL must invalidate its
    Redis cache entry, or a redirect right after would keep resolving to
    the OLD destination until the TTL naturally expired.
    """
    created = await redirect_client.post(
        "/api/v1/urls",
        json={"original_url": "https://example.com/old", "custom_alias": "cachetest"},
        headers=auth_headers,
    )
    url_id = created.json()["id"]

    first = await redirect_client.get("/cachetest", follow_redirects=False)
    assert first.headers["location"] == "https://example.com/old"

    await redirect_client.patch(
        f"/api/v1/urls/{url_id}",
        json={"original_url": "https://example.com/new"},
        headers=auth_headers,
    )

    second = await redirect_client.get("/cachetest", follow_redirects=False)
    assert second.headers["location"] == "https://example.com/new"
