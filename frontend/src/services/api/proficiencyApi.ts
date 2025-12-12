/**
 * Proficiency API Client
 * Handles all language proficiency-related API operations
 */
import httpClient from './httpClient';

export interface Proficiency {
  id: number;
  overall_score?: number;
  speaking_score?: number;
  reading_score?: number;
  listening_score?: number;
  writing_score?: number;
  test_date?: string; // ISO date
  test_name?: {
    id: number;
    name: string;
  };
  client: number;
}

export interface ProficiencyCreateRequest {
  overall_score?: number;
  speaking_score?: number;
  reading_score?: number;
  listening_score?: number;
  writing_score?: number;
  test_date?: string;
  test_name?: number;
  client: number;
}

export interface ProficiencyUpdateRequest {
  overall_score?: number;
  speaking_score?: number;
  reading_score?: number;
  listening_score?: number;
  writing_score?: number;
  test_date?: string;
  test_name?: number;
}

/**
 * Get proficiencies for a specific client
 */
export const getProficiencies = async (clientId: number): Promise<Proficiency[]> => {
  const response = await httpClient.get<Proficiency[]>('/v1/proficiencies/', {
    params: { client: clientId },
  });
  return response.data;
};

/**
 * Get a specific proficiency by ID
 */
export const getProficiency = async (id: number): Promise<Proficiency> => {
  const response = await httpClient.get<Proficiency>(`/v1/proficiencies/${id}/`);
  return response.data;
};

/**
 * Create a new proficiency
 */
export const createProficiency = async (data: ProficiencyCreateRequest): Promise<Proficiency> => {
  const response = await httpClient.post<Proficiency>('/v1/proficiencies/', data);
  return response.data;
};

/**
 * Update a proficiency
 */
export const updateProficiency = async (
  id: number,
  data: ProficiencyUpdateRequest
): Promise<Proficiency> => {
  const response = await httpClient.patch<Proficiency>(`/v1/proficiencies/${id}/`, data);
  return response.data;
};

/**
 * Delete a proficiency
 */
export const deleteProficiency = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/proficiencies/${id}/`);
};

export default {
  getProficiencies,
  getProficiency,
  createProficiency,
  updateProficiency,
  deleteProficiency,
};
