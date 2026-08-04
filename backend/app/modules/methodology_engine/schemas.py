import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DimensionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    order_position: int = Field(default=0, ge=0)


class DimensionUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    order_position: int | None = Field(default=None, ge=0)


class DimensionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    index_id: uuid.UUID
    name: str
    description: str | None
    order_position: int
    created_at: datetime

class IndicatorCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    unit: str | None = Field(
        default=None,
        max_length=100,
    )

    directionality: str | None = Field(
        default=None,
        pattern=r"^(higher_is_better|lower_is_better)$",
    )

    status: str = Field(
        default="draft",
        pattern=r"^(draft|ready)$",
    )

    order_position: int = Field(
        default=0,
        ge=0,
    )


class IndicatorUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    unit: str | None = Field(
        default=None,
        max_length=100,
    )

    directionality: str | None = Field(
        default=None,
        pattern=r"^(higher_is_better|lower_is_better)$",
    )

    status: str | None = Field(
        default=None,
        pattern=r"^(draft|ready)$",
    )

    order_position: int | None = Field(
        default=None,
        ge=0,
    )


class IndicatorOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    dimension_id: uuid.UUID
    name: str
    description: str | None
    unit: str | None
    directionality: str | None
    status: str
    order_position: int
    created_at: datetime