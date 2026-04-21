import { getAccessToken } from './auth-storage';

const FALLBACK_BASE_URL = 'https://gogos-backend-review.onrender.com/api/';

function getBaseUrl() {
  const base =
    process.env.EXPO_PUBLIC_BASE_URL ??
    process.env.BASE_URL ??
    FALLBACK_BASE_URL;

  return base.endsWith('/') ? base : `${base}/`;
}

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);

  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const rawText = await response.text();
  const result = rawText ? (JSON.parse(rawText) as ApiResponse<T>) : null;

  if (!response.ok || !result?.success) {
    throw new Error(result?.message ?? 'Request failed');
  }

  return result.data as T;
}

export async function apiFetch<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export async function apiPost<TPayload, TResult = void>(
  path: string,
  payload: TPayload,
): Promise<TResult> {
  return apiRequest<TResult>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
