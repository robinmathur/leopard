/**
 * User Management Types
 */

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  groups_list: string[];
  groups_list_display?: string[];
  primary_group: string | null;
  primary_group_display?: string | null;
  tenant: number | null;
  tenant_name: string | null;
  branches_data: Array<{ id: number; name: string }>;
  regions_data: Array<{ id: number; name: string }>;
  user_permissions_list?: Array<{ id: number; name: string; content_type: string }>;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  group_name: string;
  tenant_id?: number | null;
  branch_ids?: number[];
  region_ids?: number[];
  is_active?: boolean;
}

export interface UserUpdateRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  group_name?: string;
  tenant_id?: number | null;
  branch_ids?: number[];
  region_ids?: number[];
  is_active?: boolean;
}

export interface UserListParams {
  search?: string;
  group?: string;
  email?: string;
  branch_id?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Group {
  id: number;
  name: string;
  display_name?: string;
  permissions_list?: UserPermission[];
  permissions_count?: number;
  users_count?: number;
}

export interface GroupOption {
  id: number;
  name: string;
  display_name: string;
}

export interface UserPermission {
  id: number;
  name: string;
  codename: string;
  content_type: string;
  content_type_display?: string;
}

export interface GroupCreateRequest {
  name: string;
  permission_ids?: number[];
}

export interface GroupUpdateRequest {
  name?: string;
  permission_ids?: number[];
}

export interface PermissionAssignmentRequest {
  permission_ids: number[];
}

