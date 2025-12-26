/**
 * Domain Configuration for Flattened Subdomain Architecture
 *
 * Structure: tenant-app.company.com
 * - tenant: Dynamic tenant identifier (extracted from subdomain)
 * - app: Application namespace (fixed)
 * - company: Company domain (fixed)
 * - com: TLD
 *
 * Examples:
 * - Development: demo-app.localhost
 * - Staging: demo-app-staging.company.com
 * - Production: demo-app.company.com
 */

export interface DomainConfig {
  appSubdomain: string;
  baseDomain: string;
  environment: 'development' | 'staging' | 'production';
  apiProtocol: 'http' | 'https';
  apiPort?: number;
}

/**
 * Get domain configuration based on current environment
 */
export const getDomainConfig = (): DomainConfig => {
  const hostname = window.location.hostname;

  // Development
  if (hostname.includes('localhost')) {
    return {
      appSubdomain: import.meta.env.VITE_APP_SUBDOMAIN || 'immigrate',
      baseDomain: 'localhost',
      environment: 'development',
      apiProtocol: 'http',
      apiPort: 8000,
    };
  }

  // Staging
  if (hostname.includes('staging')) {
    return {
      appSubdomain: import.meta.env.VITE_APP_SUBDOMAIN || 'immigrate',
      baseDomain: import.meta.env.VITE_BASE_DOMAIN || 'company.com',
      environment: 'staging',
      apiProtocol: 'https',
    };
  }

  // Production
  return {
    appSubdomain: import.meta.env.VITE_APP_SUBDOMAIN || 'immigrate',
    baseDomain: import.meta.env.VITE_BASE_DOMAIN || 'company.com',
    environment: 'production',
    apiProtocol: 'https',
  };
};

/**
 * Extract tenant subdomain from current URL
 *
 * @returns Tenant identifier or null if not a tenant request
 *
 * Examples:
 * - demo-app.localhost → 'demo'
 * - demo-app.company.com → 'demo'
 * - app.localhost → null (no tenant)
 * - localhost → null (no tenant)
 */
export const getTenantFromHostname = (): string | null => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Need at least 2 parts for flattened subdomain (tenant-app.company.com)
  if (parts.length < 2) {
    return null;
  }

  const config = getDomainConfig();

  // First part contains tenant-app pattern
  const firstPart = parts[0];
  
  // Check if it matches the flattened pattern: tenant-app
  const tenantAppPattern = `${config.appSubdomain}`;
  
  // Extract tenant from pattern like "demo-app" or "acme-immigrate"
  // Pattern: {tenant}-{app}
  if (firstPart.endsWith(`-${tenantAppPattern}`)) {
    const tenant = firstPart.slice(0, -(tenantAppPattern.length + 1)); // Remove "-app" suffix
    if (tenant && tenant.length > 0) {
      return tenant;
    }
  }

  // If first part is just the app subdomain, no tenant
  if (firstPart === config.appSubdomain) {
    return null; // This is app.company.com (no tenant)
  }

  return null;
};

/**
 * Build API base URL for current tenant
 *
 * @returns Full API base URL with tenant subdomain
 *
 * Examples:
 * - Development: http://demo-app.localhost:8000/api/v1
 * - Production: https://demo-app.company.com/api/v1
 */
export const getApiBaseUrl = (): string => {
  const config = getDomainConfig();
  const tenant = getTenantFromHostname();

  if (!tenant) {
    throw new Error('No tenant found in URL. Please access via tenant subdomain.');
  }

  const { appSubdomain, baseDomain, apiProtocol, apiPort } = config;

  // Build hostname: tenant-app.company.com (flattened pattern)
  const apiHostname = `${tenant}-${appSubdomain}.${baseDomain}`;

  // Build full URL
  const port = apiPort ? `:${apiPort}` : '';
  const apiUrl = `${apiProtocol}://${apiHostname}${port}/api`;

  return apiUrl;
};

/**
 * Build full tenant URL
 *
 * @param tenant - Tenant subdomain
 * @param path - Optional path (default: '/')
 * @returns Full URL for the tenant
 *
 * Examples:
 * - getTenantUrl('demo') → http://demo-app.localhost:8000/
 * - getTenantUrl('demo', '/dashboard') → http://demo-app.localhost:8000/dashboard
 */
export const getTenantUrl = (tenant: string, path: string = '/'): string => {
  const config = getDomainConfig();
  const { appSubdomain, baseDomain, apiProtocol, apiPort } = config;

  // Build hostname: tenant-app.company.com (flattened pattern)
  const hostname = `${tenant}-${appSubdomain}.${baseDomain}`;
  const port = apiPort ? `:${apiPort}` : '';

  return `${apiProtocol}://${hostname}${port}${path}`;
};

/**
 * Redirect to tenant subdomain
 *
 * @param tenant - Tenant subdomain to redirect to
 * @param path - Optional path (default: current path)
 *
 * Use case: After login, redirect to tenant-specific URL
 */
export const redirectToTenant = (tenant: string, path?: string): void => {
  const targetPath = path || window.location.pathname;
  const targetUrl = getTenantUrl(tenant, targetPath);

  window.location.href = targetUrl;
};

/**
 * Validate tenant subdomain format
 *
 * @param tenant - Tenant subdomain to validate
 * @returns True if valid tenant subdomain
 *
 * Rules:
 * - Only lowercase letters, numbers, and hyphens
 * - Must start with a letter
 * - 3-63 characters long
 */
export const isValidTenantSubdomain = (tenant: string): boolean => {
  const pattern = /^[a-z][a-z0-9-]{2,62}$/;
  return pattern.test(tenant);
};

/**
 * Get environment-specific configuration values
 */
export const getEnvironmentConfig = () => {
  const config = getDomainConfig();

  return {
    environment: config.environment,
    isDevelopment: config.environment === 'development',
    isStaging: config.environment === 'staging',
    isProduction: config.environment === 'production',
    apiBaseUrl: getApiBaseUrl(),
    currentTenant: getTenantFromHostname(),
    domainPattern: `{tenant}-${config.appSubdomain}.${config.baseDomain}`,
  };
};
