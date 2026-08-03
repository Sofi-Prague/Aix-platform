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

def test_create_index(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"created-index-{uuid.uuid4()}"

    response = client.post(
        "/indexes",
        headers=auth_headers,
        json={
            "name": "Created Test Index",
            "slug": slug,
            "description": "Created by an automated test.",
        },
    )

    assert response.status_code == 201, response.text

    body = response.json()

    assert body["name"] == "Created Test Index"
    assert body["slug"] == slug
    assert body["status"] == "draft"
    assert body["tenant_id"] == temporary_user["tenant_id"]
    assert body["created_by"] == temporary_user["id"]


def test_duplicate_slug_is_rejected(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"duplicate-index-{uuid.uuid4()}"

    first_response = client.post(
        "/indexes",
        headers=auth_headers,
        json={
            "name": "First Index",
            "slug": slug,
            "description": None,
        },
    )

    assert first_response.status_code == 201

    second_response = client.post(
        "/indexes",
        headers=auth_headers,
        json={
            "name": "Second Index",
            "slug": slug,
            "description": None,
        },
    )

    assert second_response.status_code == 409


def test_update_index(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"update-index-{uuid.uuid4()}"

    create_response = client.post(
        "/indexes",
        headers=auth_headers,
        json={
            "name": "Original Name",
            "slug": slug,
            "description": "Original description.",
        },
    )

    assert create_response.status_code == 201

    update_response = client.patch(
        f"/indexes/{slug}",
        headers=auth_headers,
        json={
            "name": "Updated Name",
            "description": "Updated description.",
            "status": "published",
        },
    )

    assert update_response.status_code == 200, update_response.text

    body = update_response.json()

    assert body["name"] == "Updated Name"
    assert body["description"] == "Updated description."
    assert body["status"] == "published"


def test_update_missing_index_returns_404(
    client: TestClient,
    auth_headers: dict[str, str],
):
    missing_slug = f"missing-update-{uuid.uuid4()}"

    response = client.patch(
        f"/indexes/{missing_slug}",
        headers=auth_headers,
        json={
            "name": "Does Not Exist",
        },
    )

    assert response.status_code == 404


def test_delete_index(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"delete-index-{uuid.uuid4()}"

    create_response = client.post(
        "/indexes",
        headers=auth_headers,
        json={
            "name": "Delete Test Index",
            "slug": slug,
            "description": "This index will be deleted.",
        },
    )

    assert create_response.status_code == 201

    delete_response = client.delete(
        f"/indexes/{slug}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 204

    get_response = client.get(
        f"/indexes/{slug}",
        headers=auth_headers,
    )

    assert get_response.status_code == 404


def test_delete_missing_index_returns_404(
    client: TestClient,
    auth_headers: dict[str, str],
):
    missing_slug = f"missing-delete-{uuid.uuid4()}"

    response = client.delete(
        f"/indexes/{missing_slug}",
        headers=auth_headers,
    )

    assert response.status_code == 404