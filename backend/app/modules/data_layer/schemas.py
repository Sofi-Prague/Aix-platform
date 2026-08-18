import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DataPointOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    data_source_id: uuid.UUID
    indicator_id: uuid.UUID
    entity: str
    period: str
    value: float
    created_at: datetime


class DataSourceOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    indicator_id: uuid.UUID
    name: str
    source_type: str
    source_url: str | None
    original_filename: str | None
    created_at: datetime


class DataSourceDetailOut(DataSourceOut):
    data_points: list[DataPointOut]


class CSVUploadResponse(BaseModel):
    data_source: DataSourceOut
    rows_imported: int