import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class IndexCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(
        min_length=1,
        max_length=200,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )


class IndexUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    status: str | None = Field(
        default=None,
        pattern=r"^(draft|archived)$",
    )


class IndexOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    slug: str
    description: str | None
    status: str
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime