import uuid
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class WeightItem(BaseModel):
    id: uuid.UUID
    weight: float = Field(
        ge=0,
        le=1,
    )


class WeightingConfigUpdate(BaseModel):
    method: str = Field(
        pattern=r"^(equal|custom)$",
    )

    dimension_weights: list[WeightItem] = []
    indicator_weights: list[WeightItem] = []


class WeightingConfigOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    index_id: uuid.UUID
    method: str
    config: dict
    created_at: datetime