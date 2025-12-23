/**
 * Language Exam API Client
 * Handles all language proficiency exam (LPE) related API operations
 */
import httpClient from './httpClient';

export interface LanguageExam {
  id: number;
  name: string;
  validity_term: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface LanguageExamCreateRequest {
  name: string;
  validity_term?: number;
  description?: string;
}

export interface LanguageExamUpdateRequest {
  name?: string;
  validity_term?: number;
  description?: string;
}

/**
 * Get all language exams
 */
export const getLanguageExams = async (signal?: AbortSignal): Promise<LanguageExam[]> => {
  const response = await httpClient.get<{ results: LanguageExam[] }>('/v1/language-exams/', { signal });
  return response.data.results;
};

/**
 * Get a specific language exam by ID
 */
export const getLanguageExam = async (id: number): Promise<LanguageExam> => {
  const response = await httpClient.get<LanguageExam>(`/v1/language-exams/${id}/`);
  return response.data;
};

/**
 * Create a new language exam
 */
export const createLanguageExam = async (
  data: LanguageExamCreateRequest
): Promise<LanguageExam> => {
  const response = await httpClient.post<LanguageExam>('/v1/language-exams/', data);
  return response.data;
};

/**
 * Update a language exam
 */
export const updateLanguageExam = async (
  id: number,
  data: LanguageExamUpdateRequest
): Promise<LanguageExam> => {
  const response = await httpClient.patch<LanguageExam>(`/v1/language-exams/${id}/`, data);
  return response.data;
};

/**
 * Delete a language exam
 */
export const deleteLanguageExam = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/language-exams/${id}/`);
};

export default {
  getLanguageExams,
  getLanguageExam,
  createLanguageExam,
  updateLanguageExam,
  deleteLanguageExam,
};
