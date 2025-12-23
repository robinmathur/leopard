/**
 * Visa Type TypeScript types
 */

export interface VisaCategory {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

export interface VisaType {
  id: number;
  visa_category: VisaCategory;
  visa_category_name: string;
  name: string;
  code?: string;
  description?: string;
  checklist: string[];
}

export interface VisaTypeCreateRequest {
  visa_category_id: number;
  name: string;
  code?: string;
  description?: string;
  checklist?: string[];
}

export interface VisaTypeUpdateRequest {
  visa_category_id?: number;
  name?: string;
  code?: string;
  description?: string;
  checklist?: string[];
}

/**
 * Visa Application Status
 */
export type VisaApplicationStatus =
  | 'TO_BE_APPLIED'
  | 'VISA_APPLIED'
  | 'CASE_OPENED'
  | 'GRANTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export const VISA_STATUS_LABELS: Record<VisaApplicationStatus, string> = {
  TO_BE_APPLIED: 'To Be Applied',
  VISA_APPLIED: 'Visa Applied',
  CASE_OPENED: 'Case Opened',
  GRANTED: 'Granted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

/**
 * Visa Application Dashboard Statistics
 */
export interface VisaApplicationStatusCounts {
  TO_BE_APPLIED: number;
  VISA_APPLIED: number;
  CASE_OPENED: number;
  GRANTED: number;
  REJECTED: number;
  WITHDRAWN: number;
  TOTAL: number;
}

export interface VisaApplicationTimeBasedCounts {
  today: number;
  this_week: number;
  this_month: number;
}

export interface VisaApplicationGrantedCounts {
  today: number;
  this_week: number;
  this_month: number;
}

export interface VisaTypeBreakdown {
  visa_type__id: number;
  visa_type__name: string;
  count: number;
}

export interface RecentApplication {
  id: number;
  client__first_name: string;
  client__last_name: string;
  visa_type__name: string;
  status: VisaApplicationStatus;
  created_at: string;
}

export interface VisaDashboardStatistics {
  total_applications: number;
  status_breakdown: Record<VisaApplicationStatus, number>;
  time_based_counts: VisaApplicationTimeBasedCounts;
  granted_counts: VisaApplicationGrantedCounts;
  visa_type_breakdown: VisaTypeBreakdown[];
  recent_applications: RecentApplication[];
  pending_assignments: number;
}
