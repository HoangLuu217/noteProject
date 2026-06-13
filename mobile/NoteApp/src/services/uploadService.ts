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

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new ApiError(payload.message || 'Request failed', response.status);
  }

  return payload.data as T;
}

export type UploadAvatarResponse = {
  url: string;
  publicId: string;
};

export async function uploadAvatarImage(
  accessToken: string,
  imageUri: string,
  mimeType = 'image/jpeg'
): Promise<UploadAvatarResponse> {
  const formData = new FormData();
  const extension = mimeType.split('/')[1] || 'jpg';

  formData.append('image', {
    uri: imageUri,
    name: `avatar.${extension}`,
    type: mimeType,
  } as unknown as Blob);

  const response = await fetch(`${env.apiUrl}/upload/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const payload = (await response.json()) as ApiResponse<UploadAvatarResponse>;

  if (!response.ok || !payload.success) {
    throw new ApiError(payload.message || 'Upload failed', response.status);
  }

  return payload.data as UploadAvatarResponse;
}
