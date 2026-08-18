"""
Data Layer

Handles tenant-safe dataset ingestion and retrieval for indicators.
"""

import csv
import io
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import (
    DataPoint,
    DataSource,
    Dimension,
    Index,
    Indicator,
    User,
)
from app.modules.data_layer.schemas import (
    CSVUploadResponse,
    DataPointOut,
    DataSourceDetailOut,
    DataSourceOut,
)
from app.modules.identity.router import get_current_user


router = APIRouter(
    prefix="/data",
    tags=["data_layer"],
)


@router.get("/ping")
def ping():
    return {
        "module": "data_layer",
        "status": "ok",
    }


# ---------------------------------------------------------------------------
# Ownership helpers
# ---------------------------------------------------------------------------


def get_owned_index(
    index_slug: str,
    db: Session,
    current_user: User,
) -> Index:
    index = (
        db.query(Index)
        .filter(
            Index.slug == index_slug,
            Index.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Index '{index_slug}' not found",
        )

    return index


def get_owned_dimension(
    index: Index,
    dimension_id: uuid.UUID,
    db: Session,
) -> Dimension:
    dimension = (
        db.query(Dimension)
        .filter(
            Dimension.id == dimension_id,
            Dimension.index_id == index.id,
        )
        .first()
    )

    if dimension is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dimension not found",
        )

    return dimension


def get_owned_indicator(
    dimension: Dimension,
    indicator_id: uuid.UUID,
    db: Session,
) -> Indicator:
    indicator = (
        db.query(Indicator)
        .filter(
            Indicator.id == indicator_id,
            Indicator.dimension_id == dimension.id,
        )
        .first()
    )

    if indicator is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Indicator not found",
        )

    return indicator


def get_indicator_for_user(
    index_slug: str,
    dimension_id: uuid.UUID,
    indicator_id: uuid.UUID,
    db: Session,
    current_user: User,
) -> Indicator:
    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    dimension = get_owned_dimension(
        index,
        dimension_id,
        db,
    )

    return get_owned_indicator(
        dimension,
        indicator_id,
        db,
    )


def get_owned_data_source(
    indicator: Indicator,
    source_id: uuid.UUID,
    db: Session,
) -> DataSource:
    source = (
        db.query(DataSource)
        .filter(
            DataSource.id == source_id,
            DataSource.indicator_id == indicator.id,
        )
        .first()
    )

    if source is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found",
        )

    return source


# ---------------------------------------------------------------------------
# CSV validation
# ---------------------------------------------------------------------------


def parse_csv(
    contents: bytes,
) -> list[tuple[str, str, float]]:
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must use UTF-8 encoding.",
        ) from exc

    try:
        dialect = csv.Sniffer().sniff(
            text[:2048],
            delimiters=",;",
        )
    except csv.Error:
        dialect = csv.excel

    reader = csv.DictReader(
        io.StringIO(text),
        dialect=dialect,
    )

    if reader.fieldnames is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file is empty or has no header.",
        )

    normalized_headers = {
        header.strip().lower()
        for header in reader.fieldnames
        if header is not None
    }

    required_headers = {
        "entity",
        "period",
        "value",
    }

    if not required_headers.issubset(
        normalized_headers,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "CSV must contain the columns: "
                "entity, period, value."
            ),
        )

    rows: list[tuple[str, str, float]] = []
    seen: set[tuple[str, str]] = set()

    for row_number, raw_row in enumerate(
        reader,
        start=2,
    ):
        row = {
            (
                key.strip().lower()
                if key is not None
                else ""
            ): value
            for key, value in raw_row.items()
        }

        entity = (
            row.get("entity") or ""
        ).strip()

        period = (
            row.get("period") or ""
        ).strip()

        raw_value = (
            row.get("value") or ""
        ).strip()

        if not entity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Row {row_number}: "
                    "entity is required."
                ),
            )

        if not period:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Row {row_number}: "
                    "period is required."
                ),
            )

        if not raw_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Row {row_number}: "
                    "value is required."
                ),
            )

        try:
            value = float(raw_value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Row {row_number}: "
                    f"'{raw_value}' is not a valid number."
                ),
            ) from exc

        unique_key = (
            entity.casefold(),
            period.casefold(),
        )

        if unique_key in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Row {row_number}: duplicate "
                    f"entity/period combination "
                    f"'{entity}' / '{period}'."
                ),
            )

        seen.add(unique_key)

        rows.append(
            (
                entity,
                period,
                value,
            )
        )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV contains no data rows.",
        )

    return rows


# ---------------------------------------------------------------------------
# Data source routes
# ---------------------------------------------------------------------------


@router.post(
    (
        "/indexes/{index_slug}"
        "/dimensions/{dimension_id}"
        "/indicators/{indicator_id}"
        "/sources/upload"
    ),
    response_model=CSVUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_csv(
    index_slug: str,
    dimension_id: uuid.UUID,
    indicator_id: uuid.UUID,
    name: str = Form(...),
    source_url: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    indicator = get_indicator_for_user(
        index_slug,
        dimension_id,
        indicator_id,
        db,
        current_user,
    )

    clean_name = name.strip()

    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Data source name is required.",
        )

    filename = file.filename or ""

    if not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported.",
        )

    contents = await file.read()

    rows = parse_csv(contents)

    source = DataSource(
        indicator_id=indicator.id,
        name=clean_name,
        source_type="csv",
        source_url=(
            source_url.strip()
            if source_url
            else None
        ),
        original_filename=filename,
    )

    try:
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
            for entity, period, value in rows
        ]

        db.add_all(points)
        db.commit()
        db.refresh(source)

    except Exception:
        db.rollback()
        raise

    return CSVUploadResponse(
        data_source=DataSourceOut.model_validate(
            source,
        ),
        rows_imported=len(rows),
    )


@router.get(
    (
        "/indexes/{index_slug}"
        "/dimensions/{dimension_id}"
        "/indicators/{indicator_id}"
        "/sources"
    ),
    response_model=list[DataSourceOut],
)
def list_data_sources(
    index_slug: str,
    dimension_id: uuid.UUID,
    indicator_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    indicator = get_indicator_for_user(
        index_slug,
        dimension_id,
        indicator_id,
        db,
        current_user,
    )

    return (
        db.query(DataSource)
        .filter(
            DataSource.indicator_id
            == indicator.id,
        )
        .order_by(
            DataSource.created_at.desc(),
        )
        .all()
    )


@router.get(
    (
        "/indexes/{index_slug}"
        "/dimensions/{dimension_id}"
        "/indicators/{indicator_id}"
        "/sources/{source_id}"
    ),
    response_model=DataSourceDetailOut,
)
def get_data_source(
    index_slug: str,
    dimension_id: uuid.UUID,
    indicator_id: uuid.UUID,
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    indicator = get_indicator_for_user(
        index_slug,
        dimension_id,
        indicator_id,
        db,
        current_user,
    )

    source = get_owned_data_source(
        indicator,
        source_id,
        db,
    )

    points = (
        db.query(DataPoint)
        .filter(
            DataPoint.data_source_id
            == source.id,
            DataPoint.indicator_id
            == indicator.id,
        )
        .order_by(
            DataPoint.entity.asc(),
            DataPoint.period.asc(),
        )
        .all()
    )

    return DataSourceDetailOut(
        id=source.id,
        indicator_id=source.indicator_id,
        name=source.name,
        source_type=source.source_type,
        source_url=source.source_url,
        original_filename=source.original_filename,
        created_at=source.created_at,
        data_points=[
            DataPointOut.model_validate(point)
            for point in points
        ],
    )


@router.delete(
    (
        "/indexes/{index_slug}"
        "/dimensions/{dimension_id}"
        "/indicators/{indicator_id}"
        "/sources/{source_id}"
    ),
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_data_source(
    index_slug: str,
    dimension_id: uuid.UUID,
    indicator_id: uuid.UUID,
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    indicator = get_indicator_for_user(
        index_slug,
        dimension_id,
        indicator_id,
        db,
        current_user,
    )

    source = get_owned_data_source(
        indicator,
        source_id,
        db,
    )

    db.delete(source)
    db.commit()

    return None