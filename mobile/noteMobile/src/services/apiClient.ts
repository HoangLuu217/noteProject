import { env } from '../config/env';
import { ApiError, ApiResponse } from '../types/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload: ApiResponse<T>;
  try {
    payload = JSON.parse(text) as ApiResponse<T>;
  } catch (err) {
    throw new ApiError(
      `Phản hồi từ server không hợp lệ (không phải JSON). HTTP Status: ${response.status}. Chi tiết: ${text.slice(0, 100)}`,
      response.status
    );
  }

  if (!response.ok || !payload.success) {
    throw new ApiError(payload.message || 'Request failed', response.status);
  }

  return payload.data as T;
}
