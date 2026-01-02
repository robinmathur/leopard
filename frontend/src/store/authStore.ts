import { create } from 'zustand';
import { User, Permission, MOCK_USERS, AuthTokens } from '@/auth/types';
import { authApi } from '@/services/api/authApi';
import type { ApiError } from '@/services/api/httpClient';

/**
 * Authentication Store
 * Manages user authentication state and permissions using Zustand
 */
interface AuthStore {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  refreshToken: () => Promise<boolean>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  initializeFromStorage: () => void;
}

// Storage keys
const STORAGE_KEYS = {
  TOKENS: 'auth_tokens',
  USER: 'auth_user',
};

/**
 * Map backend permission codenames to frontend Permission type
 */
function mapPermissions(backendPermissions: Array<{ codename: string }>): Permission[] {
  const permissionMap: Record<string, Permission> = {
  };

  const mappedPermissions: Permission[] = [];
  
  for (const perm of backendPermissions) {
    const mapped = permissionMap[perm.codename];
    if (mapped) {
      mappedPermissions.push(mapped);
    }
    // Also check if the codename directly matches a Permission type
    if (isValidPermission(perm.codename)) {
      if (!mappedPermissions.includes(perm.codename as Permission)) {
        mappedPermissions.push(perm.codename as Permission);
      }
    }
  }
  
  // Add default view permissions
  if (!mappedPermissions.includes('view_dashboard')) {
    mappedPermissions.push('view_dashboard');
  }
  
  return mappedPermissions;
}

function isValidPermission(value: string): value is Permission {
  const validPermissions: Permission[] = [
    'view_client', 'add_client', 'change_client', 'delete_client',
    'view_contact_info', 'view_client_documents',
    'view_visaapplication', 'add_visaapplication', 'change_visaapplication',
    'delete_visaapplication', 'submit_visaapplication',
    'view_agent', 'add_agent', 'change_agent', 'delete_agent', 'manage_permissions',
    'view_finance', 'change_finance', 'approve_payments',
    'view_region', 'add_region', 'change_region', 'delete_region',
    'view_branch', 'add_branch', 'change_branch', 'delete_branch',
    'view_dashboard', 'view_analytics', 'export_data',
    'add_courselevel', 'change_courselevel', 'delete_courselevel', 'view_courselevel',
    'add_narrowfield', 'change_narrowfield', 'delete_narrowfield', 'view_narrowfield',
    'add_institutecontactperson', 'change_institutecontactperson', 'delete_institutecontactperson', 'view_institutecontactperson',
    'add_institute', 'change_institute', 'delete_institute', 'view_institute',
    'add_instituterequirement', 'change_instituterequirement', 'delete_instituterequirement', 'view_instituterequirement',
    'add_institutelocation', 'change_institutelocation', 'delete_institutelocation', 'view_institutelocation',
    'add_course', 'change_course', 'delete_course', 'view_course',
    'add_broadfield', 'change_broadfield', 'delete_broadfield', 'view_broadfield',
    'add_instituteintake', 'change_instituteintake', 'delete_instituteintake', 'view_instituteintake',
    'view_user', 'add_user', 'change_user', 'delete_user',
    'view_group', 'add_group', 'change_group', 'delete_group',
    'view_permission', 'add_permission', 'change_permission', 'delete_permission',
    'add_stage', 'change_stage', 'delete_stage', 'view_stage',
    'view_applicationtype', 'add_applicationtype', 'change_applicationtype', 'delete_applicationtype',
    'view_collegeapplication', 'add_collegeapplication', 'change_collegeapplication', 'delete_collegeapplication',
    'add_calendarevent', 'change_calendarevent', 'delete_calendarevent', 'view_calendarevent', 'view_team_events', 'assign_calendarevent_to_others'

  ];
  return validPermissions.includes(value as Permission);
}

/**
 * Map backend role to frontend UserRole
 */
function mapRoleToUserRole(backendRole: string): User['role'] {
  const roleMap: Record<string, User['role']> = {
    'SUPER_ADMIN': 'super_admin',
    'SUPER_SUPER_ADMIN': 'super_admin',
    'BRANCH_ADMIN': 'branch_manager',
    'BRANCH_MANAGER': 'branch_manager',
    'REGION_MANAGER': 'branch_manager',
    'CONSULTANT': 'agent',
    'AGENT': 'agent',
    'INTERN': 'intern',
  };

  return roleMap[backendRole.toUpperCase()] || 'intern';
}

/**
 * Login using real API - calls backend endpoints
 */
async function loginWithApi(
  username: string,
  password: string,
  set: (state: Partial<AuthStore>) => void
): Promise<void> {
  // Call login API
  const tokens = await authApi.login(username, password);

  // Store tokens
  localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));

  // Fetch user profile with permissions
  const profileResponse = await authApi.getProfile();

  // Map backend permissions to frontend Permission type
  const permissions = mapPermissions(profileResponse.permissions);

  // Create user object from profile response
  const user: User = {
    id: String(profileResponse.id),
    username: profileResponse.username,
    email: profileResponse.email,
    firstName: profileResponse.first_name || username.split('@')[0].split('.')[0] || 'User',
    lastName: profileResponse.last_name || '',
    role: mapRoleToUserRole(profileResponse.primary_group || ''),
    tenantId: profileResponse.tenant ? String(profileResponse.tenant) : 'tenant-1',
    tenantName: profileResponse.tenant_name || undefined,
    permissions,
    branches: profileResponse.branches_data,
    regions: profileResponse.regions_data,
    groups: profileResponse.groups_list,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  // Store user (permissions are included in user object)
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

  set({
    tokens,
    user,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });
}

/**
 * Login using mock data - for development/testing without backend
 */
async function loginWithMock(
  username: string,
  password: string,
  set: (state: Partial<AuthStore>) => void
): Promise<void> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const mockUser = Object.values(MOCK_USERS).find(u => u.username === username);

  if (!mockUser || password !== 'password123') {
    throw new Error('Invalid credentials');
  }

  // Create mock tokens
  const mockTokens: AuthTokens = {
    access: `mock_access_${Date.now()}`,
    refresh: `mock_refresh_${Date.now()}`,
  };

  // Store in localStorage (permissions are included in user object)
  localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(mockTokens));
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

  set({
    tokens: mockTokens,
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });
}

/**
 * Get initial auth state from localStorage
 * Called synchronously during store creation to support shareable URLs
 */
function getInitialAuthState(): Pick<AuthStore, 'user' | 'tokens' | 'isAuthenticated'> {
  try {
    const tokensStr = localStorage.getItem(STORAGE_KEYS.TOKENS);
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);

    if (tokensStr && userStr) {
      const tokens = JSON.parse(tokensStr) as AuthTokens;
      const user = JSON.parse(userStr) as User;

      return {
        tokens,
        user,
        isAuthenticated: true,
      };
    }
  } catch {
    // Clear invalid storage
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  return {
    user: null,
    tokens: null,
    isAuthenticated: false,
  };
}

// Get initial state synchronously
const initialAuthState = getInitialAuthState();

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: initialAuthState.user,
  tokens: initialAuthState.tokens,
  isAuthenticated: initialAuthState.isAuthenticated,
  isLoading: false,
  error: null,

  /**
   * Initialize auth state from localStorage
   */
  initializeFromStorage: () => {
    try {
      const tokensStr = localStorage.getItem(STORAGE_KEYS.TOKENS);
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);

      if (tokensStr && userStr) {
        const tokens = JSON.parse(tokensStr) as AuthTokens;
        const user = JSON.parse(userStr) as User;

        set({
          tokens,
          user,
          isAuthenticated: true,
        });
      }
    } catch {
      // Clear invalid storage
      localStorage.removeItem(STORAGE_KEYS.TOKENS);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },

  /**
   * Login with API - calls backend, stores tokens, fetches profile with permissions
   */
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      // Check if MSW/mock is enabled (development mode)
      const isMockEnabled = import.meta.env.VITE_ENABLE_MOCK === 'true';

      if (isMockEnabled) {
        // In mock mode: Try real API first, fallback to mock users if API fails
        try {
          await loginWithApi(username, password, set);
          return;
        } catch {
          // If API fails in dev/mock mode, fallback to mock users
          console.warn('API login failed, using mock users');
          await loginWithMock(username, password, set);
          return;
        }
      } else {
        // In production/non-mock mode: Only call real API, no fallback
        await loginWithApi(username, password, set);
      }
    } catch (error) {
      // Extract error message from ApiError or Error
      let errorMessage = 'Login failed';
      if (error && typeof error === 'object') {
        if ('message' in error && typeof (error as ApiError).message === 'string') {
          errorMessage = (error as ApiError).message;
          // Make the message more user-friendly for common cases
          if (errorMessage === 'Invalid credentials' || (error as ApiError).status === 401) {
            errorMessage = 'Invalid username or password. Please try again.';
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
      }

      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  /**
   * Logout - clear all auth state and localStorage
   */
  logout: () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
    localStorage.removeItem(STORAGE_KEYS.USER);

    // Clear state
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      error: null,
    });
  },

  /**
   * Set user directly (for testing/development)
   */
  setUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  /**
   * Set tokens directly
   */
  setTokens: (tokens: AuthTokens | null) => {
    if (tokens) {
      localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKENS);
    }
    set({ tokens });
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<boolean> => {
    const { tokens } = get();
    
    if (!tokens?.refresh) {
      return false;
    }
    
    try {
      const newTokens = await authApi.refreshToken(tokens.refresh);
      
      // Store new tokens
      localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(newTokens));
      
      set({ tokens: newTokens });
      
      return true;
    } catch {
      // Refresh failed - logout
      get().logout();
      return false;
    }
  },

  /**
   * Check if user has a specific permission
   */
  hasPermission: (permission: Permission): boolean => {
    const { user } = get();
    if (!user) return false;
    return user.permissions.includes(permission);
  },

  /**
   * Check if user has any of the given permissions
   */
  hasAnyPermission: (permissions: Permission[]): boolean => {
    const { user } = get();
    if (!user) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  },

  /**
   * Check if user has all of the given permissions
   */
  hasAllPermissions: (permissions: Permission[]): boolean => {
    const { user } = get();
    if (!user) return false;
    return permissions.every(permission => user.permissions.includes(permission));
  },
}));


// Listen for session expired events from httpClient
if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-expired', () => {
    useAuthStore.getState().logout();
  });
}
