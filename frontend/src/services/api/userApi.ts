/**
 * User API Service
 * API functions for user CRUD operations
 */
import httpClient from './httpClient';
import type {
  User,
  UserCreateRequest,
  UserUpdateRequest,
  UserListParams,
  PaginatedResponse,
  PermissionAssignmentRequest,
} from '@/types/user';

/**
 * User API endpoints
 */
export const userApi = {
  /**
   * List users with optional filtering and pagination
   */
  async list(params?: UserListParams): Promise<PaginatedResponse<User>> {
    const response = await httpClient.get<PaginatedResponse<User>>('/v1/users/', {
      params,
    });
    return response.data;
  },

  /**
   * Get a single user by ID
   */
  async getById(id: number): Promise<User> {
    const response = await httpClient.get<User>(`/v1/users/${id}/`);
    return response.data;
  },

  /**
   * Create a new user
   */
  async create(data: UserCreateRequest): Promise<User> {
    const response = await httpClient.post<User>('/v1/users/', data);
    return response.data;
  },

  /**
   * Update an existing user (partial update)
   */
  async update(id: number, data: UserUpdateRequest): Promise<User> {
    const response = await httpClient.patch<User>(`/v1/users/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a user
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/v1/users/${id}/`);
  },

  /**
   * Assign permissions directly to a user
   */
  async assignPermissions(id: number, data: PermissionAssignmentRequest): Promise<User> {
    const response = await httpClient.post<User>(`/v1/users/${id}/assign-permissions/`, data);
    return response.data;
  },

  /**
   * Get all active users (non-paginated)
   * Used for dropdowns and selectors
   */
  async getAllActiveUsers(): Promise<User[]> {
    const response = await httpClient.get<PaginatedResponse<User>>('/v1/users/', {
      params: { is_active: true, page_size: 1000 },
    });
    return response.data.results;
  },
};

export default userApi;

// Export User type for convenience
export type { User } from '@/types/user';
