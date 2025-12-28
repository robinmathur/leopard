/**
 * Region Types
 * Type definitions for region management
 */

export interface Region {
  id: number;
  name: string;
  description?: string;
  branch_count?: number;
  created_at: string;
  updated_at: string;
}

export interface RegionCreateRequest {
  name: string;
  description?: string;
}

export interface RegionUpdateRequest {
  name?: string;
  description?: string;
}

export interface RegionListParams {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
}

