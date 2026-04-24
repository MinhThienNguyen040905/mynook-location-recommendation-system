import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { AuthUser } from '@/types/auth';
import type { Venue } from '@/types/venue';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminAccount extends AuthUser {
  is_active: boolean;
  updated_at: string;
}

export interface AccountsStats {
  total: number;
  by_type: { customer: number; owner: number; admin: number };
  active: number;
  inactive: number;
  recent_30d: number;
}

export interface VenuesStats {
  total: number;
  active: number;
  inactive: number;
  community: number;
  top_hot: Array<{
    id: string;
    name: string;
    district: string | null;
    city: string | null;
    rating_avg: number;
    review_count: number;
    current_crowd_level?: string;
  }>;
  popular_areas: Array<{
    district_id?: string;
    district: string | null;
    city_id?: string;
    city: string | null;
    count: number;
    avg_rating?: number;
  }>;
}

export interface InteractionStats {
  total_reviews: number;
  reviews_recent_30d: number;
  total_favorites: number;
  unread_notifications: number;
  average_rating: number;
}

export interface ReportStats {
  total: number;
  pending: number;
  resolved_deleted: number;
  dismissed: number;
}

export interface VenueReportStats {
  total: number;
  pending: number;
  resolved_deactivated: number;
  dismissed: number;
}

export interface DashboardOverview {
  accounts: AccountsStats | { error: string };
  venues: VenuesStats | { error: string };
  interaction: InteractionStats | { error: string };
  review_reports: ReportStats | { error: string };
  venue_reports: VenueReportStats | { error: string };
  generated_at: string;
}

export interface ReviewReport {
  id: string;
  review_id: string;
  reporter_account_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'resolved_deleted' | 'dismissed';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  review?: {
    id: string;
    venue_id: string;
    account_id: string;
    rating: number;
    content: string | null;
  } | null;
}

export interface VenueReport {
  id: string;
  venue_id: string;
  reporter_account_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'resolved_deactivated' | 'dismissed';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AdminListResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardOverview> {
  const { data } = await apiClient.get<DashboardOverview>(API_ENDPOINTS.ADMIN.DASHBOARD);
  return data;
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export interface ListAccountsParams {
  type?: 'customer' | 'owner' | 'admin';
  is_active?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

export async function listAccounts(params?: ListAccountsParams): Promise<AdminListResponse<AdminAccount>> {
  const { data } = await apiClient.get<AdminListResponse<AdminAccount>>(
    API_ENDPOINTS.ADMIN.ACCOUNTS,
    { params },
  );
  return data;
}

export async function getAccountsStats(): Promise<AccountsStats> {
  const { data } = await apiClient.get<AccountsStats>(API_ENDPOINTS.ADMIN.ACCOUNTS_STATS);
  return data;
}

export async function setAccountStatus(id: string, is_active: boolean): Promise<AdminAccount> {
  const { data } = await apiClient.patch<AdminAccount>(
    API_ENDPOINTS.ADMIN.ACCOUNT_STATUS(id),
    { is_active },
  );
  return data;
}

// ─── Venues (admin) ──────────────────────────────────────────────────────────

export interface ListAdminVenuesParams {
  is_active?: boolean;
  city?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export async function listAdminVenues(
  params?: ListAdminVenuesParams,
): Promise<AdminListResponse<Venue>> {
  const { data } = await apiClient.get<AdminListResponse<Venue>>(
    API_ENDPOINTS.ADMIN.VENUES,
    { params },
  );
  return data;
}

export async function getVenuesStats(): Promise<VenuesStats> {
  const { data } = await apiClient.get<VenuesStats>(API_ENDPOINTS.ADMIN.VENUES_STATS);
  return data;
}

export async function adminCreateVenue(body: Partial<Venue>): Promise<Venue> {
  const { data } = await apiClient.post<Venue>(API_ENDPOINTS.ADMIN.VENUES, body);
  return data;
}

export async function adminUpdateVenue(id: string, body: Partial<Venue>): Promise<Venue> {
  const { data } = await apiClient.patch<Venue>(API_ENDPOINTS.ADMIN.VENUE_DETAIL(id), body);
  return data;
}

export async function adminSoftDeleteVenue(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.ADMIN.VENUE_DETAIL(id));
}

export async function adminRestoreVenue(id: string): Promise<Venue> {
  const { data } = await apiClient.patch<Venue>(API_ENDPOINTS.ADMIN.VENUE_RESTORE(id));
  return data;
}

export async function adminHardDeleteVenue(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.ADMIN.VENUE_HARD_DELETE(id));
}

// ─── Review reports ──────────────────────────────────────────────────────────

export interface ListReportsParams {
  status?: 'pending' | 'resolved_deleted' | 'dismissed';
  page?: number;
  limit?: number;
}

export async function listReviewReports(
  params?: ListReportsParams,
): Promise<AdminListResponse<ReviewReport>> {
  const { data } = await apiClient.get<AdminListResponse<ReviewReport>>(
    API_ENDPOINTS.ADMIN.REPORTS,
    { params },
  );
  return data;
}

export async function getReviewReportsStats(): Promise<ReportStats> {
  const { data } = await apiClient.get<ReportStats>(API_ENDPOINTS.ADMIN.REPORTS_STATS);
  return data;
}

export async function getReviewReport(id: string): Promise<ReviewReport> {
  const { data } = await apiClient.get<ReviewReport>(API_ENDPOINTS.ADMIN.REPORT_DETAIL(id));
  return data;
}

export async function resolveReviewReport(
  id: string,
  action: 'delete' | 'dismiss',
): Promise<ReviewReport> {
  const { data } = await apiClient.patch<ReviewReport>(
    API_ENDPOINTS.ADMIN.REPORT_RESOLVE(id),
    { action },
  );
  return data;
}

// ─── Venue reports ───────────────────────────────────────────────────────────

export interface ListVenueReportsParams {
  status?: 'pending' | 'resolved_deactivated' | 'dismissed';
  venue_id?: string;
  page?: number;
  limit?: number;
}

export async function listVenueReports(
  params?: ListVenueReportsParams,
): Promise<AdminListResponse<VenueReport>> {
  const { data } = await apiClient.get<AdminListResponse<VenueReport>>(
    API_ENDPOINTS.ADMIN.VENUE_REPORTS,
    { params },
  );
  return data;
}

export async function getVenueReportsStats(): Promise<VenueReportStats> {
  const { data } = await apiClient.get<VenueReportStats>(API_ENDPOINTS.ADMIN.VENUE_REPORTS_STATS);
  return data;
}

export async function resolveVenueReport(
  id: string,
  action: 'deactivate' | 'dismiss',
): Promise<{ deactivated_venue: boolean; venue_id?: string; reports_resolved?: number }> {
  const { data } = await apiClient.patch(
    API_ENDPOINTS.ADMIN.VENUE_REPORT_RESOLVE(id),
    { action },
  );
  return data;
}

// ─── Notification broadcast ──────────────────────────────────────────────────

export interface BroadcastPayload {
  target?: 'all' | 'customer' | 'owner';
  account_ids?: string[];
  title: string;
  message: string;
  type?: 'system' | 'promo' | 'reminder' | 'review_reply';
}

export interface BroadcastResponse {
  inserted?: number;
  total?: number;
  message?: string;
}

export async function broadcastNotification(
  payload: BroadcastPayload,
): Promise<BroadcastResponse> {
  const { data } = await apiClient.post<BroadcastResponse>(
    API_ENDPOINTS.ADMIN.NOTIFICATIONS_BROADCAST,
    payload,
  );
  return data;
}
