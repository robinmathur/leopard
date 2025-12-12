/**
 * Authentication Mock Handlers
 * MSW handlers for auth-related API endpoints
 */
import { http, HttpResponse, delay } from 'msw';
import { mockUsers, mockPermissionsByRole, mockTokens, mockBranchesData, mockRegionsData, setCurrentUser } from '../data/mockData';

const API_BASE = '/api';

export const authHandlers = [
  /**
   * POST /api/token/ - Login with credentials
   */
  http.post(`${API_BASE}/token/`, async ({ request }) => {
    await delay(300); // Simulate network delay
    
    const body = await request.json() as { username: string; password: string };
    const { username, password } = body;
    
    // Find user by username (email)
    const user = mockUsers.find(
      u => (u.username === username || u.email === username) && u.password === password
    );
    
    if (!user) {
      return HttpResponse.json(
        { detail: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    if (!user.is_active) {
      return HttpResponse.json(
        { detail: 'Account is disabled' },
        { status: 401 }
      );
    }
    
    // Set current user for permissions lookup
    setCurrentUser(user);
    
    // Return tokens
    return HttpResponse.json({
      access: `${mockTokens.access}_${user.id}_${Date.now()}`,
      refresh: `${mockTokens.refresh}_${user.id}_${Date.now()}`,
    });
  }),

  /**
   * POST /api/token/refresh/ - Refresh access token
   */
  http.post(`${API_BASE}/token/refresh/`, async ({ request }) => {
    await delay(200);
    
    const body = await request.json() as { refresh: string };
    const { refresh } = body;
    
    // Validate refresh token format
    if (!refresh || !refresh.includes('mock_refresh')) {
      return HttpResponse.json(
        { detail: 'Invalid refresh token' },
        { status: 401 }
      );
    }
    
    // Return new tokens
    return HttpResponse.json({
      access: `${mockTokens.access}_refreshed_${Date.now()}`,
      refresh: `${mockTokens.refresh}_refreshed_${Date.now()}`,
    });
  }),

  /**
   * GET /api/v1/users/profile/ - Get current user profile and permissions
   */
  http.get(`${API_BASE}/v1/users/profile/`, async ({ request }) => {
    await delay(200);
    
    // Check for authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { detail: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Extract user ID from token (mock format: token_userId_timestamp)
    const token = authHeader.replace('Bearer ', '');
    const tokenParts = token.split('_');
    const userId = tokenParts.length >= 3 ? parseInt(tokenParts[tokenParts.length - 2], 10) : null;
    
    // Find user
    const user = userId ? mockUsers.find(u => u.id === userId) : mockUsers[0];
    
    if (!user) {
      return HttpResponse.json(
        { detail: 'User not found' },
        { status: 401 }
      );
    }
    
    // Get permissions for user's role
    const permissions = mockPermissionsByRole[user.primary_group] || mockPermissionsByRole.INTERN;
    
    // Get branches and regions for user
    const branchesData = user.branches_data || mockBranchesData.slice(0, 1);
    const regionsData = user.regions_data || mockRegionsData.slice(0, 1);

    return HttpResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      primary_group: user.primary_group,
      groups_list: user.groups_list || [user.primary_group],
      tenant: user.tenant,
      tenant_name: user.tenant_name || 'Immigration CRM Tenant',
      branches_data: branchesData,
      regions_data: regionsData,
      is_active: user.is_active,
      permissions,
    });
  }),
];

