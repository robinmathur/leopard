/**
 * Institute API Service
 * API functions for institute CRUD operations
 */
import { httpClient } from './httpClient';
import {
  Institute,
  InstituteCreateRequest,
  InstituteUpdateRequest,
  InstituteListParams,
  PaginatedResponse,
  InstituteContactPerson,
  InstituteContactPersonCreateRequest,
  InstituteContactPersonUpdateRequest,
  InstituteLocation,
  InstituteLocationCreateRequest,
  InstituteLocationUpdateRequest,
  InstituteIntake,
  InstituteIntakeCreateRequest,
  InstituteIntakeUpdateRequest,
  InstituteRequirement,
  InstituteRequirementCreateRequest,
  InstituteRequirementUpdateRequest,
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
  CourseLevel,
  BroadField,
  NarrowField,
} from '@/types/institute';

/**
 * Institute API endpoints
 */
export const instituteApi = {
  /**
   * List institutes with optional filtering and pagination
   */
  async list(params?: InstituteListParams, signal?: AbortSignal): Promise<PaginatedResponse<Institute>> {
    const response = await httpClient.get<PaginatedResponse<Institute>>('/v1/institutes/', {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Get a single institute by ID
   */
  async getById(id: number): Promise<Institute> {
    const response = await httpClient.get<Institute>(`/v1/institutes/${id}/`);
    return response.data;
  },

  /**
   * Create a new institute
   */
  async create(data: InstituteCreateRequest): Promise<Institute> {
    const response = await httpClient.post<Institute>('/v1/institutes/', data);
    return response.data;
  },

  /**
   * Update an existing institute (partial update)
   */
  async update(id: number, data: InstituteUpdateRequest): Promise<Institute> {
    const response = await httpClient.patch<Institute>(`/v1/institutes/${id}/`, data);
    return response.data;
  },

  /**
   * Delete an institute (soft delete)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/v1/institutes/${id}/`);
  },

  /**
   * Restore a soft-deleted institute
   */
  async restore(id: number): Promise<Institute> {
    const response = await httpClient.post<Institute>(`/v1/institutes/${id}/restore/`);
    return response.data;
  },

  // Contact Persons
  async listContactPersons(instituteId: number): Promise<InstituteContactPerson[]> {
    const response = await httpClient.get<PaginatedResponse<InstituteContactPerson> | InstituteContactPerson[]>(
      '/v1/institute-contact-persons/',
      { params: { institute: instituteId } }
    );
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.results;
  },

  async createContactPerson(data: InstituteContactPersonCreateRequest): Promise<InstituteContactPerson> {
    const response = await httpClient.post<InstituteContactPerson>(
      '/v1/institute-contact-persons/',
      data
    );
    return response.data;
  },

  async updateContactPerson(
    id: number,
    data: InstituteContactPersonUpdateRequest
  ): Promise<InstituteContactPerson> {
    const response = await httpClient.patch<InstituteContactPerson>(
      `/v1/institute-contact-persons/${id}/`,
      data
    );
    return response.data;
  },

  async deleteContactPerson(id: number): Promise<void> {
    await httpClient.delete(`/v1/institute-contact-persons/${id}/`);
  },

  // Locations
  async listLocations(instituteId: number): Promise<InstituteLocation[]> {
    const response = await httpClient.get<PaginatedResponse<InstituteLocation> | InstituteLocation[]>(
      '/v1/institute-locations/',
      { params: { institute: instituteId } }
    );
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.results;
  },

  async createLocation(data: InstituteLocationCreateRequest): Promise<InstituteLocation> {
    const response = await httpClient.post<InstituteLocation>(
      '/v1/institute-locations/',
      data
    );
    return response.data;
  },

  async updateLocation(id: number, data: InstituteLocationUpdateRequest): Promise<InstituteLocation> {
    const response = await httpClient.patch<InstituteLocation>(
      `/v1/institute-locations/${id}/`,
      data
    );
    return response.data;
  },

  async deleteLocation(id: number): Promise<void> {
    await httpClient.delete(`/v1/institute-locations/${id}/`);
  },

  // Intakes
  async listIntakes(instituteId: number): Promise<InstituteIntake[]> {
    const response = await httpClient.get<PaginatedResponse<InstituteIntake> | InstituteIntake[]>(
      '/v1/institute-intakes/',
      { params: { institute: instituteId } }
    );
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.results;
  },

  async createIntake(data: InstituteIntakeCreateRequest): Promise<InstituteIntake> {
    const response = await httpClient.post<InstituteIntake>(
      '/v1/institute-intakes/',
      data
    );
    return response.data;
  },

  async updateIntake(id: number, data: InstituteIntakeUpdateRequest): Promise<InstituteIntake> {
    const response = await httpClient.patch<InstituteIntake>(
      `/v1/institute-intakes/${id}/`,
      data
    );
    return response.data;
  },

  async deleteIntake(id: number): Promise<void> {
    await httpClient.delete(`/v1/institute-intakes/${id}/`);
  },

  // Requirements
  async listRequirements(instituteId: number): Promise<InstituteRequirement[]> {
    const response = await httpClient.get<PaginatedResponse<InstituteRequirement> | InstituteRequirement[]>(
      '/v1/institute-requirements/',
      { params: { institute: instituteId } }
    );
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.results;
  },

  async createRequirement(data: InstituteRequirementCreateRequest): Promise<InstituteRequirement> {
    const response = await httpClient.post<InstituteRequirement>(
      '/v1/institute-requirements/',
      data
    );
    return response.data;
  },

  async updateRequirement(
    id: number,
    data: InstituteRequirementUpdateRequest
  ): Promise<InstituteRequirement> {
    const response = await httpClient.patch<InstituteRequirement>(
      `/v1/institute-requirements/${id}/`,
      data
    );
    return response.data;
  },

  async deleteRequirement(id: number): Promise<void> {
    await httpClient.delete(`/v1/institute-requirements/${id}/`);
  },

  // Courses
  async listCourses(instituteId: number): Promise<Course[]> {
    const response = await httpClient.get<PaginatedResponse<Course> | Course[]>(
      '/v1/courses/',
      { params: { institute: instituteId } }
    );
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.results;
  },

  async createCourse(data: CourseCreateRequest): Promise<Course> {
    const response = await httpClient.post<Course>('/v1/courses/', data);
    return response.data;
  },

  async updateCourse(id: number, data: CourseUpdateRequest): Promise<Course> {
    const response = await httpClient.patch<Course>(`/v1/courses/${id}/`, data);
    return response.data;
  },

  async deleteCourse(id: number): Promise<void> {
    await httpClient.delete(`/v1/courses/${id}/`);
  },

  // Course Levels
  async listCourseLevels(): Promise<CourseLevel[]> {
    const response = await httpClient.get<PaginatedResponse<CourseLevel> | CourseLevel[]>(
      '/v1/course-levels/'
    );
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.results;
  },

  async createCourseLevel(data: { name: string }): Promise<CourseLevel> {
    const response = await httpClient.post<CourseLevel>('/v1/course-levels/', data);
    return response.data;
  },

  // Broad Fields
  async listBroadFields(): Promise<BroadField[]> {
    const response = await httpClient.get<PaginatedResponse<BroadField> | BroadField[]>(
      '/v1/broad-fields/'
    );
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.results;
  },

  async createBroadField(data: { name: string }): Promise<BroadField> {
    const response = await httpClient.post<BroadField>('/v1/broad-fields/', data);
    return response.data;
  },

  // Narrow Fields
  async listNarrowFields(broadFieldId?: number): Promise<NarrowField[]> {
    const params = broadFieldId ? { broad_field: broadFieldId } : {};
    const response = await httpClient.get<PaginatedResponse<NarrowField> | NarrowField[]>(
      '/v1/narrow-fields/',
      { params }
    );
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.results;
  },

  async createNarrowField(data: { name: string; broad_field: number }): Promise<NarrowField> {
    const response = await httpClient.post<NarrowField>('/v1/narrow-fields/', data);
    return response.data;
  },
};

export default instituteApi;
