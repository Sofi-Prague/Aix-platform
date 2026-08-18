import uuid

from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import (
    Dimension,
    Index,
    Indicator,
)


def create_weighting_methodology(
    temporary_user: dict,
) -> tuple[Index, list[Dimension], list[Indicator]]:
    db = SessionLocal()

    try:
        index = Index(
            tenant_id=uuid.UUID(
                temporary_user["tenant_id"]
            ),
            name="Weighting Test Index",
            slug=f"weighting-{uuid.uuid4()}",
            description="Weighting test",
            created_by=uuid.UUID(
                temporary_user["id"]
            ),
        )

        db.add(index)
        db.flush()

        first_dimension = Dimension(
            index_id=index.id,
            name="Education",
            order_position=0,
        )

        second_dimension = Dimension(
            index_id=index.id,
            name="Safety",
            order_position=1,
        )

        db.add_all([
            first_dimension,
            second_dimension,
        ])
        db.flush()

        indicators = [
            Indicator(
                dimension_id=first_dimension.id,
                name="University Quality",
                unit="points",
                directionality="higher_is_better",
                status="ready",
                order_position=0,
            ),
            Indicator(
                dimension_id=first_dimension.id,
                name="Graduation Rate",
                unit="percent",
                directionality="higher_is_better",
                status="ready",
                order_position=1,
            ),
            Indicator(
                dimension_id=second_dimension.id,
                name="Crime Rate",
                unit="rate",
                directionality="lower_is_better",
                status="ready",
                order_position=0,
            ),
            Indicator(
                dimension_id=second_dimension.id,
                name="Political Stability",
                unit="points",
                directionality="higher_is_better",
                status="ready",
                order_position=1,
            ),
        ]

        db.add_all(indicators)
        db.commit()

        db.refresh(index)
        db.refresh(first_dimension)
        db.refresh(second_dimension)

        for indicator in indicators:
            db.refresh(indicator)

        db.expunge(index)
        db.expunge(first_dimension)
        db.expunge(second_dimension)

        for indicator in indicators:
            db.expunge(indicator)

        return (
            index,
            [
                first_dimension,
                second_dimension,
            ],
            indicators,
        )

    finally:
        db.close()


def test_equal_weighting_can_be_saved(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, _, _ = create_weighting_methodology(
        temporary_user
    )

    response = client.put(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=auth_headers,
        json={
            "method": "equal",
            "dimension_weights": [],
            "indicator_weights": [],
        },
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["method"] == "equal"
    assert body["config"] == {}


def test_custom_weighting_can_be_saved(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimensions, indicators = (
        create_weighting_methodology(
            temporary_user
        )
    )

    response = client.put(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=auth_headers,
        json={
            "method": "custom",
            "dimension_weights": [
                {
                    "id": str(dimensions[0].id),
                    "weight": 0.6,
                },
                {
                    "id": str(dimensions[1].id),
                    "weight": 0.4,
                },
            ],
            "indicator_weights": [
                {
                    "id": str(indicators[0].id),
                    "weight": 0.7,
                },
                {
                    "id": str(indicators[1].id),
                    "weight": 0.3,
                },
                {
                    "id": str(indicators[2].id),
                    "weight": 0.5,
                },
                {
                    "id": str(indicators[3].id),
                    "weight": 0.5,
                },
            ],
        },
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["method"] == "custom"

    assert (
        body["config"]["dimension_weights"][
            str(dimensions[0].id)
        ]
        == 0.6
    )


def test_dimension_weights_must_total_one(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimensions, indicators = (
        create_weighting_methodology(
            temporary_user
        )
    )

    response = client.put(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=auth_headers,
        json={
            "method": "custom",
            "dimension_weights": [
                {
                    "id": str(dimensions[0].id),
                    "weight": 0.7,
                },
                {
                    "id": str(dimensions[1].id),
                    "weight": 0.4,
                },
            ],
            "indicator_weights": [
                {
                    "id": str(indicators[0].id),
                    "weight": 0.5,
                },
                {
                    "id": str(indicators[1].id),
                    "weight": 0.5,
                },
                {
                    "id": str(indicators[2].id),
                    "weight": 0.5,
                },
                {
                    "id": str(indicators[3].id),
                    "weight": 0.5,
                },
            ],
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Dimension weights must total 1.0."
    )


def test_indicator_weights_must_total_one_per_dimension(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimensions, indicators = (
        create_weighting_methodology(
            temporary_user
        )
    )

    response = client.put(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=auth_headers,
        json={
            "method": "custom",
            "dimension_weights": [
                {
                    "id": str(dimensions[0].id),
                    "weight": 0.5,
                },
                {
                    "id": str(dimensions[1].id),
                    "weight": 0.5,
                },
            ],
            "indicator_weights": [
                {
                    "id": str(indicators[0].id),
                    "weight": 0.8,
                },
                {
                    "id": str(indicators[1].id),
                    "weight": 0.5,
                },
                {
                    "id": str(indicators[2].id),
                    "weight": 0.5,
                },
                {
                    "id": str(indicators[3].id),
                    "weight": 0.5,
                },
            ],
        },
    )

    assert response.status_code == 400

    assert (
        "must total 1.0"
        in response.json()["detail"]
    )


def test_custom_weighting_requires_all_dimensions(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimensions, indicators = (
        create_weighting_methodology(
            temporary_user
        )
    )

    response = client.put(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=auth_headers,
        json={
            "method": "custom",
            "dimension_weights": [
                {
                    "id": str(dimensions[0].id),
                    "weight": 1.0,
                },
            ],
            "indicator_weights": [
                {
                    "id": str(indicators[0].id),
                    "weight": 0.5,
                },
                {
                    "id": str(indicators[1].id),
                    "weight": 0.5,
                },
                {
                    "id": str(indicators[2].id),
                    "weight": 0.5,
                },
                {
                    "id": str(indicators[3].id),
                    "weight": 0.5,
                },
            ],
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Custom weighting must include "
        "every dimension exactly once."
    )


def test_get_weighting_returns_saved_configuration(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, _, _ = create_weighting_methodology(
        temporary_user
    )

    save_response = client.put(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=auth_headers,
        json={
            "method": "equal",
            "dimension_weights": [],
            "indicator_weights": [],
        },
    )

    assert save_response.status_code == 200

    response = client.get(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert body["method"] == "equal"
    assert body["index_id"] == str(index.id)


def test_other_tenant_cannot_access_weighting(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
):
    index, _, _ = create_weighting_methodology(
        temporary_user
    )

    owner_response = client.put(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=auth_headers,
        json={
            "method": "equal",
            "dimension_weights": [],
            "indicator_weights": [],
        },
    )

    assert owner_response.status_code == 200

    get_response = client.get(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=second_auth_headers,
    )

    assert get_response.status_code == 404

    update_response = client.put(
        f"/methodology/indexes/{index.slug}/weighting",
        headers=second_auth_headers,
        json={
            "method": "equal",
            "dimension_weights": [],
            "indicator_weights": [],
        },
    )

    assert update_response.status_code == 404