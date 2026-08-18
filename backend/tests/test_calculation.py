import uuid

from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import (
    DataPoint,
    DataSource,
    Dimension,
    Index,
    Indicator,
    WeightingConfig,
)


def create_calculation_index(
    temporary_user: dict,
) -> tuple[
    Index,
    list[Dimension],
    list[Indicator],
]:
    db = SessionLocal()

    try:
        index = Index(
            tenant_id=uuid.UUID(
                temporary_user["tenant_id"]
            ),
            name="Calculation Test Index",
            slug=f"calculation-{uuid.uuid4()}",
            description="Calculation tests",
            created_by=uuid.UUID(
                temporary_user["id"]
            ),
        )

        db.add(index)
        db.flush()

        economy = Dimension(
            index_id=index.id,
            name="Economy",
            order_position=0,
        )

        health = Dimension(
            index_id=index.id,
            name="Health",
            order_position=1,
        )

        db.add_all([
            economy,
            health,
        ])
        db.flush()

        indicators = [
            Indicator(
                dimension_id=economy.id,
                name="GDP",
                unit="USD",
                directionality="higher_is_better",
                status="ready",
                order_position=0,
            ),
            Indicator(
                dimension_id=economy.id,
                name="Unemployment",
                unit="%",
                directionality="lower_is_better",
                status="ready",
                order_position=1,
            ),
            Indicator(
                dimension_id=health.id,
                name="Life Expectancy",
                unit="years",
                directionality="higher_is_better",
                status="ready",
                order_position=0,
            ),
            Indicator(
                dimension_id=health.id,
                name="Infant Mortality",
                unit="rate",
                directionality="lower_is_better",
                status="ready",
                order_position=1,
            ),
        ]

        db.add_all(indicators)
        db.commit()

        db.refresh(index)
        db.refresh(economy)
        db.refresh(health)

        for indicator in indicators:
            db.refresh(indicator)

        db.expunge(index)
        db.expunge(economy)
        db.expunge(health)

        for indicator in indicators:
            db.expunge(indicator)

        return (
            index,
            [economy, health],
            indicators,
        )

    finally:
        db.close()


def add_indicator_data(
    indicator: Indicator,
    rows: list[
        tuple[str, str, float]
    ],
) -> None:
    db = SessionLocal()

    try:
        source = DataSource(
            indicator_id=indicator.id,
            name=f"{indicator.name} data",
            source_type="csv",
            original_filename="test.csv",
        )

        db.add(source)
        db.flush()

        db.add_all([
            DataPoint(
                data_source_id=source.id,
                indicator_id=indicator.id,
                entity=entity,
                period=period,
                value=value,
            )
            for entity, period, value
            in rows
        ])

        db.commit()

    finally:
        db.close()


def add_standard_data(
    indicators: list[Indicator],
) -> None:
    add_indicator_data(
        indicators[0],
        [
            ("A", "2025", 100),
            ("B", "2025", 200),
        ],
    )

    add_indicator_data(
        indicators[1],
        [
            ("A", "2025", 4),
            ("B", "2025", 8),
        ],
    )

    add_indicator_data(
        indicators[2],
        [
            ("A", "2025", 70),
            ("B", "2025", 80),
        ],
    )

    add_indicator_data(
        indicators[3],
        [
            ("A", "2025", 2),
            ("B", "2025", 6),
        ],
    )


def save_equal_weighting(
    index: Index,
) -> None:
    db = SessionLocal()

    try:
        db.add(
            WeightingConfig(
                index_id=index.id,
                method="equal",
                config={},
            )
        )

        db.commit()

    finally:
        db.close()


def save_custom_weighting(
    index: Index,
    dimensions: list[Dimension],
    indicators: list[Indicator],
) -> None:
    db = SessionLocal()

    try:
        db.add(
            WeightingConfig(
                index_id=index.id,
                method="custom",
                config={
                    "dimension_weights": {
                        str(dimensions[0].id): 0.6,
                        str(dimensions[1].id): 0.4,
                    },
                    "indicator_weights": {
                        str(indicators[0].id): 0.7,
                        str(indicators[1].id): 0.3,
                        str(indicators[2].id): 0.6,
                        str(indicators[3].id): 0.4,
                    },
                },
            )
        )

        db.commit()

    finally:
        db.close()


def calculation_url(
    index: Index,
) -> str:
    return (
        f"/calculation/indexes/{index.slug}"
    )


def test_custom_weighting_calculates_scores(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimensions, indicators = (
        create_calculation_index(
            temporary_user
        )
    )

    add_standard_data(indicators)

    save_custom_weighting(
        index,
        dimensions,
        indicators,
    )

    response = client.get(
        calculation_url(index),
        headers=auth_headers,
    )

    assert response.status_code == 200, (
        response.text
    )

    body = response.json()

    assert (
        body["weighting_method"]
        == "custom"
    )

    assert len(body["periods"]) == 1

    results = (
        body["periods"][0]["results"]
    )

    assert len(results) == 2

    assert results[0]["rank"] == 1
    assert results[1]["rank"] == 2


def test_equal_weighting_calculates_scores(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, _, indicators = (
        create_calculation_index(
            temporary_user
        )
    )

    add_standard_data(indicators)

    save_equal_weighting(index)

    response = client.get(
        calculation_url(index),
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert (
        body["weighting_method"]
        == "equal"
    )

    assert len(
        body["periods"][0]["results"]
    ) == 2


def test_results_are_ranked_highest_first(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, _, indicators = (
        create_calculation_index(
            temporary_user
        )
    )

    add_standard_data(indicators)

    save_equal_weighting(index)

    response = client.get(
        calculation_url(index),
        headers=auth_headers,
    )

    assert response.status_code == 200

    results = response.json()[
        "periods"
    ][0]["results"]

    assert (
        results[0]["score"]
        >= results[1]["score"]
    )

    assert results[0]["rank"] == 1
    assert results[1]["rank"] == 2


def test_multiple_periods_are_calculated_separately(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, _, indicators = (
        create_calculation_index(
            temporary_user
        )
    )

    for indicator in indicators:
        if (
            indicator.directionality
            == "higher_is_better"
        ):
            rows = [
                ("A", "2024", 10),
                ("B", "2024", 20),
                ("A", "2025", 20),
                ("B", "2025", 40),
            ]
        else:
            rows = [
                ("A", "2024", 2),
                ("B", "2024", 4),
                ("A", "2025", 4),
                ("B", "2025", 8),
            ]

        add_indicator_data(
            indicator,
            rows,
        )

    save_equal_weighting(index)

    response = client.get(
        calculation_url(index),
        headers=auth_headers,
    )

    assert response.status_code == 200

    periods = response.json()[
        "periods"
    ]

    assert [
        period["period"]
        for period in periods
    ] == [
        "2024",
        "2025",
    ]


def test_mismatched_coverage_is_rejected(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, _, indicators = (
        create_calculation_index(
            temporary_user
        )
    )

    add_indicator_data(
        indicators[0],
        [
            ("A", "2025", 100),
            ("B", "2025", 200),
        ],
    )

    for indicator in indicators[1:]:
        add_indicator_data(
            indicator,
            [
                ("A", "2025", 1),
            ],
        )

    save_equal_weighting(index)

    response = client.get(
        calculation_url(index),
        headers=auth_headers,
    )

    assert response.status_code == 400

    assert (
        "matching entity and period coverage"
        in response.json()["detail"]
    )


def test_duplicate_observations_are_rejected(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, _, indicators = (
        create_calculation_index(
            temporary_user
        )
    )

    add_standard_data(indicators)

    add_indicator_data(
        indicators[0],
        [
            ("A", "2025", 999),
        ],
    )

    save_equal_weighting(index)

    response = client.get(
        calculation_url(index),
        headers=auth_headers,
    )

    assert response.status_code == 400

    assert (
        "contains multiple values"
        in response.json()["detail"]
    )


def test_missing_weighting_is_rejected(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, _, indicators = (
        create_calculation_index(
            temporary_user
        )
    )

    add_standard_data(indicators)

    response = client.get(
        calculation_url(index),
        headers=auth_headers,
    )

    assert response.status_code == 400

    assert (
        "Configure and save index weighting"
        in response.json()["detail"]
    )


def test_other_tenant_cannot_calculate_index(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
):
    index, _, indicators = (
        create_calculation_index(
            temporary_user
        )
    )

    add_standard_data(indicators)
    save_equal_weighting(index)

    owner_response = client.get(
        calculation_url(index),
        headers=auth_headers,
    )

    assert owner_response.status_code == 200

    foreign_response = client.get(
        calculation_url(index),
        headers=second_auth_headers,
    )

    assert foreign_response.status_code == 404