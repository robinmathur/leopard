/**
 * Client Types
 * Type definitions for client management
 */

export type ClientStage = 'LEAD' | 'FOLLOW_UP' | 'CLIENT' | 'CLOSE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Client {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  gender: Gender;
  dob?: string; // ISO date
  country: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  stage: ClientStage;
  active: boolean;
  description?: string;
  referred_by?: string;
  visa_category?: number;
  visa_category_name?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  agent?: number;
  agent_name?: string;
  branch?: number;
  branch_name?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_by?: number;
  updated_at: string;
}

export interface ClientCreateRequest {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  gender: Gender;
  dob?: string;
  country: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  stage?: ClientStage; // Defaults to 'LE'
  visa_category_id?: number;
  assigned_to_id?: number;
  agent_id?: number;
  description?: string;
  referred_by?: string;
  active?: boolean;
}

export interface ClientUpdateRequest {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  gender?: Gender;
  dob?: string;
  country?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  stage?: ClientStage;
  visa_category_id?: number;
  assigned_to_id?: number;
  agent_id?: number;
  description?: string;
  referred_by?: string;
  active?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ClientListParams {
  page?: number;
  page_size?: number;
  stage?: ClientStage;
  active?: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface StageCounts {
  LEAD: number;
  FOLLOW_UP: number;
  CLIENT: number;
  CLOSE: number;
  TOTAL: number;
}

export const STAGE_LABELS: Record<ClientStage, string> = {
  LEAD: 'Lead',
  FOLLOW_UP: 'Follow Up',
  CLIENT: 'Client',
  CLOSE: 'Close',
};

export const STAGE_COLORS: Record<ClientStage, 'default' | 'info' | 'success' | 'warning'> = {
  LEAD: 'default',
  FOLLOW_UP: 'info',
  CLIENT: 'success',
  CLOSE: 'warning',
};

export const NEXT_STAGE: Record<ClientStage, ClientStage | null> = {
  LEAD: 'FOLLOW_UP',
  FOLLOW_UP: 'CLIENT',
  CLIENT: 'CLOSE',
  CLOSE: null, // Terminal state
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

// Common country codes for dropdown
export const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'NP', name: 'Nepal' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
];
