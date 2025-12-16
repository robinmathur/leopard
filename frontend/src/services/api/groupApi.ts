/**
 * Group API Service
 * API functions for group CRUD operations
 */
import httpClient from './httpClient';
import type {
  Group,
  GroupCreateRequest,
  GroupUpdateRequest,
  PaginatedResponse,
  PermissionAssignmentRequest,
} from '@/types/user';

/**
 * Group API endpoints
 */
export const groupApi = {
  /**
   * List all groups
   */
  async list(params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Group>> {
    const response = await httpClient.get<PaginatedResponse<Group>>('/v1/groups/', {
      params,
    });
    return response.data;
  },

  /**
   * Get a single group by ID
   */
  async getById(id: number): Promise<Group> {
    const response = await httpClient.get<Group>(`/v1/groups/${id}/`);
    return response.data;
  },

  /**
   * Create a new group
   */
  async create(data: GroupCreateRequest): Promise<Group> {
    const response = await httpClient.post<Group>('/v1/groups/', data);
    return response.data;
  },

  /**
   * Update an existing group (partial update)
   */
  async update(id: number, data: GroupUpdateRequest): Promise<Group> {
    const response = await httpClient.patch<Group>(`/v1/groups/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a group
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/v1/groups/${id}/`);
  },

  /**
   * Assign permissions to a group
   */
  async assignPermissions(id: number, data: PermissionAssignmentRequest): Promise<Group> {
    const response = await httpClient.post<Group>(`/v1/groups/${id}/assign-permissions/`, data);
    return response.data;
  },
};

export default groupApi;

