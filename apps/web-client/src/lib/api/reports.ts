import { apiClient } from './client';

export interface CreateReviewReportRequest {
  review_id: string;
  reason: string;
  description?: string;
}

export interface CreateVenueReportRequest {
  venue_id: string;
  reason: string;
  description?: string;
}

export async function reportReview(body: CreateReviewReportRequest) {
  const { data } = await apiClient.post('/reports', body);
  return data;
}

export async function reportVenue(body: CreateVenueReportRequest) {
  const { data } = await apiClient.post('/venue-reports', body);
  return data;
}
