/**
 * API service for College Application system.
 *
 * Provides HTTP client functions for all college application endpoints.
 */

import httpClient from './httpClient';
import type { PaginatedResponse } from '@/types/common';
import type {
  ApplicationType,
  ApplicationTypeCreateRequest,
  ApplicationTypeUpdateRequest,
  ApplicationTypeListParams,
  Stage,
  StageCreateRequest,
  StageUpdateRequest,
  StageReorderRequest,
  StageListParams,
  CollegeApplication,
  CollegeApplicationCreateRequest,
  CollegeApplicationUpdateRequest,
  CollegeApplicationListParams,
  StageCountsResponse,
  StageCountsParams,
  DashboardStatistics,
  DashboardStatisticsParams,
} from '@/types/collegeApplication';

// Re-export types for convenience
export type {
  ApplicationType,
  ApplicationTypeCreateRequest,
  ApplicationTypeUpdateRequest,
  ApplicationTypeListParams,
  Stage,
  StageCreateRequest,
  StageUpdateRequest,
  StageReorderRequest,
  StageListParams,
  CollegeApplication,
  CollegeApplicationCreateRequest,
  CollegeApplicationUpdateRequest,
  CollegeApplicationListParams,
  StageCountsResponse,
  StageCountsParams,
  DashboardStatistics,
  DashboardStatisticsParams,
};

// ============================================================================
// APPLICATION TYPE API
// ============================================================================

export const listApplicationTypes = async (
  params?: ApplicationTypeListParams,
  signal?: AbortSignal
): Promise<PaginatedResponse<ApplicationType>> => {
  const response = await httpClient.get('/v1/application-types/', { params, signal });
  return response.data;
};

export const getApplicationType = async (
  id: number,
  signal?: AbortSignal
): Promise<ApplicationType> => {
  const response = await httpClient.get(`/v1/application-types/${id}/`, { signal });
  return response.data;
};

export const createApplicationType = async (
  data: ApplicationTypeCreateRequest
): Promise<ApplicationType> => {
  const response = await httpClient.post('/v1/application-types/', data);
  return response.data;
};

export const updateApplicationType = async (
  id: number,
  data: ApplicationTypeUpdateRequest
): Promise<ApplicationType> => {
  const response = await httpClient.patch(`/v1/application-types/${id}/`, data);
  return response.data;
};

export const deleteApplicationType = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/application-types/${id}/`);
};

// ============================================================================
// STAGE API
// ============================================================================

export const listStages = async (
  params?: StageListParams,
  signal?: AbortSignal
): Promise<Stage[]> => {
  const response = await httpClient.get('/v1/stages/', { params, signal });
  return response.data;
};

export const getStage = async (
  id: number,
  signal?: AbortSignal
): Promise<Stage> => {
  const response = await httpClient.get(`/v1/stages/${id}/`, { signal });
  return response.data;
};

export const createStage = async (
  data: StageCreateRequest
): Promise<Stage> => {
  const response = await httpClient.post('/v1/stages/', data);
  return response.data;
};

export const updateStage = async (
  id: number,
  data: StageUpdateRequest
): Promise<Stage> => {
  const response = await httpClient.patch(`/v1/stages/${id}/`, data);
  return response.data;
};

export const deleteStage = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/stages/${id}/`);
};

export const reorderStages = async (
  data: StageReorderRequest
): Promise<Stage[]> => {
  const response = await httpClient.post('/v1/stages/reorder/', data);
  return response.data;
};

// ============================================================================
// COLLEGE APPLICATION API
// ============================================================================

export const listCollegeApplications = async (
  params?: CollegeApplicationListParams,
  signal?: AbortSignal
): Promise<PaginatedResponse<CollegeApplication>> => {
  const response = await httpClient.get('/v1/college-applications//', { params, signal });
  return response.data;
};

export const getCollegeApplication = async (
  id: number,
  signal?: AbortSignal
): Promise<CollegeApplication> => {
  const response = await httpClient.get(`/v1/college-applications//${id}/`, { signal });
  return response.data;
};

export const createCollegeApplication = async (
  data: CollegeApplicationCreateRequest
): Promise<CollegeApplication> => {
  const response = await httpClient.post('/v1/college-applications//', data);
  return response.data;
};

export const updateCollegeApplication = async (
  id: number,
  data: CollegeApplicationUpdateRequest
): Promise<CollegeApplication> => {
  const response = await httpClient.patch(`/v1/college-applications//${id}/`, data);
  return response.data;
};

export const deleteCollegeApplication = async (id: number): Promise<void> => {
  await httpClient.delete(`//v1/college-applications//${id}/`);
};

// ============================================================================
// STATISTICS & DASHBOARD API
// ============================================================================

export const getStageCounts = async (
  params?: StageCountsParams,
  signal?: AbortSignal
): Promise<StageCountsResponse> => {
  const response = await httpClient.get('/v1/college-applications//stage-counts/', {
    params,
    signal,
  });
  return response.data;
};

export const getDashboardStatistics = async (
  params?: DashboardStatisticsParams,
  signal?: AbortSignal
): Promise<DashboardStatistics> => {
  const response = await httpClient.get('/v1/college-applications//dashboard-statistics/', {
    params,
    signal,
  });
  return response.data;
};
