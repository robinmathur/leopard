/**
 * Branch Types
 * Type definitions for branch management
 */

export interface Branch {
  id: number;
  name: string;
  region?: number;
  region_name?: string;
  phone?: string;
  website?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_by?: number;
  updated_by_name?: string;
  updated_at: string;
}

export interface BranchCreateRequest {
  name: string;
  region_id?: number | null;
  phone?: string;
  website?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface BranchUpdateRequest {
  name?: string;
  region_id?: number | null;
  phone?: string;
  website?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface BranchListParams {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
  region_id?: number;
  phone?: string;
  country?: string;
  state?: string;
  include_deleted?: boolean;
}

