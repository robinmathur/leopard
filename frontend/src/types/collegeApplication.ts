/**
 * TypeScript types for College Application system.
 *
 * Mirrors backend serializers for type safety across API boundaries.
 */

// ============================================================================
// APPLICATION TYPE
// ============================================================================

export interface ApplicationType {
  id: number;
  title: string;
  currency: string;
  tax_name?: string;
  tax_percentage: string;
  description?: string;
  is_active: boolean;
  stages_count: number;
  has_applications: boolean;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_by?: number;
  updated_at: string;
}

export interface ApplicationTypeCreateRequest {
  title: string;
  currency?: string;
  tax_name?: string;
  tax_percentage?: number;
  description?: string;
}

export interface ApplicationTypeUpdateRequest {
  title?: string;
  currency?: string;
  tax_name?: string;
  tax_percentage?: number;
  description?: string;
  is_active?: boolean;
}

// ============================================================================
// STAGE
// ============================================================================

export interface Stage {
  id: number;
  application_type: number;
  application_type_title: string;
  stage_name: string;
  position: number;
  description?: string;
  is_final_stage: boolean;
  created_by?: number;
  created_at: string;
  updated_by?: number;
  updated_at: string;
}

export interface StageCreateRequest {
  application_type_id: number;
  stage_name: string;
  position?: number;
  description?: string;
}

export interface StageUpdateRequest {
  stage_name?: string;
  description?: string;
}

export interface StageReorderRequest {
  application_type_id: number;
  stages: Array<{
    stage_id: number;
    new_position: number;
  }>;
}

// ============================================================================
// COLLEGE APPLICATION
// ============================================================================

export interface CollegeApplication {
  id: number;
  // Application Type & Stage
  application_type: number;
  application_type_title: string;
  stage: number;
  stage_name: string;
  stage_position: number;
  is_final_stage: boolean;
  // Client
  client: number;
  client_name: string;
  // Institute & Course
  institute: number;
  institute_name: string;
  course: number;
  course_name: string;
  start_date: number;
  intake_date: string;
  location: number;
  location_display: string;
  // Application details
  finish_date?: string;
  total_tuition_fee: string;
  student_id?: string;
  // Agents
  super_agent?: number;
  super_agent_name?: string;
  sub_agent?: number;
  sub_agent_name?: string;
  // Assignment
  assigned_to?: number;
  assigned_to_name?: string;
  // Notes
  notes?: string;
  // Audit fields
  created_by?: number;
  created_at: string;
  updated_by?: number;
  updated_at: string;
}

export interface CollegeApplicationCreateRequest {
  application_type_id: number;
  client_id: number;
  institute_id: number;
  course_id: number;
  start_date_id: number;
  location_id: number;
  finish_date?: string;
  total_tuition_fee: number;
  student_id?: string;
  super_agent_id?: number;
  sub_agent_id?: number;
  assigned_to_id?: number;
  notes?: string;
}

export interface CollegeApplicationUpdateRequest {
  stage_id?: number;
  institute_id?: number;
  course_id?: number;
  start_date_id?: number;
  location_id?: number;
  finish_date?: string;
  total_tuition_fee?: number;
  student_id?: string;
  super_agent_id?: number;
  sub_agent_id?: number;
  assigned_to_id?: number;
  notes?: string;
}

// ============================================================================
// STATISTICS & DASHBOARD
// ============================================================================

export interface StageCountsResponse {
  total: number;
  by_stage: Array<{
    stage_id: number;
    stage_name: string;
    position: number;
    count: number;
  }>;
}

export interface DashboardStatistics {
  total_applications: number;
  final_stage_count: number;
  time_filter: string;
  intake_breakdown: Array<{
    start_date__intake_date: string;
    count: number;
  }>;
  application_type_breakdown: Array<{
    application_type__id: number;
    application_type__title: string;
    count: number;
  }>;
  institute_breakdown: Array<{
    institute__id: number;
    institute__name: string;
    count: number;
  }>;
  recent_applications: Array<{
    id: number;
    client__first_name: string;
    client__last_name: string;
    institute__name: string;
    course__name: string;
    stage__stage_name: string;
    start_date__intake_date: string;
    created_at: string;
  }>;
  pending_assignments: number;
}

// ============================================================================
// API FILTER PARAMETERS
// ============================================================================

export interface ApplicationTypeListParams {
  is_active?: boolean;
  title?: string;
  page?: number;
  page_size?: number;
}

export interface StageListParams {
  application_type_id?: number;
}

export interface CollegeApplicationListParams {
  client_id?: number;
  application_type_id?: number;
  stage_id?: number;
  institute_id?: number;
  assigned_to_id?: number;
  client_name?: string;
  page?: number;
  page_size?: number;
}

export interface DashboardStatisticsParams {
  time_filter?: 'today' | 'this_week' | 'this_month' | 'all';
}

export interface StageCountsParams {
  application_type_id?: number;
}
