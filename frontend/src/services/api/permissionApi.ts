/**
 * Permission API Service
 * API functions for permission read operations (permissions are read-only)
 */
import httpClient from './httpClient';
import type { UserPermission, PaginatedResponse } from '@/types/user';

/**
 * Permission API endpoints
 */
export const permissionApi = {
  /**
   * List all permissions
   */
  async list(params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<UserPermission>> {
    const response = await httpClient.get<PaginatedResponse<UserPermission>>('/v1/permissions/', {
      params,
    });
    return response.data;
  },

  /**
   * Get a single permission by ID
   */
  async getById(id: number): Promise<UserPermission> {
    const response = await httpClient.get<UserPermission>(`/v1/permissions/${id}/`);
    return response.data;
  },
};

export default permissionApi;

