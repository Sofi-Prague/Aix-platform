import uuid

from pydantic import BaseModel


class CalculatedIndicatorOut(BaseModel):
    indicator_id: uuid.UUID
    indicator_name: str

    raw_value: float
    normalized_value: float

    weight: float
    weighted_score: float


class CalculatedDimensionOut(BaseModel):
    dimension_id: uuid.UUID
    dimension_name: str

    weight: float
    score: float
    weighted_score: float

    indicators: list[
        CalculatedIndicatorOut
    ]


class CalculatedEntityOut(BaseModel):
    entity: str
    rank: int
    score: float

    dimensions: list[
        CalculatedDimensionOut
    ]


class CalculatedPeriodOut(BaseModel):
    period: str

    results: list[
        CalculatedEntityOut
    ]


class IndexCalculationResponse(BaseModel):
    index_slug: str
    index_name: str
    weighting_method: str

    periods: list[
        CalculatedPeriodOut
    ]