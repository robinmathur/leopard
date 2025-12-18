/**
 * Agent Types
 * Type definitions for agent management
 */

export type AgentType = 'SUPER_AGENT' | 'SUB_AGENT';

export interface Agent {
  id: number;
  agent_name: string;
  agent_type: AgentType;
  agent_type_display?: string;
  phone_number?: string;
  email?: string;
  website?: string;
  invoice_to?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  description?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_by?: number;
  updated_by_name?: string;
  updated_at: string;
}

export interface AgentCreateRequest {
  agent_name: string;
  agent_type: AgentType;
  phone_number?: string;
  email?: string;
  website?: string;
  invoice_to?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  description?: string;
}

export interface AgentUpdateRequest {
  agent_name?: string;
  agent_type?: AgentType;
  phone_number?: string;
  email?: string;
  website?: string;
  invoice_to?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  description?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AgentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  agent_name?: string;
  agent_type?: AgentType;
  email?: string;
  phone_number?: string;
  country?: string;
  include_deleted?: boolean;
}

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  SUPER_AGENT: 'Super Agent',
  SUB_AGENT: 'Sub Agent',
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
