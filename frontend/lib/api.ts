import { getAccessToken } from "./auth";

const API_URL =  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type LoginRequest = {
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
  status?: "draft" | "published" | "archived";
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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
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
      // Keep the default error message when the response is not JSON.
    }

    throw new Error(message);
  }

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
      // Keep the fallback message.
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