import math
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import (
    Dimension,
    Index,
    Indicator,
    User,
    WeightingConfig,
)
from app.modules.identity.router import (
    get_current_user,
)
from app.modules.methodology_engine.weighting_schemas import (
    WeightingConfigOut,
    WeightingConfigUpdate,
)


router = APIRouter(
    prefix="/methodology",
    tags=["weighting"],
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


def validate_custom_weights(
    index: Index,
    payload: WeightingConfigUpdate,
    db: Session,
) -> None:
    dimensions = (
        db.query(Dimension)
        .filter(
            Dimension.index_id == index.id
        )
        .all()
    )

    dimension_ids = {
        dimension.id
        for dimension in dimensions
    }

    supplied_dimension_ids = {
        item.id
        for item in payload.dimension_weights
    }

    if supplied_dimension_ids != dimension_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Custom weighting must include "
                "every dimension exactly once."
            ),
        )

    dimension_total = sum(
        item.weight
        for item in payload.dimension_weights
    )

    if not math.isclose(
        dimension_total,
        1.0,
        abs_tol=0.0001,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Dimension weights must total 1.0."
            ),
        )

    indicators = (
        db.query(Indicator)
        .join(
            Dimension,
            Indicator.dimension_id
            == Dimension.id,
        )
        .filter(
            Dimension.index_id == index.id
        )
        .all()
    )

    indicator_by_id = {
        indicator.id: indicator
        for indicator in indicators
    }

    supplied_indicator_ids = {
        item.id
        for item in payload.indicator_weights
    }

    if supplied_indicator_ids != set(
        indicator_by_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Custom weighting must include "
                "every indicator exactly once."
            ),
        )

    for dimension in dimensions:
        dimension_indicator_ids = {
            indicator.id
            for indicator in indicators
            if indicator.dimension_id
            == dimension.id
        }

        weights = [
            item.weight
            for item
            in payload.indicator_weights
            if item.id
            in dimension_indicator_ids
        ]

        if not dimension_indicator_ids:
            continue

        total = sum(weights)

        if not math.isclose(
            total,
            1.0,
            abs_tol=0.0001,
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "Indicator weights within "
                    f"dimension '{dimension.name}' "
                    "must total 1.0."
                ),
            )


@router.get(
    "/indexes/{index_slug}/weighting",
    response_model=WeightingConfigOut | None,
)
def get_weighting(
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

    return (
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


@router.put(
    "/indexes/{index_slug}/weighting",
    response_model=WeightingConfigOut,
)
def save_weighting(
    index_slug: str,
    payload: WeightingConfigUpdate,
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

    if payload.method == "custom":
        validate_custom_weights(
            index,
            payload,
            db,
        )

        config = {
            "dimension_weights": {
                str(item.id): item.weight
                for item
                in payload.dimension_weights
            },
            "indicator_weights": {
                str(item.id): item.weight
                for item
                in payload.indicator_weights
            },
        }

    else:
        config = {}

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
        weighting = WeightingConfig(
            index_id=index.id,
            method=payload.method,
            config=config,
        )

        db.add(weighting)

    else:
        weighting.method = payload.method
        weighting.config = config

    db.commit()
    db.refresh(weighting)

    return weighting