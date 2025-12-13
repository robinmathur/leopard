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
  assigned_by?: number;
  assigned_by_name?: string;
  assigned_by_full_name?: string;
  content_type?: number;
  object_id?: number;
  linked_entity_type?: string;
  linked_entity_id?: number;
  tags?: string[];
  client_id?: number; // Legacy field
  visa_application_id?: number; // Legacy field
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
 * Uses content_type and object_id for generic FK filtering
 */
export const getTasks = async (clientId: number): Promise<Task[]> => {
  const response = await httpClient.get<PaginatedResponse<Task>>('/v1/tasks/', {
    params: {
      content_type: 10, // CLIENT_CONTENT_TYPE_ID
      object_id: clientId,
    },
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
 * Create a new task
 */
export interface TaskCreateRequest {
  title: string;
  detail: string;
  priority: TaskPriority;
  due_date: string; // ISO datetime
  assigned_to: number;
  tags?: string[];
  content_type?: number;
  object_id?: number;
  assigned_by?: number;
  client_id?: number; // Legacy field for backward compatibility
}

export interface TaskUpdateRequest {
  title?: string;
  detail?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string; // ISO datetime
  tags?: string[];
  content_type?: number;
  object_id?: number;
  assigned_by?: number;
}

export const createTask = async (data: TaskCreateRequest): Promise<Task> => {
  const response = await httpClient.post<Task>('/v1/tasks/', data);
  return response.data;
};

/**
 * Update a task
 */
export const updateTask = async (id: number, data: TaskUpdateRequest): Promise<Task> => {
  const response = await httpClient.patch<Task>(`/v1/tasks/${id}/`, data);
  return response.data;
};

/**
 * Delete a task
 */
export const deleteTask = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/tasks/${id}/`);
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
  createTask,
  updateTask,
  deleteTask,
  completeTask,
};
