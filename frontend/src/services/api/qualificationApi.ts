/**
 * Qualification API Client
 * Handles all qualification-related API operations
 */
import httpClient from './httpClient';

export interface Qualification {
  id: number;
  course: string;
  institute?: string;
  enroll_date?: string; // ISO date
  completion_date?: string; // ISO date (null means in progress)
  country: string;
  client: number;
}

export interface QualificationCreateRequest {
  course: string;
  institute?: string;
  enroll_date?: string;
  completion_date?: string;
  country: string;
  client: number;
}

export interface QualificationUpdateRequest {
  course?: string;
  institute?: string;
  enroll_date?: string;
  completion_date?: string;
  country?: string;
}

/**
 * Get qualifications for a specific client
 */
export const getQualifications = async (clientId: number): Promise<Qualification[]> => {
  const response = await httpClient.get<Qualification[]>('/v1/qualifications/', {
    params: { client: clientId },
  });
  return response.data;
};

/**
 * Get a specific qualification by ID
 */
export const getQualification = async (id: number): Promise<Qualification> => {
  const response = await httpClient.get<Qualification>(`/v1/qualifications/${id}/`);
  return response.data;
};

/**
 * Create a new qualification
 */
export const createQualification = async (
  data: QualificationCreateRequest
): Promise<Qualification> => {
  const response = await httpClient.post<Qualification>('/v1/qualifications/', data);
  return response.data;
};

/**
 * Update a qualification
 */
export const updateQualification = async (
  id: number,
  data: QualificationUpdateRequest
): Promise<Qualification> => {
  const response = await httpClient.patch<Qualification>(`/v1/qualifications/${id}/`, data);
  return response.data;
};

/**
 * Delete a qualification
 */
export const deleteQualification = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/qualifications/${id}/`);
};

export default {
  getQualifications,
  getQualification,
  createQualification,
  updateQualification,
  deleteQualification,
};
