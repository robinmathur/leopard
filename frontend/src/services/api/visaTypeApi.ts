/**
 * Visa Type API Client
 * Handles all visa type-related API operations
 */
import httpClient from './httpClient';
import {
  VisaType,
  VisaTypeCreateRequest,
  VisaTypeUpdateRequest,
  VisaCategory,
  VisaApplicationStatusCounts,
  VisaDashboardStatistics,
} from '@/types/visaType';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Get all visa types with optional filtering
 */
export const getVisaTypes = async (params?: {
  visa_category_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<VisaType>> => {
  const response = await httpClient.get<PaginatedResponse<VisaType>>(
    '/v1/visa-types/',
    { params }
  );
  return response.data;
};

/**
 * Get a specific visa type by ID
 */
export const getVisaType = async (id: number): Promise<VisaType> => {
  const response = await httpClient.get<VisaType>(`/v1/visa-types/${id}/`);
  return response.data;
};

/**
 * Create a new visa type
 */
export const createVisaType = async (data: VisaTypeCreateRequest): Promise<VisaType> => {
  const response = await httpClient.post<VisaType>('/v1/visa-types/', data);
  return response.data;
};

/**
 * Update a visa type
 */
export const updateVisaType = async (
  id: number,
  data: VisaTypeUpdateRequest
): Promise<VisaType> => {
  const response = await httpClient.patch<VisaType>(`/v1/visa-types/${id}/`, data);
  return response.data;
};

/**
 * Delete a visa type
 */
export const deleteVisaType = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/visa-types/${id}/`);
};

/**
 * Get all visa categories
 */
export const getVisaCategories = async (): Promise<VisaCategory[]> => {
  const response = await httpClient.get<VisaCategory[]>('/v1/visa-categories/');
  return response.data;
};

/**
 * Get visa application status counts for tabs
 */
export const getVisaApplicationStatusCounts = async (): Promise<VisaApplicationStatusCounts> => {
  const response = await httpClient.get<VisaApplicationStatusCounts>(
    '/v1/visa-applications/status-counts/'
  );
  return response.data;
};

/**
 * Get visa application dashboard statistics
 */
export const getVisaDashboardStatistics = async (): Promise<VisaDashboardStatistics> => {
  const response = await httpClient.get<VisaDashboardStatistics>(
    '/v1/visa-applications/dashboard-statistics/'
  );
  return response.data;
};

export default {
  getVisaTypes,
  getVisaType,
  createVisaType,
  updateVisaType,
  deleteVisaType,
  getVisaCategories,
  getVisaApplicationStatusCounts,
  getVisaDashboardStatistics,
};
