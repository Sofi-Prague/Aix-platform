import uuid
from collections import defaultdict

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import (
    DataPoint,
    Dimension,
    Index,
    Indicator,
    User,
    WeightingConfig,
)
from app.modules.identity.router import (
    get_current_user,
)
from app.modules.methodology_engine.calculation_schemas import (
    CalculatedDimensionOut,
    CalculatedEntityOut,
    CalculatedIndicatorOut,
    CalculatedPeriodOut,
    IndexCalculationResponse,
)


router = APIRouter(
    prefix="/calculation",
    tags=["calculation"],
)


def get_owned_index(
    index_slug: str,
    db: Session,
    current_user: User,
) -> Index:
    index = (
        db.query(Index)
        .filter(
            Index.slug == index_slug,
            Index.tenant_id
            == current_user.tenant_id,
        )
        .first()
    )

    if index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Index '{index_slug}' not found"
            ),
        )

    return index


def normalize_indicator(
    indicator: Indicator,
    db: Session,
) -> tuple[
    dict[tuple[str, str], float],
    dict[tuple[str, str], float],
    dict[tuple[str, str], str],
]:
    if indicator.directionality not in (
        "higher_is_better",
        "lower_is_better",
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Indicator '{indicator.name}' "
                "does not have valid directionality."
            ),
        )

    points = (
        db.query(DataPoint)
        .filter(
            DataPoint.indicator_id
            == indicator.id
        )
        .order_by(
            DataPoint.period.asc(),
            DataPoint.entity.asc(),
        )
        .all()
    )

    if not points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Indicator '{indicator.name}' "
                "has no data."
            ),
        )

    points_by_period: dict[
        str,
        list[DataPoint],
    ] = defaultdict(list)

    raw_values: dict[
        tuple[str, str],
        float,
    ] = {}

    entity_names: dict[
        tuple[str, str],
        str,
    ] = {}

    seen: set[
        tuple[str, str]
    ] = set()

    for point in points:
        key = (
            point.entity.strip().casefold(),
            point.period.strip(),
        )

        if key in seen:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    f"Indicator '{indicator.name}' "
                    "contains multiple values for "
                    f"'{point.entity}' in period "
                    f"'{point.period}'. Keep one "
                    "active dataset per indicator."
                ),
            )

        seen.add(key)

        points_by_period[
            point.period.strip()
        ].append(point)

        raw_values[key] = (
            point.value
        )

        entity_names[key] = (
            point.entity.strip()
        )

    normalized_values: dict[
        tuple[str, str],
        float,
    ] = {}

    for (
        period,
        period_points,
    ) in points_by_period.items():
        values = [
            point.value
            for point in period_points
        ]

        minimum = min(values)
        maximum = max(values)

        for point in period_points:
            key = (
                point.entity
                .strip()
                .casefold(),
                period,
            )

            if maximum == minimum:
                normalized = 1.0

            elif (
                indicator.directionality
                == "higher_is_better"
            ):
                normalized = (
                    point.value
                    - minimum
                ) / (
                    maximum
                    - minimum
                )

            else:
                normalized = (
                    maximum
                    - point.value
                ) / (
                    maximum
                    - minimum
                )

            normalized_values[
                key
            ] = normalized

    return (
        raw_values,
        normalized_values,
        entity_names,
    )


def get_weights(
    index: Index,
    dimensions: list[Dimension],
    indicators_by_dimension: dict[
        uuid.UUID,
        list[Indicator],
    ],
    db: Session,
) -> tuple[
    str,
    dict[uuid.UUID, float],
    dict[uuid.UUID, float],
]:
    weighting = (
        db.query(WeightingConfig)
        .filter(
            WeightingConfig.index_id
            == index.id
        )
        .order_by(
            WeightingConfig.created_at.desc()
        )
        .first()
    )

    if weighting is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Configure and save index "
                "weighting before calculating "
                "scores."
            ),
        )

    dimension_weights: dict[
        uuid.UUID,
        float,
    ] = {}

    indicator_weights: dict[
        uuid.UUID,
        float,
    ] = {}

    if weighting.method == "equal":
        if not dimensions:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "Index has no dimensions."
                ),
            )

        dimension_weight = (
            1.0 / len(dimensions)
        )

        for dimension in dimensions:
            dimension_weights[
                dimension.id
            ] = dimension_weight

            indicators = (
                indicators_by_dimension[
                    dimension.id
                ]
            )

            if not indicators:
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        f"Dimension "
                        f"'{dimension.name}' "
                        "has no indicators."
                    ),
                )

            indicator_weight = (
                1.0
                / len(indicators)
            )

            for indicator in indicators:
                indicator_weights[
                    indicator.id
                ] = indicator_weight

    elif weighting.method == "custom":
        config = weighting.config or {}

        stored_dimension_weights = (
            config.get(
                "dimension_weights",
                {},
            )
        )

        stored_indicator_weights = (
            config.get(
                "indicator_weights",
                {},
            )
        )

        for dimension in dimensions:
            value = (
                stored_dimension_weights.get(
                    str(dimension.id)
                )
            )

            if value is None:
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Saved weighting is "
                        "missing a dimension."
                    ),
                )

            dimension_weights[
                dimension.id
            ] = float(value)

        for indicators in (
            indicators_by_dimension.values()
        ):
            for indicator in indicators:
                value = (
                    stored_indicator_weights.get(
                        str(indicator.id)
                    )
                )

                if value is None:
                    raise HTTPException(
                        status_code=(
                            status.HTTP_400_BAD_REQUEST
                        ),
                        detail=(
                            "Saved weighting is "
                            "missing an indicator."
                        ),
                    )

                indicator_weights[
                    indicator.id
                ] = float(value)

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported weighting method "
                f"'{weighting.method}'."
            ),
        )

    return (
        weighting.method,
        dimension_weights,
        indicator_weights,
    )


def calculate_index_record(
    index: Index,
    db: Session,
) -> IndexCalculationResponse:
    dimensions = (
        db.query(Dimension)
        .filter(
            Dimension.index_id
            == index.id
        )
        .order_by(
            Dimension.order_position.asc()
        )
        .all()
    )

    if not dimensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Index has no dimensions.",
        )

    indicators_by_dimension: dict[
        uuid.UUID,
        list[Indicator],
    ] = {}

    all_indicators: list[
        Indicator
    ] = []

    for dimension in dimensions:
        indicators = (
            db.query(Indicator)
            .filter(
                Indicator.dimension_id
                == dimension.id
            )
            .order_by(
                Indicator.order_position.asc()
            )
            .all()
        )

        if not indicators:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    f"Dimension "
                    f"'{dimension.name}' "
                    "has no indicators."
                ),
            )

        indicators_by_dimension[
            dimension.id
        ] = indicators

        all_indicators.extend(
            indicators
        )

    (
        weighting_method,
        dimension_weights,
        indicator_weights,
    ) = get_weights(
        index,
        dimensions,
        indicators_by_dimension,
        db,
    )

    raw_by_indicator: dict[
        uuid.UUID,
        dict[tuple[str, str], float],
    ] = {}

    normalized_by_indicator: dict[
        uuid.UUID,
        dict[tuple[str, str], float],
    ] = {}

    names_by_indicator: dict[
        uuid.UUID,
        dict[tuple[str, str], str],
    ] = {}

    expected_keys: set[
        tuple[str, str]
    ] | None = None

    for indicator in all_indicators:
        (
            raw_values,
            normalized_values,
            entity_names,
        ) = normalize_indicator(
            indicator,
            db,
        )

        keys = set(
            normalized_values
        )

        if expected_keys is None:
            expected_keys = keys

        elif keys != expected_keys:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "Indicator datasets do not "
                    "have matching entity and "
                    "period coverage. Every "
                    "indicator must contain the "
                    "same entities and periods "
                    "before calculating the index."
                ),
            )

        raw_by_indicator[
            indicator.id
        ] = raw_values

        normalized_by_indicator[
            indicator.id
        ] = (
            normalized_values
        )

        names_by_indicator[
            indicator.id
        ] = entity_names

    if not expected_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Index contains no data "
                "to calculate."
            ),
        )

    results_by_period: dict[
        str,
        list[CalculatedEntityOut],
    ] = defaultdict(list)

    first_indicator = (
        all_indicators[0]
    )

    for key in sorted(
        expected_keys,
        key=lambda item: (
            item[1],
            item[0],
        ),
    ):
        entity_key, period = key

        entity_name = (
            names_by_indicator[
                first_indicator.id
            ][key]
        )

        dimension_results: list[
            CalculatedDimensionOut
        ] = []

        index_score = 0.0

        for dimension in dimensions:
            dimension_score = 0.0

            indicator_results: list[
                CalculatedIndicatorOut
            ] = []

            for indicator in (
                indicators_by_dimension[
                    dimension.id
                ]
            ):
                normalized = (
                    normalized_by_indicator[
                        indicator.id
                    ][key]
                )

                raw_value = (
                    raw_by_indicator[
                        indicator.id
                    ][key]
                )

                indicator_weight = (
                    indicator_weights[
                        indicator.id
                    ]
                )

                weighted_indicator = (
                    normalized
                    * indicator_weight
                )

                dimension_score += (
                    weighted_indicator
                )

                indicator_results.append(
                    CalculatedIndicatorOut(
                        indicator_id=(
                            indicator.id
                        ),
                        indicator_name=(
                            indicator.name
                        ),
                        raw_value=(
                            raw_value
                        ),
                        normalized_value=round(
                            normalized,
                            6,
                        ),
                        weight=round(
                            indicator_weight,
                            6,
                        ),
                        weighted_score=round(
                            weighted_indicator,
                            6,
                        ),
                    )
                )

            dimension_weight = (
                dimension_weights[
                    dimension.id
                ]
            )

            weighted_dimension = (
                dimension_score
                * dimension_weight
            )

            index_score += (
                weighted_dimension
            )

            dimension_results.append(
                CalculatedDimensionOut(
                    dimension_id=(
                        dimension.id
                    ),
                    dimension_name=(
                        dimension.name
                    ),
                    weight=round(
                        dimension_weight,
                        6,
                    ),
                    score=round(
                        dimension_score,
                        6,
                    ),
                    weighted_score=round(
                        weighted_dimension,
                        6,
                    ),
                    indicators=(
                        indicator_results
                    ),
                )
            )

        results_by_period[
            period
        ].append(
            CalculatedEntityOut(
                entity=entity_name,
                rank=0,
                score=round(
                    index_score,
                    6,
                ),
                dimensions=(
                    dimension_results
                ),
            )
        )

    periods: list[
        CalculatedPeriodOut
    ] = []

    for period in sorted(
        results_by_period
    ):
        entities = (
            results_by_period[
                period
            ]
        )

        entities.sort(
            key=lambda item: (
                -item.score,
                item.entity.casefold(),
            )
        )

        ranked_entities: list[
            CalculatedEntityOut
        ] = []

        for rank, entity in enumerate(
            entities,
            start=1,
        ):
            ranked_entities.append(
                entity.model_copy(
                    update={
                        "rank": rank,
                    }
                )
            )

        periods.append(
            CalculatedPeriodOut(
                period=period,
                results=ranked_entities,
            )
        )

    return IndexCalculationResponse(
        index_slug=index.slug,
        index_name=index.name,
        weighting_method=(
            weighting_method
        ),
        periods=periods,
    )


@router.get(
    "/indexes/{index_slug}",
    response_model=IndexCalculationResponse,
)
def calculate_index(
    index_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    return calculate_index_record(
        index,
        db,
    )
