/**
 * Passport API Client
 * Handles all passport-related API operations
 */
import httpClient from './httpClient';

export interface Passport {
  id: number; // Client ID (OneToOne relationship)
  passport_no: string;
  passport_country: string;
  date_of_issue?: string; // ISO date
  date_of_expiry?: string; // ISO date
  place_of_issue?: string;
  country_of_birth: string;
  nationality: string;
}

export interface PassportCreateRequest {
  id: number; // Client ID
  passport_no: string;
  passport_country: string;
  date_of_issue?: string;
  date_of_expiry?: string;
  place_of_issue?: string;
  country_of_birth: string;
  nationality: string;
}

export interface PassportUpdateRequest {
  passport_no?: string;
  passport_country?: string;
  date_of_issue?: string;
  date_of_expiry?: string;
  place_of_issue?: string;
  country_of_birth?: string;
  nationality?: string;
}

/**
 * Get passport for a specific client
 */
export const getPassport = async (clientId: number): Promise<Passport | null> => {
  try {
    const response = await httpClient.get<Passport>(`/v1/passports/${clientId}/`);
    return response.data;
  } catch (error) {
    // If 404, no passport exists for this client
    if ((error as { response?: { status?: number } }).response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Create a new passport
 */
export const createPassport = async (data: PassportCreateRequest): Promise<Passport> => {
  const response = await httpClient.post<Passport>('/v1/passports/', data);
  return response.data;
};

/**
 * Update a passport
 */
export const updatePassport = async (
  clientId: number,
  data: PassportUpdateRequest
): Promise<Passport> => {
  const response = await httpClient.patch<Passport>(`/v1/passports/${clientId}/`, data);
  return response.data;
};

/**
 * Delete a passport
 */
export const deletePassport = async (clientId: number): Promise<void> => {
  await httpClient.delete(`/v1/passports/${clientId}/`);
};

/**
 * Upsert (create or update) a passport
 */
export const upsertPassport = async (data: PassportCreateRequest): Promise<Passport> => {
  const response = await httpClient.post<Passport>('/v1/passports/upsert/', data);
  return response.data;
};

export default {
  getPassport,
  createPassport,
  updatePassport,
  deletePassport,
  upsertPassport,
};
