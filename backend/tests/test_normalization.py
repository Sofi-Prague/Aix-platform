import uuid

from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import (
    DataPoint,
    DataSource,
    Dimension,
    Index,
    Indicator,
)


def create_normalization_indicator(
    temporary_user: dict,
    *,
    directionality: str | None = "higher_is_better",
) -> tuple[Index, Dimension, Indicator]:
    db = SessionLocal()

    try:
        index = Index(
            tenant_id=uuid.UUID(
                temporary_user["tenant_id"]
            ),
            name="Normalization Test Index",
            slug=f"normalization-{uuid.uuid4()}",
            description="Normalization tests",
            created_by=uuid.UUID(
                temporary_user["id"]
            ),
        )

        db.add(index)
        db.flush()

        dimension = Dimension(
            index_id=index.id,
            name="Economic Performance",
            description="Test dimension",
            order_position=0,
        )

        db.add(dimension)
        db.flush()

        indicator = Indicator(
            dimension_id=dimension.id,
            name="Test Indicator",
            description="Normalization test indicator",
            unit="score",
            directionality=directionality,
            status="ready",
            order_position=0,
        )

        db.add(indicator)
        db.commit()

        db.refresh(index)
        db.refresh(dimension)
        db.refresh(indicator)

        db.expunge(index)
        db.expunge(dimension)
        db.expunge(indicator)

        return (
            index,
            dimension,
            indicator,
        )

    finally:
        db.close()


def add_data(
    indicator: Indicator,
    rows: list[
        tuple[str, str, float]
    ],
) -> DataSource:
    db = SessionLocal()

    try:
        source = DataSource(
            indicator_id=indicator.id,
            name="Normalization Dataset",
            source_type="csv",
            original_filename="normalization.csv",
        )

        db.add(source)
        db.flush()

        points = [
            DataPoint(
                data_source_id=source.id,
                indicator_id=indicator.id,
                entity=entity,
                period=period,
                value=value,
            )
            for entity, period, value
            in rows
        ]

        db.add_all(points)
        db.commit()

        db.refresh(source)
        db.expunge(source)

        return source

    finally:
        db.close()


def normalization_url(
    index: Index,
    dimension: Dimension,
    indicator: Indicator,
) -> str:
    return (
        f"/data/indexes/{index.slug}"
        f"/dimensions/{dimension.id}"
        f"/indicators/{indicator.id}"
        "/normalize"
    )


def find_point(
    response_body: dict,
    entity: str,
    period: str,
) -> dict:
    return next(
        point
        for point
        in response_body["data_points"]
        if (
            point["entity"] == entity
            and point["period"] == period
        )
    )


def test_higher_is_better_normalization(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_normalization_indicator(
            temporary_user,
            directionality="higher_is_better",
        )
    )

    add_data(
        indicator,
        [
            ("Czechia", "2025", 35000),
            ("France", "2025", 42500),
            ("Germany", "2025", 50000),
        ],
    )

    response = client.get(
        normalization_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
    )

    assert response.status_code == 200, (
        response.text
    )

    body = response.json()

    assert (
        body["directionality"]
        == "higher_is_better"
    )

    assert len(body["periods"]) == 1

    assert body["periods"][0] == {
        "period": "2025",
        "minimum": 35000,
        "maximum": 50000,
    }

    assert (
        find_point(
            body,
            "Czechia",
            "2025",
        )["normalized_value"]
        == 0
    )

    assert (
        find_point(
            body,
            "France",
            "2025",
        )["normalized_value"]
        == 0.5
    )

    assert (
        find_point(
            body,
            "Germany",
            "2025",
        )["normalized_value"]
        == 1
    )


def test_lower_is_better_normalization(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_normalization_indicator(
            temporary_user,
            directionality="lower_is_better",
        )
    )

    add_data(
        indicator,
        [
            ("Czechia", "2025", 3),
            ("Germany", "2025", 6),
            ("France", "2025", 9),
        ],
    )

    response = client.get(
        normalization_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert (
        find_point(
            body,
            "Czechia",
            "2025",
        )["normalized_value"]
        == 1
    )

    assert (
        find_point(
            body,
            "Germany",
            "2025",
        )["normalized_value"]
        == 0.5
    )

    assert (
        find_point(
            body,
            "France",
            "2025",
        )["normalized_value"]
        == 0
    )


def test_normalization_is_separate_per_period(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_normalization_indicator(
            temporary_user,
            directionality="higher_is_better",
        )
    )

    add_data(
        indicator,
        [
            (
                "Czechia",
                "2024",
                30000,
            ),
            (
                "France",
                "2024",
                37500,
            ),
            (
                "Germany",
                "2024",
                45000,
            ),
            (
                "Czechia",
                "2025",
                35000,
            ),
            (
                "France",
                "2025",
                42500,
            ),
            (
                "Germany",
                "2025",
                50000,
            ),
        ],
    )

    response = client.get(
        normalization_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert body["periods"] == [
        {
            "period": "2024",
            "minimum": 30000,
            "maximum": 45000,
        },
        {
            "period": "2025",
            "minimum": 35000,
            "maximum": 50000,
        },
    ]

    assert (
        find_point(
            body,
            "Czechia",
            "2024",
        )["normalized_value"]
        == 0
    )

    assert (
        find_point(
            body,
            "France",
            "2024",
        )["normalized_value"]
        == 0.5
    )

    assert (
        find_point(
            body,
            "Germany",
            "2024",
        )["normalized_value"]
        == 1
    )

    assert (
        find_point(
            body,
            "Czechia",
            "2025",
        )["normalized_value"]
        == 0
    )

    assert (
        find_point(
            body,
            "France",
            "2025",
        )["normalized_value"]
        == 0.5
    )

    assert (
        find_point(
            body,
            "Germany",
            "2025",
        )["normalized_value"]
        == 1
    )


def test_equal_values_receive_full_score(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_normalization_indicator(
            temporary_user,
        )
    )

    add_data(
        indicator,
        [
            ("Czechia", "2025", 50),
            ("France", "2025", 50),
            ("Germany", "2025", 50),
        ],
    )

    response = client.get(
        normalization_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert body["periods"][0] == {
        "period": "2025",
        "minimum": 50,
        "maximum": 50,
    }

    assert all(
        point["normalized_value"] == 1
        for point
        in body["data_points"]
    )


def test_normalization_requires_data(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_normalization_indicator(
            temporary_user,
        )
    )

    response = client.get(
        normalization_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Indicator has no data points "
        "to normalize."
    )


def test_normalization_requires_directionality(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_normalization_indicator(
            temporary_user,
            directionality=None,
        )
    )

    add_data(
        indicator,
        [
            ("Czechia", "2025", 1),
            ("France", "2025", 2),
        ],
    )

    response = client.get(
        normalization_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Indicator directionality must be "
        "'higher_is_better' or "
        "'lower_is_better' before normalization."
    )


def test_other_tenant_cannot_normalize_indicator(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_normalization_indicator(
            temporary_user,
        )
    )

    add_data(
        indicator,
        [
            ("Czechia", "2025", 1),
            ("France", "2025", 2),
        ],
    )

    owner_response = client.get(
        normalization_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
    )

    assert owner_response.status_code == 200

    foreign_response = client.get(
        normalization_url(
            index,
            dimension,
            indicator,
        ),
        headers=second_auth_headers,
    )

    assert foreign_response.status_code == 404