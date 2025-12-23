/**
 * Employment API Client
 * Handles all employment-related API operations
 */
import httpClient from './httpClient';

export interface Employment {
  id: number;
  client_id: number;
  employer_name: string;
  position: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  country: string;
  created_at: string;
  updated_at: string;
}

export interface EmploymentCreateRequest {
  client_id: number;
  employer_name: string;
  position: string;
  start_date: string;
  end_date: string;
  country: string;
}

export interface EmploymentUpdateRequest {
  client_id: number;
  employer_name: string;
  position: string;
  start_date: string;
  end_date: string;
  country: string;
}

/**
 * Get employments for a specific client
 */
export const getEmployments = async (clientId: number, signal?: AbortSignal): Promise<Employment[]> => {
  const response = await httpClient.get<{ results: Employment[] }>('/v1/employments/', {
    params: { client_id: clientId },
    signal,
  });
  return response.data.results;
};

/**
 * Get a specific employment by ID
 */
export const getEmployment = async (id: number): Promise<Employment> => {
  const response = await httpClient.get<Employment>(`/v1/employments/${id}/`);
  return response.data;
};

/**
 * Create a new employment
 */
export const createEmployment = async (
  data: EmploymentCreateRequest
): Promise<Employment> => {
  const response = await httpClient.post<Employment>('/v1/employments/', data);
  return response.data;
};

/**
 * Update an employment
 */
export const updateEmployment = async (
  id: number,
  data: EmploymentUpdateRequest
): Promise<Employment> => {
  const response = await httpClient.patch<Employment>(`/v1/employments/${id}/`, data);
  return response.data;
};

/**
 * Delete an employment
 */
export const deleteEmployment = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/employments/${id}/`);
};

export default {
  getEmployments,
  getEmployment,
  createEmployment,
  updateEmployment,
  deleteEmployment,
};
