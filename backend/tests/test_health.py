"""
Health check — the simplest possible smoke test that the app boots and can
actually talk to both PostgreSQL and Redis (not just that the process starts).
"""


async def test_health_check(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["database"]["status"] == "ok"
    assert data["cache"]["status"] == "ok"
