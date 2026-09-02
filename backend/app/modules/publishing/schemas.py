from pydantic import BaseModel


class PublishChecklistItem(BaseModel):
    key: str
    label: str
    passed: bool
    detail: str | None = None


class PublishValidationResponse(BaseModel):
    index_slug: str
    current_status: str
    can_publish: bool
    checklist: list[PublishChecklistItem]


class PublishResponse(BaseModel):
    index_slug: str
    status: str
    message: str


# ------------------------------------------------------------------
# Public published-index presentation
# ------------------------------------------------------------------


class PublicIndicatorOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    unit: str | None = None
    directionality: str | None = None
    order_position: int


class PublicDimensionOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    order_position: int
    indicators: list[PublicIndicatorOut]


class PublicResultOut(BaseModel):
    entity: str
    rank: int
    score: float


class PublicPeriodOut(BaseModel):
    period: str
    results: list[PublicResultOut]


class PublicIndexOut(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    status: str
    normalization_method: str
    weighting_method: str
    periods: list[PublicPeriodOut]
    dimensions: list[PublicDimensionOut]
