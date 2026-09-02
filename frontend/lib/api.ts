import { getAccessToken } from "./auth";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type?: string;
};

export type User = {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  created_at?: string;
};

export type IndexRecord = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateIndexRequest = {
  name: string;
  slug: string;
  description?: string | null;
};

export type UpdateIndexRequest = {
  name?: string;
  slug?: string;
  description?: string | null;
  status?: "draft" | "archived";
};

export type DimensionRecord = {
  id: string;
  index_id: string;
  name: string;
  description: string | null;
  order_position: number;
  created_at: string;
};

export type CreateDimensionRequest = {
  name: string;
  description?: string | null;
  order_position?: number;
};

export type UpdateDimensionRequest = {
  name?: string;
  description?: string | null;
  order_position?: number;
};

export type DimensionSuggestion = {
  name: string;
  description: string;
  reasoning: string;
};

export type DimensionSuggestionResponse = {
  suggestions: DimensionSuggestion[];
};

export type IndicatorSuggestion = {
  name: string;
  description: string;
  unit: string | null;
  directionality:
    | "higher_is_better"
    | "lower_is_better"
    | null;
  reasoning: string;
};

export type IndicatorSuggestionResponse = {
  suggestions: IndicatorSuggestion[];
};

export type PublishChecklistItem = {
  key: string;
  label: string;
  passed: boolean;
  detail: string | null;
};

export type PublishValidationResponse = {
  index_slug: string;
  current_status: string;
  can_publish: boolean;
  checklist: PublishChecklistItem[];
};

export type PublishResponse = {
  index_slug: string;
  status: string;
  message: string;
};

export type PublicDataSourceRecord = {
  id: string;
  name: string;
  source_type: string;
  source_url: string | null;
  original_filename: string | null;
  imported_at: string;
  periods_covered: string[];
  entities_covered: string[];
  observation_count: number;
  last_updated: string;
};

export type PublicIndicatorRecord = {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  directionality:
    | "higher_is_better"
    | "lower_is_better"
    | null;
  order_position: number;
  weight: number;
  sources: PublicDataSourceRecord[];
};

export type PublicDimensionRecord = {
  id: string;
  name: string;
  description: string | null;
  order_position: number;
  weight: number;
  indicators: PublicIndicatorRecord[];
};

export type PublicResultRecord = {
  entity: string;
  rank: number;
  score: number;
};

export type PublicPeriodRecord = {
  period: string;
  results: PublicResultRecord[];
};

export type PublicIndexRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  updated_at: string;
  normalization_method: "min_max_0_1";
  weighting_method: WeightingMethod;
  periods: PublicPeriodRecord[];
  dimensions: PublicDimensionRecord[];
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const headers = new Headers(options.headers);

  const isFormData = options.body instanceof FormData;

  if (
    !isFormData &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as {
        detail?: string;
      };

      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Keep the fallback message when the response is not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(
  credentials: LoginRequest,
): Promise<TokenResponse> {
  return request<TokenResponse>("/identity/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function register(
  credentials: RegisterRequest,
): Promise<User> {
  return request<User>("/identity/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function getCurrentUser(): Promise<User> {
  return request<User>("/identity/me");
}

export function getIndexes(): Promise<IndexRecord[]> {
  return request<IndexRecord[]>("/indexes");
}

export function createIndex(
  payload: CreateIndexRequest,
): Promise<IndexRecord> {
  return request<IndexRecord>("/indexes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIndex(
  currentSlug: string,
  payload: UpdateIndexRequest,
): Promise<IndexRecord> {
  return request<IndexRecord>(
    `/indexes/${encodeURIComponent(currentSlug)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteIndex(slug: string): Promise<void> {
  await request<void>(
    `/indexes/${encodeURIComponent(slug)}`,
    {
      method: "DELETE",
    },
  );
}

export function getDimensions(
  indexSlug: string,
): Promise<DimensionRecord[]> {
  return request<DimensionRecord[]>(
    `/methodology/indexes/${encodeURIComponent(indexSlug)}/dimensions`,
  );
}

export function createDimension(
  indexSlug: string,
  payload: CreateDimensionRequest,
): Promise<DimensionRecord> {
  return request<DimensionRecord>(
    `/methodology/indexes/${encodeURIComponent(indexSlug)}/dimensions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateDimension(
  indexSlug: string,
  dimensionId: string,
  payload: UpdateDimensionRequest,
): Promise<DimensionRecord> {
  return request<DimensionRecord>(
    `/methodology/indexes/${encodeURIComponent(indexSlug)}/dimensions/${dimensionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteDimension(
  indexSlug: string,
  dimensionId: string,
): Promise<void> {
  await request<void>(
    `/methodology/indexes/${encodeURIComponent(indexSlug)}/dimensions/${dimensionId}`,
    {
      method: "DELETE",
    },
  );
}

export type IndicatorRecord = {
  id: string;
  dimension_id: string;
  name: string;
  description: string | null;
  unit: string | null;
  directionality:
    | "higher_is_better"
    | "lower_is_better"
    | null;
  status: "draft" | "ready";
  order_position: number;
  created_at: string;
};

export type CreateIndicatorRequest = {
  name: string;
  description?: string | null;
  unit?: string | null;
  directionality?:
    | "higher_is_better"
    | "lower_is_better"
    | null;
  status?: "draft" | "ready";
  order_position?: number;
};

export type UpdateIndicatorRequest = {
  name?: string;
  description?: string | null;
  unit?: string | null;
  directionality?:
    | "higher_is_better"
    | "lower_is_better"
    | null;
  status?: "draft" | "ready";
  order_position?: number;
};

export function getIndicators(
  indexSlug: string,
  dimensionId: string,
): Promise<IndicatorRecord[]> {
  return request<IndicatorRecord[]>(
    `/methodology/indexes/${encodeURIComponent(
      indexSlug,
    )}/dimensions/${encodeURIComponent(
      dimensionId,
    )}/indicators`,
  );
}

export function createIndicator(
  indexSlug: string,
  dimensionId: string,
  payload: CreateIndicatorRequest,
): Promise<IndicatorRecord> {
  return request<IndicatorRecord>(
    `/methodology/indexes/${encodeURIComponent(
      indexSlug,
    )}/dimensions/${dimensionId}/indicators`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateIndicator(
  indexSlug: string,
  dimensionId: string,
  indicatorId: string,
  payload: UpdateIndicatorRequest,
): Promise<IndicatorRecord> {
  return request<IndicatorRecord>(
    `/methodology/indexes/${encodeURIComponent(
      indexSlug,
    )}/dimensions/${dimensionId}/indicators/${indicatorId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteIndicator(
  indexSlug: string,
  dimensionId: string,
  indicatorId: string,
): Promise<void> {
  await request<void>(
    `/methodology/indexes/${encodeURIComponent(
      indexSlug,
    )}/dimensions/${dimensionId}/indicators/${indicatorId}`,
    {
      method: "DELETE",
    },
  ); 
}

function dataSourcesPath(
  indexSlug: string,
  dimensionId: string,
  indicatorId: string,
): string {
  return (
    `/data/indexes/${encodeURIComponent(
      indexSlug,
    )}` +
    `/dimensions/${encodeURIComponent(
      dimensionId,
    )}` +
    `/indicators/${encodeURIComponent(
      indicatorId,
    )}` +
    "/sources"
  );
}


export function getDataSources(
  indexSlug: string,
  dimensionId: string,
  indicatorId: string,
): Promise<DataSourceRecord[]> {
  return request<DataSourceRecord[]>(
    dataSourcesPath(
      indexSlug,
      dimensionId,
      indicatorId,
    ),
  );
}


export function getDataSource(
  indexSlug: string,
  dimensionId: string,
  indicatorId: string,
  sourceId: string,
): Promise<DataSourceDetailRecord> {
  return request<DataSourceDetailRecord>(
    `${dataSourcesPath(
      indexSlug,
      dimensionId,
      indicatorId,
    )}/${encodeURIComponent(sourceId)}`,
  );
}


export function uploadDataSourceCsv(
  indexSlug: string,
  dimensionId: string,
  indicatorId: string,
  payload: {
    name: string;
    sourceUrl?: string;
    file: File;
  },
): Promise<CSVUploadResponse> {
  const formData = new FormData();

  formData.append(
    "name",
    payload.name,
  );

  if (payload.sourceUrl?.trim()) {
    formData.append(
      "source_url",
      payload.sourceUrl.trim(),
    );
  }

  formData.append(
    "file",
    payload.file,
  );

  return request<CSVUploadResponse>(
    `${dataSourcesPath(
      indexSlug,
      dimensionId,
      indicatorId,
    )}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
}


export async function deleteDataSource(
  indexSlug: string,
  dimensionId: string,
  indicatorId: string,
  sourceId: string,
): Promise<void> {
  await request<void>(
    `${dataSourcesPath(
      indexSlug,
      dimensionId,
      indicatorId,
    )}/${encodeURIComponent(sourceId)}`,
    {
      method: "DELETE",
    },
  );
}

export function getNormalizedData(
  indexSlug: string,
  dimensionId: string,
  indicatorId: string,
): Promise<NormalizationResponse> {
  return request<NormalizationResponse>(
    `/data/indexes/${encodeURIComponent(
      indexSlug,
    )}/dimensions/${encodeURIComponent(
      dimensionId,
    )}/indicators/${encodeURIComponent(
      indicatorId,
    )}/normalize`,
  );
}

export function suggestDimensions(
  indexSlug: string,
): Promise<DimensionSuggestionResponse> {
  return request<DimensionSuggestionResponse>(
    `/copilot/indexes/${encodeURIComponent(
      indexSlug,
    )}/suggest-dimensions`,
    {
      method: "POST",
    },
  );
}

export function suggestIndicators(
  indexSlug: string,
  dimensionId: string,
): Promise<IndicatorSuggestionResponse> {
  return request<IndicatorSuggestionResponse>(
    `/copilot/indexes/${encodeURIComponent(
      indexSlug,
    )}/dimensions/${encodeURIComponent(
      dimensionId,
    )}/suggest-indicators`,
    {
      method: "POST",
    },
  );
}

export function validateIndexForPublish(
  indexSlug: string,
): Promise<PublishValidationResponse> {
  return request<PublishValidationResponse>(
    `/publish/indexes/${encodeURIComponent(
      indexSlug,
    )}/validate`,
  );
}

export function publishIndex(
  indexSlug: string,
): Promise<PublishResponse> {
  return request<PublishResponse>(
    `/publish/indexes/${encodeURIComponent(
      indexSlug,
    )}`,
    {
      method: "POST",
    },
  );
}

export async function getPublishedIndex(
  indexSlug: string,
): Promise<PublicIndexRecord> {
  const response = await fetch(
    `${API_URL}/publish/indexes/${encodeURIComponent(
      indexSlug,
    )}/public`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    let message = "Published index not found";

    try {
      const body = (await response.json()) as {
        detail?: string;
      };

      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Keep fallback.
    }

    throw new Error(message);
  }

  return response.json() as Promise<PublicIndexRecord>;
}

export type DataPointRecord = {
  id: string;
  data_source_id: string;
  indicator_id: string;
  entity: string;
  period: string;
  value: number;
  created_at: string;
};

export type DataSourceRecord = {
  id: string;
  indicator_id: string;
  name: string;
  source_type: string;
  source_url: string | null;
  original_filename: string | null;
  created_at: string;
};

export type DataSourceDetailRecord =
  DataSourceRecord & {
    data_points: DataPointRecord[];
    observation_count: number;
    periods_covered: string[];
    entities_covered: string[];
    last_updated: string;
  };

export type CSVUploadResponse = {
  data_source: DataSourceRecord;
  rows_imported: number;
};

export type NormalizedDataPointRecord = {
  entity: string;
  period: string;
  raw_value: number;
  normalized_value: number;
};

export type NormalizationPeriodSummary = {
  period: string;
  minimum: number;
  maximum: number;
};

export type NormalizationResponse = {
  indicator_id: string;
  indicator_name: string;
  directionality:
    | "higher_is_better"
    | "lower_is_better";
  periods: NormalizationPeriodSummary[];
  data_points: NormalizedDataPointRecord[];
};

export type WeightingMethod =
  | "equal"
  | "custom";

export type WeightItem = {
  id: string;
  weight: number;
};

export type WeightingConfigRecord = {
  id: string;
  index_id: string;
  method: WeightingMethod;
  config: {
    dimension_weights?: Record<
      string,
      number
    >;
    indicator_weights?: Record<
      string,
      number
    >;
  };
  created_at: string;
};

export type SaveWeightingRequest = {
  method: WeightingMethod;
  dimension_weights: WeightItem[];
  indicator_weights: WeightItem[];
};

export function getWeighting(
  indexSlug: string,
): Promise<WeightingConfigRecord | null> {
  return request<
    WeightingConfigRecord | null
  >(
    `/methodology/indexes/${encodeURIComponent(
      indexSlug,
    )}/weighting`,
  );
}

export function saveWeighting(
  indexSlug: string,
  payload: SaveWeightingRequest,
): Promise<WeightingConfigRecord> {
  return request<WeightingConfigRecord>(
    `/methodology/indexes/${encodeURIComponent(
      indexSlug,
    )}/weighting`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export type CalculatedIndicatorRecord = {
  indicator_id: string;
  indicator_name: string;
  raw_value: number;
  normalized_value: number;
  weight: number;
  weighted_score: number;
};

export type CalculatedDimensionRecord = {
  dimension_id: string;
  dimension_name: string;
  weight: number;
  score: number;
  weighted_score: number;
  indicators: CalculatedIndicatorRecord[];
};

export type CalculatedEntityRecord = {
  entity: string;
  rank: number;
  score: number;
  dimensions: CalculatedDimensionRecord[];
};

export type CalculatedPeriodRecord = {
  period: string;
  results: CalculatedEntityRecord[];
};

export type IndexCalculationResponse = {
  index_slug: string;
  index_name: string;
  weighting_method: WeightingMethod;
  periods: CalculatedPeriodRecord[];
};

export function calculateIndex(
  indexSlug: string,
): Promise<IndexCalculationResponse> {
  return request<IndexCalculationResponse>(
    `/calculation/indexes/${encodeURIComponent(
      indexSlug,
    )}`,
  );
}