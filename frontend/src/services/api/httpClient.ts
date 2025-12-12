/**
 * HTTP Client
 * Axios instance with interceptors for authentication and error handling
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get base URL from environment or default to API path
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance
export const httpClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

/**
 * Request interceptor - adds Authorization header
 */
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokensStr = localStorage.getItem('auth_tokens');
    if (tokensStr) {
      try {
        const tokens = JSON.parse(tokensStr);
        if (tokens?.access) {
          config.headers.Authorization = `Bearer ${tokens.access}`;
        }
      } catch {
        // Invalid tokens in storage, ignore
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handles 401 errors with token refresh
 */
httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip token refresh for login and refresh endpoints, but still transform the error
      if (
        originalRequest.url?.includes('/token/') ||
        originalRequest.url?.includes('/token/refresh/')
      ) {
        const apiError = transformError(error);
        return Promise.reject(apiError);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return httpClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokensStr = localStorage.getItem('auth_tokens');
        if (!tokensStr) {
          throw new Error('No refresh token available');
        }

        const tokens = JSON.parse(tokensStr);
        if (!tokens?.refresh) {
          throw new Error('No refresh token available');
        }

        // Attempt to refresh the token
        const response = await axios.post(`${BASE_URL}/token/refresh/`, {
          refresh: tokens.refresh,
        });

        const newTokens = response.data;
        
        // Store new tokens
        localStorage.setItem('auth_tokens', JSON.stringify(newTokens));

        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;

        processQueue(null, newTokens.access);

        return httpClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        
        // Clear tokens and redirect to login
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_permissions');
        
        // Dispatch event for auth store to handle
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Transform error to consistent format
    const apiError = transformError(error);
    return Promise.reject(apiError);
  }
);

/**
 * Transform axios error to consistent API error format
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;
}

function transformError(error: AxiosError): ApiError {
  if (error.response) {
    const data = error.response.data as Record<string, unknown>;
    
    // Handle validation errors (field-level)
    if (error.response.status === 400 && typeof data === 'object') {
      const fieldErrors: Record<string, string[]> = {};
      let hasFieldErrors = false;
      
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'detail' && key !== 'code' && Array.isArray(value)) {
          fieldErrors[key] = value as string[];
          hasFieldErrors = true;
        }
      }
      
      if (hasFieldErrors) {
        return {
          message: 'Validation failed',
          status: 400,
          fieldErrors,
        };
      }
    }
    
    return {
      message: (data?.detail as string) || 'An error occurred',
      code: data?.code as string,
      status: error.response.status,
    };
  }
  
  if (error.request) {
    return {
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
    };
  }
  
  return {
    message: error.message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

export default httpClient;
