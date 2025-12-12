/**
 * Authentication API Service
 * Handles login, token refresh, and user profile fetching
 */
import httpClient from './httpClient';
import type { AuthTokens, ProfileResponse } from '@/auth/types';

export const authApi = {
  /**
   * Login with username and password
   * POST /api/token/
   */
  async login(username: string, password: string): Promise<AuthTokens> {
    const response = await httpClient.post<AuthTokens>('/token/', {
      username,
      password,
    });
    return response.data;
  },

  /**
   * Refresh access token using refresh token
   * POST /api/token/refresh/
   */
  async refreshToken(refresh: string): Promise<AuthTokens> {
    const response = await httpClient.post<AuthTokens>('/token/refresh/', {
      refresh,
    });
    return response.data;
  },

  /**
   * Get current user's profile and permissions
   * GET /api/v1/users/profile/
   * Returns user profile data combined with permissions in a single response
   */
  async getProfile(): Promise<ProfileResponse> {
    const response = await httpClient.get<ProfileResponse>('/v1/users/profile/');
    return response.data;
  },
};

export default authApi;
