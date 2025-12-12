/**
 * Visa Application API Client
 * Handles all visa application-related API operations
 */
import httpClient from './httpClient';

export type VisaApplicationStatus =
  | 'TO_BE_APPLIED'
  | 'APPLIED'
  | 'OPEN'
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

export default {
  getVisaApplications,
  getVisaApplication,
};
