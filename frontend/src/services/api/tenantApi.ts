/**
 * Tenant API Service
 * Public API functions for tenant information (no authentication required)
 */

import { getDomainConfig, getTenantFromHostname } from '@/config/domain.config';

export interface TenantInfo {
  tenant_name: string;
  tenant_id: number;
}

/**
 * Build backend API URL for tenant info endpoint
 */
function getBackendApiUrl(): string {
  const config = getDomainConfig();
  const hostname = window.location.hostname;
  
  // Extract tenant from current hostname
  const tenant = getTenantFromHostname();
  
  if (tenant) {
    // Build backend URL with tenant subdomain
    const { appSubdomain, baseDomain, apiProtocol, apiPort } = config;
    const apiHostname = `${tenant}-${appSubdomain}.${baseDomain}`;
    const port = apiPort ? `:${apiPort}` : '';
    return `${apiProtocol}://${apiHostname}${port}`;
  }
  
  // Fallback: use same hostname but backend port (for development)
  const protocol = config.apiProtocol;
  const port = config.apiPort ? `:${config.apiPort}` : '';
  return `${protocol}://${hostname}${port}`;
}

/**
 * Tenant API endpoints
 */
export const tenantApi = {
  /**
   * Get tenant information based on current domain/subdomain
   * This is a public endpoint that doesn't require authentication
   * 
   * GET /api/public/tenant-info/
   * 
   * Returns tenant name and ID, or 404 if tenant not found
   */
  async getTenantInfo(): Promise<TenantInfo> {
    // Use a separate axios instance for public endpoints to avoid adding auth headers
    const axios = (await import('axios')).default;
    
    // Get backend URL (not frontend URL)
    const backendURL = getBackendApiUrl();
    
    // Add timestamp to URL to prevent caching
    const url = `${backendURL}/api/public/tenant-info/?_t=${Date.now()}`;
    
    console.log('Fetching tenant info from:', url);
    
    try {
      const response = await axios.get<TenantInfo>(url, {
        // Don't include auth headers for public endpoint
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        // Don't accept 304 responses - force fresh data
        validateStatus: (status) => {
          return status >= 200 && status < 300;
        },
      });
      
      console.log('Tenant API response:', response.status, response.data);
      
      if (!response.data) {
        console.error('Empty response data from tenant info endpoint');
        throw new Error('Empty response from tenant info endpoint');
      }
      
      // Validate response structure
      if (!response.data.tenant_name) {
        console.error('Response missing tenant_name:', response.data);
        throw new Error('Invalid response format: missing tenant_name');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Tenant API error:', error);
      // If we get a 304, it means caching is still happening - throw a more descriptive error
      if (error.response?.status === 304) {
        throw new Error('Cached response received. Please clear your browser cache.');
      }
      throw error;
    }
  },
};

export default tenantApi;

