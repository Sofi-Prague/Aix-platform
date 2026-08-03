from fastapi.testclient import TestClient


def test_application_health(client: TestClient):
    response = client.get("/health")

    assert response.status_code == 200

    body = response.json()

    assert body["status"] == "ok"
    assert "app" in body
    assert "env" in body


def test_identity_ping_is_public(client: TestClient):
    response = client.get("/identity/ping")

    assert response.status_code == 200
    assert response.json() == {
        "module": "identity",
        "status": "ok",
    }


def test_index_registry_ping_is_public(client: TestClient):
    response = client.get("/indexes/ping")

    assert response.status_code == 200
    assert response.json() == {
        "module": "index_registry",
        "status": "ok",
    }