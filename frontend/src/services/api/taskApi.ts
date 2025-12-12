/**
 * Task API Client
 * Handles all task-related API operations
 */
import httpClient from './httpClient';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: number;
  title: string;
  detail: string;
  priority: TaskPriority;
  priority_display: string;
  status: TaskStatus;
  status_display: string;
  due_date: string; // ISO datetime
  assigned_to: number;
  assigned_to_name: string;
  assigned_to_full_name: string;
  tags?: string[];
  client_id?: number;
  visa_application_id?: number;
  completed_at?: string; // ISO datetime
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Get tasks for a specific client
 */
export const getTasks = async (clientId: number): Promise<Task[]> => {
  const response = await httpClient.get<PaginatedResponse<Task>>('/v1/tasks/', {
    params: { client: clientId },
  });
  return response.data.results;
};

/**
 * Get a specific task by ID
 */
export const getTask = async (id: number): Promise<Task> => {
  const response = await httpClient.get<Task>(`/v1/tasks/${id}/`);
  return response.data;
};

/**
 * Mark task as completed
 */
export const completeTask = async (id: number): Promise<Task> => {
  const response = await httpClient.post<Task>(`/v1/tasks/${id}/complete/`);
  return response.data;
};

export default {
  getTasks,
  getTask,
  completeTask,
};
