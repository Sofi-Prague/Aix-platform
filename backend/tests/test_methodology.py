import uuid

from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import Dimension, Index, Indicator

def create_test_index(
    *,
    tenant_id: str,
    created_by: str,
    slug: str,
    name: str = "Methodology Test Index",
) -> Index:
    db = SessionLocal()

    try:
        index = Index(
            tenant_id=uuid.UUID(tenant_id),
            created_by=uuid.UUID(created_by),
            name=name,
            slug=slug,
            description="Temporary index for methodology tests.",
            status="draft",
        )

        db.add(index)
        db.commit()
        db.refresh(index)
        db.expunge(index)

        return index
    finally:
        db.close()

def test_methodology_ping_is_public(client: TestClient):
    response = client.get("/methodology/ping")

    assert response.status_code == 200
    assert response.json() == {
        "module": "methodology_engine",
        "status": "ok",
    }

def test_dimensions_require_authentication(client: TestClient):
    response = client.get(
        "/methodology/indexes/not-real/dimensions"
    )

    assert response.status_code == 403

def test_create_dimension(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"dimension-create-{uuid.uuid4()}"

    create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    response = client.post(
        f"/methodology/indexes/{slug}/dimensions",
        headers=auth_headers,
        json={
            "name": "Economic Capacity",
            "description": "Measures economic resilience.",
            "order_position": 0,
        },
    )

    assert response.status_code == 201, response.text

    body = response.json()

    assert body["name"] == "Economic Capacity"
    assert body["description"] == "Measures economic resilience."
    assert body["order_position"] == 0

def test_list_dimensions_in_order(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"dimension-list-{uuid.uuid4()}"

    create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    client.post(
        f"/methodology/indexes/{slug}/dimensions",
        headers=auth_headers,
        json={
            "name": "Second",
            "description": None,
            "order_position": 2,
        },
    )

    client.post(
        f"/methodology/indexes/{slug}/dimensions",
        headers=auth_headers,
        json={
            "name": "First",
            "description": None,
            "order_position": 1,
        },
    )

    response = client.get(
        f"/methodology/indexes/{slug}/dimensions",
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert [item["name"] for item in body] == [
        "First",
        "Second",
    ]

def test_update_dimension(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"dimension-update-{uuid.uuid4()}"

    create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    create_response = client.post(
        f"/methodology/indexes/{slug}/dimensions",
        headers=auth_headers,
        json={
            "name": "Original",
            "description": "Original description.",
            "order_position": 0,
        },
    )

    dimension_id = create_response.json()["id"]

    update_response = client.patch(
        f"/methodology/indexes/{slug}/dimensions/{dimension_id}",
        headers=auth_headers,
        json={
            "name": "Updated",
            "description": "Updated description.",
            "order_position": 3,
        },
    )

    assert update_response.status_code == 200

    body = update_response.json()

    assert body["name"] == "Updated"
    assert body["description"] == "Updated description."
    assert body["order_position"] == 3

def test_delete_dimension(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"dimension-delete-{uuid.uuid4()}"

    create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    create_response = client.post(
        f"/methodology/indexes/{slug}/dimensions",
        headers=auth_headers,
        json={
            "name": "Delete Me",
            "description": None,
            "order_position": 0,
        },
    )

    dimension_id = create_response.json()["id"]

    delete_response = client.delete(
        f"/methodology/indexes/{slug}/dimensions/{dimension_id}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 204

    get_response = client.get(
        f"/methodology/indexes/{slug}/dimensions/{dimension_id}",
        headers=auth_headers,
    )

    assert get_response.status_code == 404

def test_user_cannot_access_another_tenants_dimensions(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    other_tenant_id = uuid.uuid4()
    hidden_slug = f"hidden-dimensions-{uuid.uuid4()}"

    db = SessionLocal()

    try:
        hidden_index = Index(
            tenant_id=other_tenant_id,
            created_by=None,
            name="Hidden Index",
            slug=hidden_slug,
            description=None,
            status="draft",
        )

        db.add(hidden_index)
        db.commit()
        db.refresh(hidden_index)

        hidden_dimension = Dimension(
            index_id=hidden_index.id,
            name="Hidden Dimension",
            description=None,
            order_position=0,
        )

        db.add(hidden_dimension)
        db.commit()

        response = client.get(
            f"/methodology/indexes/{hidden_slug}/dimensions",
            headers=auth_headers,
        )

        assert response.status_code == 404

    finally:
        db.query(Dimension).filter(
            Dimension.index_id == hidden_index.id
        ).delete(synchronize_session=False)

        db.query(Index).filter(
            Index.id == hidden_index.id
        ).delete(synchronize_session=False)

        db.commit()
        db.close()

def create_test_dimension(
    *,
    index_id: str,
    name: str = "Test Dimension",
    order_position: int = 0,
) -> Dimension:
    db = SessionLocal()

    try:
        dimension = Dimension(
            index_id=uuid.UUID(index_id),
            name=name,
            description="Temporary dimension for indicator tests.",
            order_position=order_position,
        )

        db.add(dimension)
        db.commit()
        db.refresh(dimension)
        db.expunge(dimension)

        return dimension
    finally:
        db.close()

def test_indicators_require_authentication(
    client: TestClient,
):
    response = client.get(
        "/methodology/indexes/not-real/"
        "dimensions/00000000-0000-0000-0000-000000000000/"
        "indicators"
    )

    assert response.status_code == 403

def test_create_indicator(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"indicator-create-{uuid.uuid4()}"

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
            f"/methodology/indexes/{slug}/dimensions/"
            f"{dimension.id}/indicators"
        ),
        headers=auth_headers,
        json={
            "name": "GDP Growth",
            "description": "Annual real GDP growth rate.",
            "unit": "percent",
            "directionality": "higher_is_better",
            "status": "draft",
            "order_position": 0,
        },
    )

    assert response.status_code == 201, response.text

    body = response.json()

    assert body["name"] == "GDP Growth"
    assert body["unit"] == "percent"
    assert body["directionality"] == "higher_is_better"
    assert body["status"] == "draft"
    assert body["order_position"] == 0
    assert body["dimension_id"] == str(dimension.id)

def test_list_indicators_in_order(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"indicator-list-{uuid.uuid4()}"

    index = create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    dimension = create_test_dimension(
        index_id=str(index.id),
    )

    base_url = (
        f"/methodology/indexes/{slug}/dimensions/"
        f"{dimension.id}/indicators"
    )

    second_response = client.post(
        base_url,
        headers=auth_headers,
        json={
            "name": "Second",
            "description": None,
            "unit": None,
            "directionality": None,
            "status": "draft",
            "order_position": 2,
        },
    )

    first_response = client.post(
        base_url,
        headers=auth_headers,
        json={
            "name": "First",
            "description": None,
            "unit": None,
            "directionality": None,
            "status": "draft",
            "order_position": 1,
        },
    )

    assert second_response.status_code == 201
    assert first_response.status_code == 201

    response = client.get(
        base_url,
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == [
        "First",
        "Second",
    ]

def test_update_indicator(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"indicator-update-{uuid.uuid4()}"

    index = create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    dimension = create_test_dimension(
        index_id=str(index.id),
    )

    base_url = (
        f"/methodology/indexes/{slug}/dimensions/"
        f"{dimension.id}/indicators"
    )

    create_response = client.post(
        base_url,
        headers=auth_headers,
        json={
            "name": "Original Indicator",
            "description": "Original description.",
            "unit": "points",
            "directionality": "lower_is_better",
            "status": "draft",
            "order_position": 0,
        },
    )

    assert create_response.status_code == 201

    indicator_id = create_response.json()["id"]

    update_response = client.patch(
        f"{base_url}/{indicator_id}",
        headers=auth_headers,
        json={
            "name": "Updated Indicator",
            "description": "Updated description.",
            "unit": "%",
            "directionality": "higher_is_better",
            "status": "ready",
            "order_position": 3,
        },
    )

    assert update_response.status_code == 200, update_response.text

    body = update_response.json()

    assert body["name"] == "Updated Indicator"
    assert body["description"] == "Updated description."
    assert body["unit"] == "%"
    assert body["directionality"] == "higher_is_better"
    assert body["status"] == "ready"
    assert body["order_position"] == 3

def test_delete_indicator(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"indicator-delete-{uuid.uuid4()}"

    index = create_test_index(
        tenant_id=temporary_user["tenant_id"],
        created_by=temporary_user["id"],
        slug=slug,
    )

    dimension = create_test_dimension(
        index_id=str(index.id),
    )

    base_url = (
        f"/methodology/indexes/{slug}/dimensions/"
        f"{dimension.id}/indicators"
    )

    create_response = client.post(
        base_url,
        headers=auth_headers,
        json={
            "name": "Delete Me",
            "description": None,
            "unit": None,
            "directionality": None,
            "status": "draft",
            "order_position": 0,
        },
    )

    assert create_response.status_code == 201

    indicator_id = create_response.json()["id"]

    delete_response = client.delete(
        f"{base_url}/{indicator_id}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 204

    get_response = client.get(
        f"{base_url}/{indicator_id}",
        headers=auth_headers,
    )

    assert get_response.status_code == 404

def test_invalid_indicator_directionality_is_rejected(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    slug = f"indicator-invalid-{uuid.uuid4()}"

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
            f"/methodology/indexes/{slug}/dimensions/"
            f"{dimension.id}/indicators"
        ),
        headers=auth_headers,
        json={
            "name": "Invalid Direction",
            "description": None,
            "unit": None,
            "directionality": "sideways_is_better",
            "status": "draft",
            "order_position": 0,
        },
    )

    assert response.status_code == 422

def test_user_cannot_access_another_tenants_indicators(
    client: TestClient,
    auth_headers: dict[str, str],
):
    other_tenant_id = uuid.uuid4()
    hidden_slug = f"hidden-indicators-{uuid.uuid4()}"

    db = SessionLocal()

    try:
        hidden_index = Index(
            tenant_id=other_tenant_id,
            created_by=None,
            name="Hidden Index",
            slug=hidden_slug,
            description=None,
            status="draft",
        )

        db.add(hidden_index)
        db.commit()
        db.refresh(hidden_index)

        hidden_dimension = Dimension(
            index_id=hidden_index.id,
            name="Hidden Dimension",
            description=None,
            order_position=0,
        )

        db.add(hidden_dimension)
        db.commit()
        db.refresh(hidden_dimension)

        hidden_indicator = Indicator(
            dimension_id=hidden_dimension.id,
            name="Hidden Indicator",
            description=None,
            unit=None,
            directionality=None,
            status="draft",
            order_position=0,
        )

        db.add(hidden_indicator)
        db.commit()

        response = client.get(
            (
                f"/methodology/indexes/{hidden_slug}/dimensions/"
                f"{hidden_dimension.id}/indicators"
            ),
            headers=auth_headers,
        )

        assert response.status_code == 404

    finally:
        db.query(Indicator).filter(
            Indicator.dimension_id == hidden_dimension.id
        ).delete(synchronize_session=False)

        db.query(Dimension).filter(
            Dimension.id == hidden_dimension.id
        ).delete(synchronize_session=False)

        db.query(Index).filter(
            Index.id == hidden_index.id
        ).delete(synchronize_session=False)

        db.commit()
        db.close()

    