/**
 * User API Client
 * Handles all user-related API operations
 */
import httpClient from './httpClient';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  primary_group: string | null;
  groups_list: string[];
  tenant: number | null;
  tenant_name: string | null;
  is_active: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Get all users (paginated)
 * Returns users based on the requesting user's role and scope
 */
export const getUsers = async (params?: {
  role?: string;
  email?: string;
  branch_id?: number;
  region_id?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<User>> => {
  const response = await httpClient.get<PaginatedResponse<User>>('/v1/users/', { params });
  return response.data;
};

/**
 * Get all active users (unpaginated, for dropdowns)
 * Fetches all pages and returns flat list
 */
export const getAllActiveUsers = async (): Promise<User[]> => {
  const allUsers: User[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await getUsers({ is_active: true, page, page_size: 100 });
    allUsers.push(...response.results);
    hasMore = response.next !== null;
    page++;
  }

  return allUsers.sort((a, b) => a.full_name.localeCompare(b.full_name));
};

/**
 * Get a specific user by ID
 */
export const getUser = async (userId: number): Promise<User> => {
  const response = await httpClient.get<User>(`/v1/users/${userId}/`);
  return response.data;
};

/**
 * Get current user profile and permissions
 */
export const getCurrentUserProfile = async (): Promise<User & { permissions: Array<{ codename: string; name: string; content_type: string }> }> => {
  const response = await httpClient.get('/v1/users/profile/');
  return response.data;
};
