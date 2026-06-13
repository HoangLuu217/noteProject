import { env } from '../config/env';
import { ApiError, ApiResponse } from '../types/api';

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
  const extension = imageUri.split('.').pop() || 'jpg';

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

  const text = await response.text();
  let payload: ApiResponse<UploadAvatarResponse>;
  try {
    payload = JSON.parse(text) as ApiResponse<UploadAvatarResponse>;
  } catch (err) {
    throw new ApiError(
      `Phản hồi từ server không hợp lệ (không phải JSON). HTTP Status: ${response.status}. Chi tiết: ${text.slice(0, 100)}`,
      response.status
    );
  }

  if (!response.ok || !payload.success) {
    throw new ApiError(payload.message || 'Upload failed', response.status);
  }

  return payload.data as UploadAvatarResponse;
}
