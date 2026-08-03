import uuid

from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import User


def test_register_user(client: TestClient):
    tenant_id = uuid.uuid4()
    email = f"register-{uuid.uuid4()}@example.com"

    response = client.post(
        "/identity/register",
        json={
            "tenant_id": str(tenant_id),
            "email": email,
            "password": "SecureTestPassword123!",
            "role": "author",
        },
    )

    try:
        assert response.status_code == 201, response.text

        body = response.json()

        assert body["email"] == email
        assert body["tenant_id"] == str(tenant_id)
        assert body["role"] == "author"

        # The API must never expose the password hash.
        assert "password" not in body
        assert "hashed_password" not in body

    finally:
        db = SessionLocal()

        try:
            db.query(User).filter(User.email == email).delete(
                synchronize_session=False
            )
            db.commit()
        finally:
            db.close()


def test_duplicate_email_is_rejected(
    client: TestClient,
    temporary_user: dict,
):
    response = client.post(
        "/identity/register",
        json={
            "tenant_id": temporary_user["tenant_id"],
            "email": temporary_user["email"],
            "password": "AnotherPassword123!",
            "role": "author",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "A user with that email already exists"
    )


def test_login_returns_access_token(
    client: TestClient,
    temporary_user: dict,
):
    response = client.post(
        "/identity/login",
        json={
            "email": temporary_user["email"],
            "password": temporary_user["password"],
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["access_token"]
    assert body.get("token_type", "bearer").lower() == "bearer"


def test_login_rejects_wrong_password(
    client: TestClient,
    temporary_user: dict,
):
    response = client.post(
        "/identity/login",
        json={
            "email": temporary_user["email"],
            "password": "DefinitelyWrongPassword!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_me_requires_authentication(client: TestClient):
    response = client.get("/identity/me")

    # HTTPBearer returns 403 when the Authorization header is missing.
    assert response.status_code == 403


def test_me_returns_authenticated_user(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    response = client.get(
        "/identity/me",
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert body["id"] == temporary_user["id"]
    assert body["email"] == temporary_user["email"]
    assert body["tenant_id"] == temporary_user["tenant_id"]
    assert body["role"] == temporary_user["role"]