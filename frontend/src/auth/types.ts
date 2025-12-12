/**
 * Authentication and Authorization Types
 * Defines user roles, permissions, and auth state
 */

export type UserRole = 'super_admin' | 'branch_manager' | 'agent' | 'intern';

/**
 * Granular permissions for RBAC
 * Format: resource_action or feature_access
 */
export type Permission =
  // Client permissions
  | 'view_clients'
  | 'create_client'
  | 'edit_client'
  | 'delete_client'
  | 'view_contact_info'
  | 'view_client_documents'
  
  // Lead permissions
  | 'view_leads'
  | 'create_lead'
  | 'edit_lead'
  | 'delete_lead'
  | 'assign_lead'
  
  // Visa Application permissions
  | 'view_applications'
  | 'create_application'
  | 'edit_application'
  | 'delete_application'
  | 'submit_application'
  
  // Institute permissions
  | 'view_institutes'
  | 'create_institute'
  | 'edit_institute'
  | 'delete_institute'
  
  // Agent permissions (Admin only)
  | 'view_agents'
  | 'create_agent'
  | 'edit_agent'
  | 'delete_agent'
  | 'manage_permissions'
  
  // Financial permissions
  | 'view_finance'
  | 'edit_finance'
  | 'approve_payments'
  
  // Branch permissions
  | 'view_branch_data'
  | 'manage_branch'
  | 'view_all_branches'
  
  // Dashboard permissions
  | 'view_dashboard'
  | 'view_analytics'
  | 'export_data';

/**
 * JWT Token pair for authentication
 */
export interface AuthTokens {
  access: string;
  refresh: string;
}

/**
 * User permission from backend API
 */
export interface UserPermission {
  codename: string;
  name: string;
  content_type: string;
}

/**
 * Branch data from profile endpoint
 */
export interface BranchData {
  id: number;
  name: string;
}

/**
 * Region data from profile endpoint
 */
export interface RegionData {
  id: number;
  name: string;
}


/**
 * Response from /api/v1/users/profile/ endpoint
 * Combines user profile data and permissions in a single response
 */
export interface ProfileResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  primary_group: string | null;
  groups_list: string[];
  tenant: number | null;
  tenant_name: string | null;
  branches_data: BranchData[];
  regions_data: RegionData[];
  is_active: boolean;
  permissions: UserPermission[];
}

/**
 * User profile with authentication details
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  branchId?: string;
  tenantId: string;
  tenantName?: string;
  avatar?: string;
  permissions: Permission[];
  branches?: BranchData[];
  regions?: RegionData[];
  groups?: string[];
  createdAt: string;
  lastLogin?: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Role-based permission sets
 * Define what each role can do by default
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    // Full access to everything
    'view_clients',
    'create_client',
    'edit_client',
    'delete_client',
    'view_contact_info',
    'view_client_documents',
    'view_leads',
    'create_lead',
    'edit_lead',
    'delete_lead',
    'assign_lead',
    'view_applications',
    'create_application',
    'edit_application',
    'delete_application',
    'submit_application',
    'view_institutes',
    'create_institute',
    'edit_institute',
    'delete_institute',
    'view_agents',
    'create_agent',
    'edit_agent',
    'delete_agent',
    'manage_permissions',
    'view_finance',
    'edit_finance',
    'approve_payments',
    'view_branch_data',
    'manage_branch',
    'view_all_branches',
    'view_dashboard',
    'view_analytics',
    'export_data',
  ],
  branch_manager: [
    // Branch-level management
    'view_clients',
    'create_client',
    'edit_client',
    'view_contact_info',
    'view_client_documents',
    'view_leads',
    'create_lead',
    'edit_lead',
    'assign_lead',
    'view_applications',
    'create_application',
    'edit_application',
    'submit_application',
    'view_institutes',
    'view_agents',
    'view_finance',
    'edit_finance',
    'view_branch_data',
    'manage_branch',
    'view_dashboard',
    'view_analytics',
    'export_data',
  ],
  agent: [
    // Agent-level access
    'view_clients',
    'create_client',
    'edit_client',
    'view_contact_info',
    'view_client_documents',
    'view_leads',
    'create_lead',
    'edit_lead',
    'view_applications',
    'create_application',
    'edit_application',
    'submit_application',
    'view_institutes',
    'view_dashboard',
  ],
  intern: [
    // Read-only access
    'view_clients',
    'view_leads',
    'view_applications',
    'view_institutes',
    'view_dashboard',
  ],
};

/**
 * Mock user for development/demo
 */
export const MOCK_USERS: Record<string, User> = {
  admin: {
    id: '1',
    email: 'admin@immigrationcrm.com',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'super_admin',
    tenantId: 'tenant-1',
    permissions: ROLE_PERMISSIONS.super_admin,
    createdAt: new Date().toISOString(),
  },
  manager: {
    id: '2',
    email: 'branch_106@a.com',
    firstName: 'Branch',
    lastName: 'Manager',
    role: 'branch_manager',
    branchId: 'branch-1',
    tenantId: 'tenant-1',
    permissions: ROLE_PERMISSIONS.branch_manager,
    createdAt: new Date().toISOString(),
  },
  agent: {
    id: '3',
    email: 'agent@immigrationcrm.com',
    firstName: 'Jane',
    lastName: 'Agent',
    role: 'agent',
    branchId: 'branch-1',
    tenantId: 'tenant-1',
    permissions: ROLE_PERMISSIONS.agent,
    createdAt: new Date().toISOString(),
  },
  intern: {
    id: '4',
    email: 'intern@immigrationcrm.com',
    firstName: 'John',
    lastName: 'Intern',
    role: 'intern',
    branchId: 'branch-1',
    tenantId: 'tenant-1',
    permissions: ROLE_PERMISSIONS.intern,
    createdAt: new Date().toISOString(),
  },
};

