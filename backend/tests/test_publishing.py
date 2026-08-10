import uuid

from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import Dimension, Index, Indicator


def create_test_index(
    *,
    tenant_id: str,
    created_by: str,
    slug: str,
    description: str | None = "Test index description.",
) -> Index:
    db = SessionLocal()

    try:
        index = Index(
            tenant_id=uuid.UUID(tenant_id),
            created_by=uuid.UUID(created_by),
            name="Publishing Test Index",
            slug=slug,
            description=description,
            status="draft",
        )

        db.add(index)
        db.commit()
        db.refresh(index)
        db.expunge(index)

        return index
    finally:
        db.close()


def create_test_dimension(
    *,
    index_id: str,
    name: str = "Test Dimension",
) -> Dimension:
    db = SessionLocal()

    try:
        dimension = Dimension(
            index_id=uuid.UUID(index_id),
            name=name,
            description="Test dimension.",
            order_position=0,
        )

        db.add(dimension)
        db.commit()
        db.refresh(dimension)
        db.expunge(dimension)

        return dimension
    finally:
        db.close()


def create_ready_indicator(
    *,
    dimension_id: str,
) -> Indicator:
    db = SessionLocal()

    try:
        indicator = Indicator(
            dimension_id=uuid.UUID(dimension_id),
            name="GDP Growth",
            description="Annual real GDP growth.",
            unit="%",
            directionality="higher_is_better",
            status="ready",
            order_position=0,
        )

        db.add(indicator)
        db.commit()
        db.refresh(indicator)
        db.expunge(indicator)

        return indicator
    finally:
        db.close()


def test_publish_ping_is_public(
    client: TestClient,
):
    response = client.get("/publish/ping")

    assert response.status_code == 200
    assert response.json() == {
        "module": "publishing",
        "status": "ok",
    }


def test_publish_validation_requires_authentication(
    client: TestClient,
):
    response = client.get(
        "/publish/indexes/not-real/validate"
    )

    assert response.status_code == 403


def test_incomplete_index_cannot_publish(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"publish-incomplete-{uuid.uuid4()}"

    create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
        description=None,
    )

    validate_response = client.get(
        f"/publish/indexes/{slug}/validate",
        headers=auth_headers,
    )

    assert validate_response.status_code == 200

    body = validate_response.json()

    assert body["can_publish"] is False

    publish_response = client.post(
        f"/publish/indexes/{slug}",
        headers=auth_headers,
    )

    assert publish_response.status_code == 422


def test_complete_index_can_publish(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"publish-complete-{uuid.uuid4()}"

    index = create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    dimension = create_test_dimension(
        index_id=str(index.id),
    )

    create_ready_indicator(
        dimension_id=str(dimension.id),
    )

    validate_response = client.get(
        f"/publish/indexes/{slug}/validate",
        headers=auth_headers,
    )

    assert validate_response.status_code == 200

    body = validate_response.json()

    assert body["can_publish"] is True
    assert all(
        item["passed"]
        for item in body["checklist"]
    )

    publish_response = client.post(
        f"/publish/indexes/{slug}",
        headers=auth_headers,
    )

    assert publish_response.status_code == 200

    publish_body = publish_response.json()

    assert publish_body["status"] == "published"

    db = SessionLocal()

    try:
        saved = (
            db.query(Index)
            .filter(Index.id == index.id)
            .first()
        )

        assert saved is not None
        assert saved.status == "published"
    finally:
        db.close()


def test_published_index_cannot_be_published_again(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"publish-twice-{uuid.uuid4()}"

    index = create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    dimension = create_test_dimension(
        index_id=str(index.id),
    )

    create_ready_indicator(
        dimension_id=str(dimension.id),
    )

    first_response = client.post(
        f"/publish/indexes/{slug}",
        headers=auth_headers,
    )

    assert first_response.status_code == 200

    second_response = client.post(
        f"/publish/indexes/{slug}",
        headers=auth_headers,
    )

    assert second_response.status_code == 409


def test_other_tenant_cannot_validate_index(
    client: TestClient,
    auth_headers: dict[str, str],
):
    hidden_slug = f"hidden-publish-{uuid.uuid4()}"

    db = SessionLocal()

    try:
        hidden_index = Index(
            tenant_id=uuid.uuid4(),
            created_by=None,
            name="Hidden Index",
            slug=hidden_slug,
            description="Hidden",
            status="draft",
        )

        db.add(hidden_index)
        db.commit()
        db.refresh(hidden_index)

        response = client.get(
            f"/publish/indexes/{hidden_slug}/validate",
            headers=auth_headers,
        )

        assert response.status_code == 404

    finally:
        db.query(Index).filter(
            Index.id == hidden_index.id
        ).delete(synchronize_session=False)

        db.commit()
        db.close()

def test_public_endpoint_returns_published_index(
    client: TestClient,
    temporary_user: dict,
):
    slug = f"public-index-{uuid.uuid4()}"

    index = create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    dimension = create_test_dimension(
        index_id=str(index.id),
    )

    create_ready_indicator(
        dimension_id=str(dimension.id),
    )

    db = SessionLocal()

    try:
        saved_index = (
            db.query(Index)
            .filter(Index.id == index.id)
            .first()
        )

        assert saved_index is not None

        saved_index.status = "published"

        db.commit()
    finally:
        db.close()

    # Deliberately no Authorization header.
    response = client.get(
        f"/publish/indexes/{slug}/public"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["name"] == "Publishing Test Index"
    assert body["slug"] == slug
    assert body["status"] == "published"

    assert len(body["dimensions"]) == 1

    returned_dimension = body["dimensions"][0]

    assert returned_dimension["name"] == "Test Dimension"
    assert len(returned_dimension["indicators"]) == 1

    returned_indicator = (
        returned_dimension["indicators"][0]
    )

    assert returned_indicator["name"] == "GDP Growth"
    assert returned_indicator["unit"] == "%"
    assert (
        returned_indicator["directionality"]
        == "higher_is_better"
    )


def test_public_endpoint_hides_draft_index(
    client: TestClient,
    temporary_user: dict,
):
    slug = f"private-draft-{uuid.uuid4()}"

    create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    response = client.get(
        f"/publish/indexes/{slug}/public"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Published index not found"
    }


def test_public_endpoint_returns_404_for_unknown_index(
    client: TestClient,
):
    slug = f"missing-{uuid.uuid4()}"

    response = client.get(
        f"/publish/indexes/{slug}/public"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Published index not found"
    }