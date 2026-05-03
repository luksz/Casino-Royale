import pytest


@pytest.mark.asyncio
async def test_create_player(client):
    resp = await client.post("/api/v1/players", json={"display_name": "James"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["display_name"] == "James"
    assert data["balance"] == 10000
    assert "id" in data


@pytest.mark.asyncio
async def test_duplicate_player_returns_409(client):
    await client.post("/api/v1/players", json={"display_name": "Bond"})
    resp = await client.post("/api/v1/players", json={"display_name": "Bond"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_player(client):
    create_resp = await client.post("/api/v1/players", json={"display_name": "Vesper"})
    pid = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/players/{pid}")
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Vesper"


@pytest.mark.asyncio
async def test_get_player_not_found(client):
    resp = await client.get("/api/v1/players/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_players(client):
    await client.post("/api/v1/players", json={"display_name": "M"})
    await client.post("/api/v1/players", json={"display_name": "Q"})
    resp = await client.get("/api/v1/players")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


@pytest.mark.asyncio
async def test_get_balance(client):
    create_resp = await client.post("/api/v1/players", json={"display_name": "Moneypenny"})
    pid = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/players/{pid}/balance")
    assert resp.status_code == 200
    assert resp.json()["balance"] == 10000


@pytest.mark.asyncio
async def test_validation_error_empty_name(client):
    resp = await client.post("/api/v1/players", json={"display_name": "   "})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
