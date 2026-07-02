import { env } from '../config/env';
import { ApiError, ApiResponse } from '../types/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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
    if (response.status === 401 && path !== '/auth/refresh' && path !== '/auth/firebase-login') {
      try {
        const { useAuthStore } = require('../stores/authStore');
        const refreshed = await useAuthStore.getState().refreshSession();
        if (refreshed) {
          const newToken = useAuthStore.getState().accessToken;
          const retryHeaders = { ...headers };
          if (newToken) {
            retryHeaders.Authorization = `Bearer ${newToken}`;
          }
          const retryResponse = await fetch(`${env.apiUrl}${path}`, {
            method,
            headers: retryHeaders,
            body: body ? JSON.stringify(body) : undefined,
          });
          const retryText = await retryResponse.text();
          let retryPayload: ApiResponse<T>;
          try {
            retryPayload = JSON.parse(retryText) as ApiResponse<T>;
          } catch (err) {
            throw new ApiError(
              `Phản hồi từ server không hợp lệ sau khi thử lại (không phải JSON). HTTP Status: ${retryResponse.status}. Chi tiết: ${retryText.slice(0, 100)}`,
              retryResponse.status
            );
          }
          if (retryResponse.ok && retryPayload.success) {
            return retryPayload.data as T;
          }
        }
      } catch (refreshErr) {
        console.error('Tự động làm mới session thất bại:', refreshErr);
      }
    }
    throw new ApiError(payload.message || 'Request failed', response.status);
  }

  return payload.data as T;
}
