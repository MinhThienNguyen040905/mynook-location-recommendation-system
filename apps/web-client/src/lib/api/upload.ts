import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';

export interface UploadResult {
  url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

/**
 * Upload media files (images/videos) to Cloudinary via API Gateway.
 * Returns an array of upload results with secure URLs.
 */
export async function uploadMedia(files: File[]): Promise<UploadResult[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const { data } = await apiClient.post<UploadResult[]>(
    API_ENDPOINTS.UPLOAD,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min for large uploads
    },
  );

  return data;
}
