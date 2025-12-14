/**
 * Proficiency API Client
 * Handles all language proficiency-related API operations
 */
import httpClient from './httpClient';

export interface Proficiency {
  id: number;
  client_id: number;
  test_name_id?: number;
  test_name_display?: string;
  overall_score?: number | string; // Backend returns Decimal as string
  speaking_score?: number | string;
  reading_score?: number | string;
  listening_score?: number | string;
  writing_score?: number | string;
  test_date?: string; // ISO date
  created_at: string;
  updated_at: string;
}

export interface ProficiencyCreateRequest {
  client_id: number;
  test_name_id: number;
  overall_score?: number | string;
  speaking_score?: number | string;
  reading_score?: number | string;
  listening_score?: number | string;
  writing_score?: number | string;
  test_date?: string;
}

export interface ProficiencyUpdateRequest {
  client_id: number;
  test_name_id?: number;
  overall_score?: number | string;
  speaking_score?: number | string;
  reading_score?: number | string;
  listening_score?: number | string;
  writing_score?: number | string;
  test_date?: string;
}

/**
 * Get proficiencies for a specific client
 */
export const getProficiencies = async (clientId: number): Promise<Proficiency[]> => {
  const response = await httpClient.get<{ results: Proficiency[] }>('/v1/language-proficiencies/', {
    params: { client_id: clientId },
  });
  return response.data.results;
};

/**
 * Get a specific proficiency by ID
 */
export const getProficiency = async (id: number): Promise<Proficiency> => {
  const response = await httpClient.get<Proficiency>(`/v1/language-proficiencies/${id}/`);
  return response.data;
};

/**
 * Create a new proficiency
 */
export const createProficiency = async (data: ProficiencyCreateRequest): Promise<Proficiency> => {
  const response = await httpClient.post<Proficiency>('/v1/language-proficiencies/', data);
  return response.data;
};

/**
 * Update a proficiency
 */
export const updateProficiency = async (
  id: number,
  data: ProficiencyUpdateRequest
): Promise<Proficiency> => {
  const response = await httpClient.patch<Proficiency>(`/v1/language-proficiencies/${id}/`, data);
  return response.data;
};

/**
 * Delete a proficiency
 */
export const deleteProficiency = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/language-proficiencies/${id}/`);
};

export default {
  getProficiencies,
  getProficiency,
  createProficiency,
  updateProficiency,
  deleteProficiency,
};
