/**
 * Branch API Service
 * API functions for branch CRUD operations
 */
import { httpClient } from './httpClient';
import type { PaginatedResponse } from '@/types/common';
import {
  Branch,
  BranchCreateRequest,
  BranchUpdateRequest,
  BranchListParams,
} from '@/types/branch';

/**
 * Branch API endpoints
 */
export const branchApi = {
  /**
   * List branches with optional filtering and pagination
   * @param params - Query parameters for filtering
   * @param signal - Optional AbortSignal to cancel the request
   */
  async list(params?: BranchListParams, signal?: AbortSignal): Promise<PaginatedResponse<Branch>> {
    const response = await httpClient.get<PaginatedResponse<Branch>>('/v1/branches/', {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Get a single branch by ID
   * @param id - Branch ID
   * @param signal - Optional AbortSignal to cancel the request
   */
  async getById(id: number, signal?: AbortSignal): Promise<Branch> {
    const response = await httpClient.get<Branch>(`/v1/branches/${id}/`, { signal });
    return response.data;
  },

  /**
   * Create a new branch
   */
  async create(data: BranchCreateRequest): Promise<Branch> {
    const response = await httpClient.post<Branch>('/v1/branches/', data);
    return response.data;
  },

  /**
   * Update an existing branch (partial update)
   */
  async update(id: number, data: BranchUpdateRequest): Promise<Branch> {
    const response = await httpClient.patch<Branch>(`/v1/branches/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a branch (soft delete)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/v1/branches/${id}/`);
  },

  /**
   * Restore a soft-deleted branch
   */
  async restore(id: number): Promise<Branch> {
    const response = await httpClient.post<Branch>(`/v1/branches/${id}/restore/`);
    return response.data;
  },
};

export default branchApi;

