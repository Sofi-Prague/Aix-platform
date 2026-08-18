import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import Index, User
from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """
    Create a FastAPI test client.
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def tenant_id() -> uuid.UUID:
    """
    Generate a unique tenant ID for tests that need
    an unrelated tenant.
    """
    return uuid.uuid4()


@pytest.fixture
def temporary_user(client: TestClient):
    """
    Register a temporary user and remove all test records afterward.

    Registration creates the user's tenant automatically, so the
    returned tenant_id must come from the registration response.
    """
    email = f"test-{uuid.uuid4()}@example.com"
    password = "SecureTestPassword123!"

    response = client.post(
        "/identity/register",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 201, response.text

    user_data = response.json()

    actual_tenant_id = uuid.UUID(user_data["tenant_id"])

    yield {
        "id": user_data["id"],
        "tenant_id": user_data["tenant_id"],
        "email": email,
        "password": password,
        "role": user_data["role"],
    }

    # Cleanup must happen in this order because indexes reference users.
    db = SessionLocal()

    try:
        db.query(Index).filter(
            Index.tenant_id == actual_tenant_id
        ).delete(
            synchronize_session=False
        )

        db.query(User).filter(
            User.tenant_id == actual_tenant_id
        ).delete(
            synchronize_session=False
        )

        db.commit()
    finally:
        db.close()


@pytest.fixture
def auth_headers(
    client: TestClient,
    temporary_user: dict,
) -> dict[str, str]:
    """
    Log in the temporary user and return an Authorization header.
    """
    response = client.post(
        "/identity/login",
        json={
            "email": temporary_user["email"],
            "password": temporary_user["password"],
        },
    )

    assert response.status_code == 200, response.text

    token = response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}",
    }

@pytest.fixture
def second_user(client: TestClient):
    """
    Register a second user in a separate tenant.

    Used for tenant-isolation/security tests.
    """
    email = f"second-{uuid.uuid4()}@example.com"
    password = "SecureTestPassword123!"

    response = client.post(
        "/identity/register",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 201, response.text

    user_data = response.json()

    actual_tenant_id = uuid.UUID(
        user_data["tenant_id"]
    )

    yield {
        "id": user_data["id"],
        "tenant_id": user_data["tenant_id"],
        "email": email,
        "password": password,
        "role": user_data["role"],
    }

    db = SessionLocal()

    try:
        db.query(Index).filter(
            Index.tenant_id == actual_tenant_id
        ).delete(
            synchronize_session=False
        )

        db.query(User).filter(
            User.tenant_id == actual_tenant_id
        ).delete(
            synchronize_session=False
        )

        db.commit()

    finally:
        db.close()

@pytest.fixture
def second_auth_headers(
    client: TestClient,
    second_user: dict,
) -> dict[str, str]:
    response = client.post(
        "/identity/login",
        json={
            "email": second_user["email"],
            "password": second_user["password"],
        },
    )

    assert response.status_code == 200, response.text

    token = response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}",
    }