import uuid

from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import Index


def create_index(
    *,
    tenant_id: str,
    created_by: str,
    name: str,
    slug: str,
) -> Index:
    db = SessionLocal()

    try:
        index = Index(
            tenant_id=uuid.UUID(tenant_id),
            name=name,
            slug=slug,
            description="Temporary automated test index.",
            status="draft",
            created_by=uuid.UUID(created_by),
        )

        db.add(index)
        db.commit()
        db.refresh(index)

        # Detach the object so it remains readable after closing the session.
        db.expunge(index)

        return index
    finally:
        db.close()


def test_indexes_require_authentication(client: TestClient):
    response = client.get("/indexes")

    assert response.status_code == 403


def test_missing_index_requires_authentication(client: TestClient):
    response = client.get("/indexes/not-a-real-index")

    assert response.status_code == 403


def test_list_indexes_returns_current_tenant_indexes(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"tenant-index-{uuid.uuid4()}"

    created_index = create_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        name="Tenant Test Index",
        slug=slug,
    )

    response = client.get(
        "/indexes",
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()
    returned_ids = [item["id"] for item in body]

    assert str(created_index.id) in returned_ids


def test_get_index_by_slug(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"slug-test-{uuid.uuid4()}"

    created_index = create_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        name="Slug Test Index",
        slug=slug,
    )

    response = client.get(
        f"/indexes/{slug}",
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert body["id"] == str(created_index.id)
    assert body["slug"] == slug
    assert body["name"] == "Slug Test Index"


def test_missing_slug_returns_404(
    client: TestClient,
    auth_headers: dict[str, str],
):
    missing_slug = f"missing-{uuid.uuid4()}"

    response = client.get(
        f"/indexes/{missing_slug}",
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == (
        f"Index '{missing_slug}' not found"
    )


def test_user_cannot_see_another_tenants_index(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    other_tenant_id = uuid.uuid4()
    hidden_slug = f"hidden-index-{uuid.uuid4()}"

    db = SessionLocal()

    try:
        hidden_index = Index(
            tenant_id=other_tenant_id,
            name="Another Tenant Index",
            slug=hidden_slug,
            description="This index must not be visible.",
            status="draft",
            created_by=None,
        )

        db.add(hidden_index)
        db.commit()

        list_response = client.get(
            "/indexes",
            headers=auth_headers,
        )

        assert list_response.status_code == 200
        assert hidden_slug not in [
            item["slug"] for item in list_response.json()
        ]

        detail_response = client.get(
            f"/indexes/{hidden_slug}",
            headers=auth_headers,
        )

        # Returning 404 prevents leaking that another tenant's record exists.
        assert detail_response.status_code == 404

    finally:
        db.query(Index).filter(Index.tenant_id == other_tenant_id).delete(
            synchronize_session=False
        )
        db.commit()
        db.close()