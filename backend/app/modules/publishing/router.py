"""
Publishing & Presentation Layer

Validates and publishes indexes belonging to the authenticated
user's tenant.

Publishing is gated by a pre-publish checklist covering:

- index metadata
- methodology structure
- indicator metadata
- indicator readiness
- data availability
- matching entity/period coverage
- weighting configuration
- successful index calculation
"""

from collections import Counter

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
from app.modules.methodology_engine.calculation_router import (
    calculate_index,
)
from app.modules.publishing.schemas import (
    PublicDimensionOut,
    PublicIndexOut,
    PublicIndicatorOut,
    PublishChecklistItem,
    PublishResponse,
    PublishValidationResponse,
)


router = APIRouter(
    prefix="/publish",
    tags=["publishing"],
)


@router.get("/ping")
def ping():
    return {
        "module": "publishing",
        "status": "ok",
    }


# ------------------------------------------------------------------
# Ownership
# ------------------------------------------------------------------


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


# ------------------------------------------------------------------
# Checklist helpers
# ------------------------------------------------------------------


def get_index_dimensions(
    index: Index,
    db: Session,
) -> list[Dimension]:
    return (
        db.query(Dimension)
        .filter(
            Dimension.index_id
            == index.id
        )
        .order_by(
            Dimension.order_position.asc(),
            Dimension.created_at.asc(),
        )
        .all()
    )


def get_dimension_indicators(
    dimension: Dimension,
    db: Session,
) -> list[Indicator]:
    return (
        db.query(Indicator)
        .filter(
            Indicator.dimension_id
            == dimension.id
        )
        .order_by(
            Indicator.order_position.asc(),
            Indicator.created_at.asc(),
        )
        .all()
    )


def get_indicator_coverage(
    indicator: Indicator,
    db: Session,
) -> tuple[
    set[tuple[str, str]],
    bool,
]:
    points = (
        db.query(DataPoint)
        .filter(
            DataPoint.indicator_id
            == indicator.id
        )
        .all()
    )

    keys = [
        (
            point.entity.strip().casefold(),
            point.period.strip(),
        )
        for point in points
    ]

    counts = Counter(keys)

    has_duplicates = any(
        count > 1
        for count in counts.values()
    )

    return (
        set(keys),
        has_duplicates,
    )


def format_exception_detail(
    detail,
) -> str:
    if isinstance(detail, str):
        return detail

    if isinstance(detail, dict):
        message = detail.get(
            "message"
        )

        if isinstance(message, str):
            return message

        return str(detail)

    return str(detail)


# ------------------------------------------------------------------
# Publish validation
# ------------------------------------------------------------------


def build_publish_checklist(
    index: Index,
    db: Session,
    current_user: User,
) -> list[PublishChecklistItem]:
    dimensions = get_index_dimensions(
        index,
        db,
    )

    indicators_by_dimension: dict[
        object,
        list[Indicator],
    ] = {}

    indicators: list[Indicator] = []

    for dimension in dimensions:
        dimension_indicators = (
            get_dimension_indicators(
                dimension,
                db,
            )
        )

        indicators_by_dimension[
            dimension.id
        ] = dimension_indicators

        indicators.extend(
            dimension_indicators
        )

    checklist: list[
        PublishChecklistItem
    ] = []


    # --------------------------------------------------------------
    # Index metadata
    # --------------------------------------------------------------

    has_name = bool(
        index.name
        and index.name.strip()
    )

    checklist.append(
        PublishChecklistItem(
            key="index_name",
            label="Index has a name",
            passed=has_name,
            detail=(
                None
                if has_name
                else (
                    "Add an index name "
                    "before publishing."
                )
            ),
        )
    )


    has_description = bool(
        index.description
        and index.description.strip()
    )

    checklist.append(
        PublishChecklistItem(
            key="index_description",
            label=(
                "Index has a description"
            ),
            passed=has_description,
            detail=(
                None
                if has_description
                else (
                    "Add an index description "
                    "before publishing."
                )
            ),
        )
    )


    # --------------------------------------------------------------
    # Dimensions
    # --------------------------------------------------------------

    has_dimensions = (
        len(dimensions) > 0
    )

    checklist.append(
        PublishChecklistItem(
            key="dimensions_exist",
            label=(
                "Index contains at least "
                "one dimension"
            ),
            passed=has_dimensions,
            detail=(
                None
                if has_dimensions
                else (
                    "Create at least "
                    "one dimension."
                )
            ),
        )
    )


    empty_dimensions = [
        dimension.name
        for dimension in dimensions
        if not indicators_by_dimension[
            dimension.id
        ]
    ]

    dimensions_have_indicators = (
        has_dimensions
        and not empty_dimensions
    )

    checklist.append(
        PublishChecklistItem(
            key=(
                "dimensions_have_indicators"
            ),
            label=(
                "Every dimension "
                "contains indicators"
            ),
            passed=(
                dimensions_have_indicators
            ),
            detail=(
                None
                if dimensions_have_indicators
                else (
                    (
                        "Dimensions without "
                        "indicators: "
                        + ", ".join(
                            empty_dimensions
                        )
                    )
                    if empty_dimensions
                    else (
                        "No dimensions "
                        "are available."
                    )
                )
            ),
        )
    )


    # --------------------------------------------------------------
    # Indicators
    # --------------------------------------------------------------

    has_indicators = (
        len(indicators) > 0
    )

    checklist.append(
        PublishChecklistItem(
            key="indicators_exist",
            label=(
                "Index contains indicators"
            ),
            passed=has_indicators,
            detail=(
                None
                if has_indicators
                else (
                    "Add indicators "
                    "before publishing."
                )
            ),
        )
    )


    incomplete_descriptions = [
        indicator.name
        for indicator in indicators
        if not (
            indicator.description
            and
            indicator.description.strip()
        )
    ]

    descriptions_complete = (
        has_indicators
        and
        not incomplete_descriptions
    )

    checklist.append(
        PublishChecklistItem(
            key="indicator_descriptions",
            label=(
                "Every indicator "
                "has a description"
            ),
            passed=(
                descriptions_complete
            ),
            detail=(
                None
                if descriptions_complete
                else (
                    (
                        "Missing descriptions: "
                        + ", ".join(
                            incomplete_descriptions
                        )
                    )
                    if incomplete_descriptions
                    else (
                        "No indicators "
                        "are available."
                    )
                )
            ),
        )
    )


    missing_units = [
        indicator.name
        for indicator in indicators
        if not (
            indicator.unit
            and
            indicator.unit.strip()
        )
    ]

    units_complete = (
        has_indicators
        and
        not missing_units
    )

    checklist.append(
        PublishChecklistItem(
            key="indicator_units",
            label=(
                "Every indicator has a unit"
            ),
            passed=units_complete,
            detail=(
                None
                if units_complete
                else (
                    (
                        "Missing units: "
                        + ", ".join(
                            missing_units
                        )
                    )
                    if missing_units
                    else (
                        "No indicators "
                        "are available."
                    )
                )
            ),
        )
    )


    invalid_directionality = [
        indicator.name
        for indicator in indicators
        if indicator.directionality not in (
            "higher_is_better",
            "lower_is_better",
        )
    ]

    directionality_complete = (
        has_indicators
        and
        not invalid_directionality
    )

    checklist.append(
        PublishChecklistItem(
            key=(
                "indicator_directionality"
            ),
            label=(
                "Every indicator "
                "has valid directionality"
            ),
            passed=(
                directionality_complete
            ),
            detail=(
                None
                if directionality_complete
                else (
                    (
                        "Missing or invalid "
                        "directionality: "
                        + ", ".join(
                            invalid_directionality
                        )
                    )
                    if invalid_directionality
                    else (
                        "No indicators "
                        "are available."
                    )
                )
            ),
        )
    )


    not_ready = [
        indicator.name
        for indicator in indicators
        if indicator.status != "ready"
    ]

    all_ready = (
        has_indicators
        and
        not not_ready
    )

    checklist.append(
        PublishChecklistItem(
            key="indicators_ready",
            label=(
                "Every indicator "
                "is marked Ready"
            ),
            passed=all_ready,
            detail=(
                None
                if all_ready
                else (
                    (
                        "Indicators not Ready: "
                        + ", ".join(
                            not_ready
                        )
                    )
                    if not_ready
                    else (
                        "No indicators "
                        "are available."
                    )
                )
            ),
        )
    )


    # --------------------------------------------------------------
    # Data
    # --------------------------------------------------------------

    indicators_without_data: list[
        str
    ] = []

    coverage_by_indicator: dict[
        object,
        set[tuple[str, str]],
    ] = {}

    duplicate_indicators: list[
        str
    ] = []

    for indicator in indicators:
        (
            coverage,
            has_duplicates,
        ) = get_indicator_coverage(
            indicator,
            db,
        )

        coverage_by_indicator[
            indicator.id
        ] = coverage

        if not coverage:
            indicators_without_data.append(
                indicator.name
            )

        if has_duplicates:
            duplicate_indicators.append(
                indicator.name
            )


    data_complete = (
        has_indicators
        and
        not indicators_without_data
    )

    checklist.append(
        PublishChecklistItem(
            key="indicator_data",
            label=(
                "Every indicator "
                "has data"
            ),
            passed=data_complete,
            detail=(
                None
                if data_complete
                else (
                    (
                        "Indicators without data: "
                        + ", ".join(
                            indicators_without_data
                        )
                    )
                    if indicators_without_data
                    else (
                        "No indicators "
                        "are available."
                    )
                )
            ),
        )
    )


    no_duplicate_observations = (
        data_complete
        and
        not duplicate_indicators
    )

    checklist.append(
        PublishChecklistItem(
            key=(
                "unique_indicator_data"
            ),
            label=(
                "Indicators contain one "
                "observation per entity "
                "and period"
            ),
            passed=(
                no_duplicate_observations
            ),
            detail=(
                None
                if no_duplicate_observations
                else (
                    (
                        "Duplicate observations "
                        "exist for: "
                        + ", ".join(
                            duplicate_indicators
                        )
                    )
                    if duplicate_indicators
                    else (
                        "Complete indicator data "
                        "is required first."
                    )
                )
            ),
        )
    )


    coverage_matches = False
    coverage_detail = None

    if (
        data_complete
        and
        no_duplicate_observations
    ):
        coverage_sets = [
            coverage_by_indicator[
                indicator.id
            ]
            for indicator in indicators
        ]

        reference_coverage = (
            coverage_sets[0]
        )

        coverage_matches = all(
            coverage
            == reference_coverage
            for coverage in coverage_sets
        )

        if not coverage_matches:
            coverage_detail = (
                "Indicator datasets do not "
                "have matching entity and "
                "period coverage."
            )

    else:
        coverage_detail = (
            "Complete, unique indicator "
            "data is required before "
            "coverage can be validated."
        )


    checklist.append(
        PublishChecklistItem(
            key="data_coverage",
            label=(
                "Indicator datasets have "
                "matching entity and "
                "period coverage"
            ),
            passed=coverage_matches,
            detail=(
                None
                if coverage_matches
                else coverage_detail
            ),
        )
    )


    # --------------------------------------------------------------
    # Weighting
    # --------------------------------------------------------------

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

    has_weighting = (
        weighting is not None
    )

    checklist.append(
        PublishChecklistItem(
            key="weighting",
            label=(
                "Index weighting "
                "is configured"
            ),
            passed=has_weighting,
            detail=(
                None
                if has_weighting
                else (
                    "Configure and save "
                    "index weighting before "
                    "publishing."
                )
            ),
        )
    )


    # --------------------------------------------------------------
    # Full calculation
    # --------------------------------------------------------------

    calculation_passed = False
    calculation_detail = None

    prerequisites_met = (
        has_dimensions
        and
        dimensions_have_indicators
        and
        has_indicators
        and
        directionality_complete
        and
        data_complete
        and
        no_duplicate_observations
        and
        coverage_matches
        and
        has_weighting
    )

    if prerequisites_met:
        try:
            result = calculate_index(
                index_slug=index.slug,
                db=db,
                current_user=current_user,
            )

            calculation_passed = bool(
                result.periods
                and any(
                    period.results
                    for period
                    in result.periods
                )
            )

            if not calculation_passed:
                calculation_detail = (
                    "The index calculation "
                    "did not produce results."
                )

        except HTTPException as exc:
            calculation_detail = (
                format_exception_detail(
                    exc.detail
                )
            )

        except Exception as exc:
            calculation_detail = (
                "Index calculation failed: "
                f"{exc}"
            )

    else:
        calculation_detail = (
            "Complete the required "
            "methodology, data, coverage, "
            "and weighting checks first."
        )


    checklist.append(
        PublishChecklistItem(
            key="calculation",
            label=(
                "Index calculation "
                "produces results"
            ),
            passed=calculation_passed,
            detail=(
                None
                if calculation_passed
                else calculation_detail
            ),
        )
    )


    return checklist


# ------------------------------------------------------------------
# Validation endpoint
# ------------------------------------------------------------------


@router.get(
    "/indexes/{index_slug}/validate",
    response_model=(
        PublishValidationResponse
    ),
)
def validate_index_for_publish(
    index_slug: str,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):
    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    checklist = (
        build_publish_checklist(
            index,
            db,
            current_user,
        )
    )

    return PublishValidationResponse(
        index_slug=index.slug,
        current_status=index.status,
        can_publish=all(
            item.passed
            for item in checklist
        ),
        checklist=checklist,
    )


# ------------------------------------------------------------------
# Publish endpoint
# ------------------------------------------------------------------


@router.post(
    "/indexes/{index_slug}",
    response_model=PublishResponse,
)
def publish_index(
    index_slug: str,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):
    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    if (
        index.status
        == "published"
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Index is already published"
            ),
        )

    checklist = (
        build_publish_checklist(
            index,
            db,
            current_user,
        )
    )

    failed_items = [
        item
        for item in checklist
        if not item.passed
    ]

    if failed_items:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail={
                "message": (
                    "Index cannot be published "
                    "because the pre-publish "
                    "checklist is incomplete."
                ),
                "failed_items": [
                    {
                        "key":
                            item.key,
                        "label":
                            item.label,
                        "detail":
                            item.detail,
                    }
                    for item
                    in failed_items
                ],
            },
        )

    index.status = "published"

    db.commit()
    db.refresh(index)

    return PublishResponse(
        index_slug=index.slug,
        status=index.status,
        message=(
            f'Index "{index.name}" '
            "was published successfully."
        ),
    )


# ------------------------------------------------------------------
# Public published index
# ------------------------------------------------------------------


@router.get(
    "/indexes/{index_slug}/public",
    response_model=PublicIndexOut,
)
def get_public_index(
    index_slug: str,
    db: Session = Depends(
        get_db
    ),
):
    index = (
        db.query(Index)
        .filter(
            Index.slug
            == index_slug,
            Index.status
            == "published",
        )
        .first()
    )

    if index is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Published index not found"
            ),
        )

    dimensions = (
        db.query(Dimension)
        .filter(
            Dimension.index_id
            == index.id
        )
        .order_by(
            Dimension.order_position.asc(),
            Dimension.created_at.asc(),
        )
        .all()
    )

    public_dimensions: list[
        PublicDimensionOut
    ] = []

    for dimension in dimensions:
        indicators = (
            db.query(Indicator)
            .filter(
                Indicator.dimension_id
                == dimension.id
            )
            .order_by(
                Indicator.order_position.asc(),
                Indicator.created_at.asc(),
            )
            .all()
        )

        public_indicators = [
            PublicIndicatorOut(
                id=str(
                    indicator.id
                ),
                name=(
                    indicator.name
                ),
                description=(
                    indicator.description
                ),
                unit=(
                    indicator.unit
                ),
                directionality=(
                    indicator.directionality
                ),
                order_position=(
                    indicator.order_position
                ),
            )
            for indicator
            in indicators
        ]

        public_dimensions.append(
            PublicDimensionOut(
                id=str(
                    dimension.id
                ),
                name=(
                    dimension.name
                ),
                description=(
                    dimension.description
                ),
                order_position=(
                    dimension.order_position
                ),
                indicators=(
                    public_indicators
                ),
            )
        )

    return PublicIndexOut(
        id=str(
            index.id
        ),
        name=index.name,
        slug=index.slug,
        description=(
            index.description
        ),
        status=index.status,
        dimensions=(
            public_dimensions
        ),
    )