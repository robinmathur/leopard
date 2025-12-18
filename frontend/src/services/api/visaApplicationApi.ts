/**
 * Visa Application API Client
 * Handles all visa application-related API operations
 */
import httpClient from './httpClient';

export type VisaApplicationStatus =
  | 'TO_BE_APPLIED'
  | 'VISA_APPLIED'
  | 'CASE_OPENED'
  | 'GRANTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface VisaApplication {
  id: number;
  client: number;
  client_name: string;
  visa_type: number;
  visa_type_name: string;
  visa_category_name: string;
  transaction_reference_no?: string;
  immigration_fee: string;
  immigration_fee_currency: string;
  service_fee: string;
  service_fee_currency: string;
  dependent: boolean;
  notes?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  expiry_date?: string; // ISO date
  date_applied?: string; // ISO date
  date_opened?: string; // ISO date
  final_date?: string; // ISO date
  date_granted?: string; // ISO date
  date_rejected?: string; // ISO date
  date_withdrawn?: string; // ISO date
  status: VisaApplicationStatus;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  required_documents?: string[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Get visa applications for a specific client
 */
export const getVisaApplications = async (clientId: number): Promise<VisaApplication[]> => {
  const response = await httpClient.get<PaginatedResponse<VisaApplication>>(
    '/v1/visa-applications/',
    {
      params: { client_id: clientId },
    }
  );
  return response.data.results;
};

/**
 * Get a specific visa application by ID
 */
export const getVisaApplication = async (id: number): Promise<VisaApplication> => {
  const response = await httpClient.get<VisaApplication>(`/v1/visa-applications/${id}/`);
  return response.data;
};

/**
 * Get all visa applications with pagination and filtering
 */
export const listVisaApplications = async (params?: {
  status?: VisaApplicationStatus;
  client_id?: number;
  client_name?: string;
  visa_type_id?: number;
  assigned_to_id?: number;
  created_by_id?: number;
  date_applied_from?: string;
  date_applied_to?: string;
  page?: number;
  page_size?: number;
}, signal?: AbortSignal): Promise<PaginatedResponse<VisaApplication>> => {
  const response = await httpClient.get<PaginatedResponse<VisaApplication>>(
    '/v1/visa-applications/',
    { params, signal }
  );
  return response.data;
};

/**
 * Create a new visa application
 */
export const createVisaApplication = async (data: {
  client_id: number;
  visa_type_id: number;
  immigration_fee: string;
  immigration_fee_currency?: string;
  service_fee: string;
  service_fee_currency?: string;
  transaction_reference_no?: string;
  dependent?: boolean;
  notes?: string;
  assigned_to_id?: number;
  required_documents?: string[];
  status?: VisaApplicationStatus;
  date_applied?: string;
}): Promise<VisaApplication> => {
  const response = await httpClient.post<VisaApplication>('/v1/visa-applications/', data);
  return response.data;
};

/**
 * Update a visa application
 */
export const updateVisaApplication = async (
  id: number,
  data: Partial<{
    visa_type_id: number;
    immigration_fee: string;
    immigration_fee_currency: string;
    service_fee: string;
    service_fee_currency: string;
    transaction_reference_no: string;
    dependent: boolean;
    notes: string;
    assigned_to_id: number;
    required_documents: string[];
    status: VisaApplicationStatus;
    date_applied: string;
    date_opened: string;
    date_granted: string;
    date_rejected: string;
    date_withdrawn: string;
    expiry_date: string;
  }>
): Promise<VisaApplication> => {
  const response = await httpClient.patch<VisaApplication>(`/v1/visa-applications/${id}/`, data);
  return response.data;
};

/**
 * Delete a visa application (if supported)
 */
export const deleteVisaApplication = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/visa-applications/${id}/`);
};

export default {
  getVisaApplications,
  getVisaApplication,
  listVisaApplications,
  createVisaApplication,
  updateVisaApplication,
  deleteVisaApplication,
};
