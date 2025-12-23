/**
 * Timeline API Client
 * Handles timeline/activity-related API operations
 */
import httpClient from './httpClient';

export interface ClientActivity {
  id: number;
  client: number;
  activity_type: string;
  activity_type_display: string;
  performed_by: number;
  performed_by_name: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TimelineListParams {
  activity_type?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Get timeline activities for a specific client
 */
export const getTimeline = async (
  clientId: number,
  params?: TimelineListParams,
  signal?: AbortSignal
): Promise<PaginatedResponse<ClientActivity>> => {
  const response = await httpClient.get<PaginatedResponse<ClientActivity>>(
    `/v1/clients/${clientId}/timeline/`,
    { params, signal }
  );
  return response.data;
};

export default {
  getTimeline,
};
