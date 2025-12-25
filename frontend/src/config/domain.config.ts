/**
 * Domain Configuration for 4-Level Subdomain Architecture
 *
 * Structure: tenant.app.company.com
 * - tenant: Dynamic tenant identifier (extracted from subdomain)
 * - app: Application namespace (fixed)
 * - company: Company domain (fixed)
 * - com: TLD
 *
 * Examples:
 * - Development: acme.app.localhost
 * - Staging: acme.app-staging.company.com
 * - Production: acme.app.company.com
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
    apiProtocol: 'http',
  };
};

/**
 * Extract tenant subdomain from current URL
 *
 * @returns Tenant identifier or null if not a tenant request
 *
 * Examples:
 * - acme.app.localhost → 'acme'
 * - demo.app.company.com → 'demo'
 * - app.localhost → null (no tenant)
 * - localhost → null (no tenant)
 */
export const getTenantFromHostname = (): string | null => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Need at least 3 parts for 4-level subdomain
  if (parts.length < 3) {
    return null;
  }

  const config = getDomainConfig();

  // First part is tenant subdomain
  const tenantSubdomain = parts[0];

  // Validate it's not the app subdomain itself
  if (tenantSubdomain === config.appSubdomain) {
    return null; // This is app.company.com (no tenant)
  }

  return tenantSubdomain;
};

/**
 * Build API base URL for current tenant
 *
 * @returns Full API base URL with tenant subdomain
 *
 * Examples:
 * - Development: http://acme.app.localhost:8000/api/v1
 * - Production: https://acme.app.company.com/api/v1
 */
export const getApiBaseUrl = (): string => {
  const config = getDomainConfig();
  const tenant = getTenantFromHostname();

  if (!tenant) {
    throw new Error('No tenant found in URL. Please access via tenant subdomain.');
  }

  const { appSubdomain, baseDomain, apiProtocol, apiPort } = config;

  // Build hostname: tenant.app.company.com
  const apiHostname = `${tenant}.${appSubdomain}.${baseDomain}`;

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
 * - getTenantUrl('acme') → http://acme.app.localhost:8000/
 * - getTenantUrl('acme', '/dashboard') → http://acme.app.localhost:8000/dashboard
 */
export const getTenantUrl = (tenant: string, path: string = '/'): string => {
  const config = getDomainConfig();
  const { appSubdomain, baseDomain, apiProtocol, apiPort } = config;

  const hostname = `${tenant}.${appSubdomain}.${baseDomain}`;
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
    domainPattern: `{tenant}.${config.appSubdomain}.${config.baseDomain}`,
  };
};
