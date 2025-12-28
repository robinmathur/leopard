/**
 * Region API Service
 * API functions for region CRUD operations
 */
import { httpClient } from './httpClient';
import {
  Region,
  RegionCreateRequest,
  RegionUpdateRequest,
  RegionListParams,
  PaginatedResponse,
} from '@/types/region';

/**
 * Region API endpoints
 */
export const regionApi = {
  /**
   * List regions with optional filtering and pagination
   * @param params - Query parameters for filtering
   * @param signal - Optional AbortSignal to cancel the request
   */
  async list(params?: RegionListParams, signal?: AbortSignal): Promise<PaginatedResponse<Region>> {
    const response = await httpClient.get<PaginatedResponse<Region>>('/v1/regions/', {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Get a single region by ID
   * @param id - Region ID
   * @param signal - Optional AbortSignal to cancel the request
   */
  async getById(id: number, signal?: AbortSignal): Promise<Region> {
    const response = await httpClient.get<Region>(`/v1/regions/${id}/`, { signal });
    return response.data;
  },

  /**
   * Create a new region
   */
  async create(data: RegionCreateRequest): Promise<Region> {
    const response = await httpClient.post<Region>('/v1/regions/', data);
    return response.data;
  },

  /**
   * Update an existing region (partial update)
   */
  async update(id: number, data: RegionUpdateRequest): Promise<Region> {
    const response = await httpClient.patch<Region>(`/v1/regions/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a region
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/v1/regions/${id}/`);
  },
};

export default regionApi;

