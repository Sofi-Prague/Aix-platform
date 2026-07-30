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
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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