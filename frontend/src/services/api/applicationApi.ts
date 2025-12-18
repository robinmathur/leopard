/**
 * College/Institute Application API Client
 * Handles all application-related API operations
 */
import httpClient from './httpClient';

export interface Application {
  id: number;
  application_type: {
    id: number;
    title: string;
  };
  stage: {
    id: number;
    title: string;
  };
  client: {
    id: number;
    full_name?: string;
  };
  institute: {
    id: number;
    name: string;
  };
  course: {
    id: number;
    name: string;
  };
  start_date: {
    id: number;
    title?: string;
  };
  location: {
    id: number;
    title?: string;
  };
  finish_date?: string; // ISO date
  total_tuition_fee: string;
  student_id?: string;
  assigned_to?: {
    id: number;
    full_name?: string;
  };
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Get applications for a specific client
 */
export const getApplications = async (clientId: number, signal?: AbortSignal): Promise<Application[]> => {
  const response = await httpClient.get<Application[]>('/v1/applications/', {
    params: { client: clientId },
    signal,
  });
  return response.data;
};

/**
 * Get a specific application by ID
 */
export const getApplication = async (id: number): Promise<Application> => {
  const response = await httpClient.get<Application>(`/v1/applications/${id}/`);
  return response.data;
};

export default {
  getApplications,
  getApplication,
};
