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
  | 'view_client'
  | 'add_client'
  | 'change_client'
  | 'delete_client'
  | 'view_contact_info'
  | 'view_client_documents'
  
  // Visa Application permissions
  | 'view_visaapplication'
  | 'add_visaapplication'
  | 'change_visaapplication'
  | 'delete_visaapplication'
  | 'submit_visaapplication'

  // College Application permissions
  | 'view_collegeapplication'
  | 'add_collegeapplication'
  | 'change_collegeapplication'
  | 'delete_collegeapplication'

  // Application Type permissions
  | 'view_applicationtype'
  | 'add_applicationtype'
  | 'change_applicationtype'
  | 'delete_applicationtype'

  // Institute permissions
  | 'view_institute'
  | 'add_institute'
  | 'change_institute'
  | 'delete_institute'
  
  // Agent permissions (Admin only)
  | 'view_agent'
  | 'add_agent'
  | 'change_agent'
  | 'delete_agent'
  | 'manage_permissions'
  
  // Financial permissions
  | 'view_finance'
  | 'change_finance'
  | 'approve_payments'
  
  // Branch permissions
  | 'view_branch'
  | 'add_branch'
  | 'change_branch'
  | 'delete_branch'
  
  // Region permissions
  | 'view_region'
  | 'add_region'
  | 'change_region'
  | 'delete_region'
  
  // Dashboard permissions
  | 'view_dashboard'
  | 'view_analytics'
  | 'export_data'
  
  // Note permissions
  | 'add_note'
  | 'change_note'
  | 'delete_note'
  | 'view_note'

  // Course Level permission
  | 'add_courselevel'
  | 'change_courselevel'
  | 'delete_courselevel'
  | 'view_courselevel'

  // Narrow Field permission
  | 'add_narrowfield'
  | 'change_narrowfield'
  | 'delete_narrowfield'
  | 'view_narrowfield'

  // Institute Contact Person Permission
  | 'add_institutecontactperson'
  | 'change_institutecontactperson'
  | 'delete_institutecontactperson'
  | 'view_institutecontactperson'

  // Institute Requirement permission
  | 'add_instituterequirement'
  | 'change_instituterequirement'
  | 'delete_instituterequirement'
  | 'view_instituterequirement'

  // Institute Location permission
  | 'add_institutelocation'
  | 'change_institutelocation'
  | 'delete_institutelocation'
  | 'view_institutelocation'

  // Course permission
  | 'add_course'
  | 'change_course'
  | 'delete_course'
  | 'view_course'

  // Broad Field permission
  | 'add_broadfield'
  | 'change_broadfield'
  | 'delete_broadfield'
  | 'view_broadfield'

  // Institute Intake permission
  | 'add_instituteintake'
  | 'change_instituteintake'
  | 'delete_instituteintake'
  | 'view_instituteintake'
  
  // User management permissions
  | 'view_user'
  | 'add_user'
  | 'change_user'
  | 'delete_user'
  
  // Group management permissions
  | 'view_group'
  | 'add_group'
  | 'change_group'
  | 'delete_group'
  
  // Permission management permissions
  | 'view_permission'
  | 'add_permission'
  | 'change_permission'
  | 'delete_permission'

  // Reminder permissions
  | 'view_reminder'
  | 'add_reminder'
  | 'change_reminder'
  | 'delete_reminder'

  // Application Stage permission
  | 'add_stage'
  | 'change_stage'
  | 'delete_stage'
  | 'view_stage'


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
  username: string;
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
 * Mock user for development/demo
 */
export const MOCK_USERS: Record<string, User> = {
  admin: {
    id: '1',
    username: 'admin_global_imm',
    email: 'admin@immigrationcrm.com',
    firstName: 'Tenant',
    lastName: 'Admin',
    role: 'super_admin',
    tenantId: 'tenant-7',
    permissions: [],
    createdAt: new Date().toISOString(),
  },
  manager: {
    id: '2',
    username: 'branch_1',
    email: 'branch.1@globalimmigration.com',
    firstName: 'Branch',
    lastName: 'Administrator',
    role: 'branch_manager',
    branchId: 'branch-1',
    tenantId: 'tenant-1',
    permissions: [],
    createdAt: new Date().toISOString(),
  },
  agent: {
    id: '3',
    username: 'consultant_33_2',
    email: 'agent@immigrationcrm.com',
    firstName: 'Consultant',
    lastName: '33',
    role: 'agent',
    branchId: 'branch-1',
    tenantId: 'tenant-1',
    permissions: [],
    createdAt: new Date().toISOString(),
  },
};

