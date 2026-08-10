import uuid

from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import Dimension, Index

from unittest.mock import patch


def create_test_index(
    *,
    tenant_id: str,
    created_by: str,
    slug: str,
    name: str = "AI Test Index",
) -> Index:
    db = SessionLocal()

    try:
        index = Index(
            tenant_id=uuid.UUID(tenant_id),
            created_by=uuid.UUID(created_by),
            name=name,
            slug=slug,
            description="Temporary index for AI orchestration tests.",
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
    name: str = "AI Test Dimension",
) -> Dimension:
    db = SessionLocal()

    try:
        dimension = Dimension(
            index_id=uuid.UUID(index_id),
            name=name,
            description="Temporary dimension for AI orchestration tests.",
            order_position=0,
        )

        db.add(dimension)
        db.commit()
        db.refresh(dimension)
        db.expunge(dimension)

        return dimension
    finally:
        db.close()


def test_copilot_ping_is_public(
    client: TestClient,
):
    response = client.get("/copilot/ping")

    assert response.status_code == 200
    assert response.json() == {
        "module": "ai_orchestration",
        "status": "ok",
    }


def test_dimension_suggestions_require_authentication(
    client: TestClient,
):
    response = client.post(
        "/copilot/indexes/not-real/suggest-dimensions"
    )

    assert response.status_code == 403


@patch(
    "app.modules.ai_orchestration.service._run_cloudflare_model"
)
def test_generate_dimension_suggestions(
    mock_run_cloudflare_model,
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    mock_run_cloudflare_model.return_value = {
        "suggestions": [
            {
                "name": "Technological Capacity",
                "description": "Measures technological capability.",
                "reasoning": "Technology influences index outcomes.",
            }
        ]
    }

    slug = f"ai-dimensions-{uuid.uuid4()}"

    create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    response = client.post(
        f"/copilot/indexes/{slug}/suggest-dimensions",
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert body["suggestions"][0]["name"] == (
        "Technological Capacity"
    )

def test_dimension_suggestions_do_not_create_dimensions(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"ai-no-create-{uuid.uuid4()}"

    index = create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    db = SessionLocal()

    try:
        before_count = (
            db.query(Dimension)
            .filter(Dimension.index_id == index.id)
            .count()
        )
    finally:
        db.close()

    response = client.post(
        f"/copilot/indexes/{slug}/suggest-dimensions",
        headers=auth_headers,
    )

    assert response.status_code == 200

    db = SessionLocal()

    try:
        after_count = (
            db.query(Dimension)
            .filter(Dimension.index_id == index.id)
            .count()
        )
    finally:
        db.close()

    assert before_count == after_count


@patch(
    "app.modules.ai_orchestration.service._run_cloudflare_model"
)
def test_generate_indicator_suggestions(
    mock_run_cloudflare_model,
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    mock_run_cloudflare_model.return_value = {
        "suggestions": [
            {
                "name": "AI Investment",
                "description": "Measures investment in AI capability.",
                "unit": "USD",
                "directionality": "higher_is_better",
                "reasoning": "Investment may support AI capacity.",
            }
        ]
    }

    slug = f"ai-indicators-{uuid.uuid4()}"

    index = create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    dimension = create_test_dimension(
        index_id=str(index.id),
    )

    response = client.post(
        (
            f"/copilot/indexes/{slug}/dimensions/"
            f"{dimension.id}/suggest-indicators"
        ),
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert body["suggestions"][0]["name"] == "AI Investment"

def test_other_tenant_cannot_request_dimension_suggestions(
    client: TestClient,
    auth_headers: dict[str, str],
):
    other_tenant_id = uuid.uuid4()
    hidden_slug = f"hidden-ai-index-{uuid.uuid4()}"

    db = SessionLocal()

    try:
        hidden_index = Index(
            tenant_id=other_tenant_id,
            created_by=None,
            name="Hidden AI Index",
            slug=hidden_slug,
            description=None,
            status="draft",
        )

        db.add(hidden_index)
        db.commit()
        db.refresh(hidden_index)

        response = client.post(
            f"/copilot/indexes/{hidden_slug}/suggest-dimensions",
            headers=auth_headers,
        )

        assert response.status_code == 404

    finally:
        db.query(Index).filter(
            Index.id == hidden_index.id
        ).delete(synchronize_session=False)

        db.commit()
        db.close()


def test_other_tenant_cannot_request_indicator_suggestions(
    client: TestClient,
    auth_headers: dict[str, str],
):
    other_tenant_id = uuid.uuid4()
    hidden_slug = f"hidden-ai-dimension-{uuid.uuid4()}"

    db = SessionLocal()

    try:
        hidden_index = Index(
            tenant_id=other_tenant_id,
            created_by=None,
            name="Hidden AI Index",
            slug=hidden_slug,
            description=None,
            status="draft",
        )

        db.add(hidden_index)
        db.commit()
        db.refresh(hidden_index)

        hidden_dimension = Dimension(
            index_id=hidden_index.id,
            name="Hidden AI Dimension",
            description=None,
            order_position=0,
        )

        db.add(hidden_dimension)
        db.commit()
        db.refresh(hidden_dimension)

        response = client.post(
            (
                f"/copilot/indexes/{hidden_slug}/dimensions/"
                f"{hidden_dimension.id}/suggest-indicators"
            ),
            headers=auth_headers,
        )

        assert response.status_code == 404

    finally:
        db.query(Dimension).filter(
            Dimension.id == hidden_dimension.id
        ).delete(synchronize_session=False)

        db.query(Index).filter(
            Index.id == hidden_index.id
        ).delete(synchronize_session=False)

        db.commit()
        db.close()