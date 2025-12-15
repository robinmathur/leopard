/**
 * Institute Types
 * Type definitions for institute management
 */

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type RequirementType = 'ACADEMIC' | 'LANGUAGE' | 'FINANCIAL' | 'DOCUMENT' | 'OTHER';

export interface Institute {
  id: number;
  name: string;
  short_name: string;
  phone?: string;
  website?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_by?: number;
  updated_by_name?: string;
  updated_at: string;
  deleted_at?: string;
}

export interface InstituteCreateRequest {
  name: string;
  short_name: string;
  phone?: string;
  website?: string;
}

export interface InstituteUpdateRequest {
  name?: string;
  short_name?: string;
  phone?: string;
  website?: string;
}

export interface InstituteContactPerson {
  id: number;
  institute: number;
  name: string;
  gender?: Gender;
  position?: string;
  phone?: string;
  email?: string;
}

export interface InstituteContactPersonCreateRequest {
  institute: number;
  name: string;
  gender?: Gender;
  position?: string;
  phone?: string;
  email?: string;
}

export interface InstituteContactPersonUpdateRequest {
  name?: string;
  gender?: Gender;
  position?: string;
  phone?: string;
  email?: string;
}

export interface InstituteLocation {
  id: number;
  institute: number;
  street_name?: string;
  suburb?: string;
  state: string;
  postcode?: string;
  country: string;
  phone_number?: string;
  email?: string;
}

export interface InstituteLocationCreateRequest {
  institute: number;
  street_name?: string;
  suburb?: string;
  state: string;
  postcode?: string;
  country: string;
  phone_number?: string;
  email?: string;
}

export interface InstituteLocationUpdateRequest {
  street_name?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone_number?: string;
  email?: string;
}

export interface InstituteIntake {
  id: number;
  institute: number;
  intake_date: string; // ISO date
  description?: string;
}

export interface InstituteIntakeCreateRequest {
  institute: number;
  intake_date: string;
  description?: string;
}

export interface InstituteIntakeUpdateRequest {
  intake_date?: string;
  description?: string;
}

export interface InstituteRequirement {
  id: number;
  institute: number;
  title: string;
  description?: string;
  requirement_type: RequirementType;
}

export interface InstituteRequirementCreateRequest {
  institute: number;
  title: string;
  description?: string;
  requirement_type?: RequirementType;
}

export interface InstituteRequirementUpdateRequest {
  title?: string;
  description?: string;
  requirement_type?: RequirementType;
}

export interface Course {
  id: number;
  name: string;
  level: number | { id: number; name: string; type?: string };
  level_name?: string;
  total_tuition_fee: string;
  coe_fee: string;
  broad_field: number | { id: number; name: string; type?: string };
  broad_field_name?: string;
  narrow_field: number | { id: number; name: string; type?: string };
  narrow_field_name?: string;
  description?: string;
  institute: number;
}

export interface CourseCreateRequest {
  institute: number;
  name: string;
  level: number;
  total_tuition_fee: string;
  coe_fee: string;
  broad_field: number;
  narrow_field: number;
  description?: string;
}

export interface CourseUpdateRequest {
  name?: string;
  level?: number;
  total_tuition_fee?: string;
  coe_fee?: string;
  broad_field?: number;
  narrow_field?: number;
  description?: string;
}

export interface CourseLevel {
  id: number;
  name: string;
}

export interface BroadField {
  id: number;
  name: string;
}

export interface NarrowField {
  id: number;
  name: string;
  broad_field: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface InstituteListParams {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
  short_name?: string;
  include_deleted?: boolean;
}

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

export const REQUIREMENT_TYPE_LABELS: Record<RequirementType, string> = {
  ACADEMIC: 'Academic',
  LANGUAGE: 'Language',
  FINANCIAL: 'Financial',
  DOCUMENT: 'Document',
  OTHER: 'Other',
};
