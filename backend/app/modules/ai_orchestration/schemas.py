from pydantic import BaseModel, Field


class DimensionSuggestion(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    reasoning: str = Field(min_length=1, max_length=2000)


class DimensionSuggestionResponse(BaseModel):
    suggestions: list[DimensionSuggestion]


class IndicatorSuggestion(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    unit: str | None = Field(default=None, max_length=100)
    directionality: str | None = Field(
        default=None,
        pattern=r"^(higher_is_better|lower_is_better)$",
    )
    reasoning: str = Field(min_length=1, max_length=2000)


class IndicatorSuggestionResponse(BaseModel):
    suggestions: list[IndicatorSuggestion]