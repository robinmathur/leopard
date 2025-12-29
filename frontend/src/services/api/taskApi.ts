/**
 * Task API Client
 * Handles all task-related API operations
 */
import httpClient from './httpClient';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskComment {
  user_id: number;
  username: string;
  full_name: string;
  text: string;
  mentions: Array<{
    user_id: number;
    username: string;
    full_name?: string;
    start_pos: number;
    end_pos: number;
  }>;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  detail: string;
  priority: TaskPriority;
  priority_display: string;
  status: TaskStatus;
  status_display: string;
  due_date: string; // ISO datetime
  assigned_to: number | null;
  assigned_to_name: string | null;
  assigned_to_full_name: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  assigned_to_branch?: boolean;
  assigned_by?: number;
  assigned_by_name?: string;
  assigned_by_full_name?: string;
  created_by?: number;
  created_by_name?: string;
  created_by_full_name?: string;
  content_type?: number;
  object_id?: number;
  linked_entity_type?: string;
  linked_entity_id?: number;
  linked_entity_name?: string | null;
  tags?: string[];
  comments?: TaskComment[];
  client_id?: number; // Legacy field
  visa_application_id?: number; // Legacy field
  completed_at?: string; // ISO datetime
  updated_by?: number;
  updated_by_name?: string;
  updated_by_full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TaskListParams {
  content_type?: number;
  object_id?: number;
  client?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to_me?: boolean;
  all_tasks?: boolean;
  include_overdue?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Get tasks with optional filtering
 */
export const getTasks = async (params?: TaskListParams, signal?: AbortSignal): Promise<PaginatedResponse<Task>> => {
  const response = await httpClient.get<PaginatedResponse<Task>>('/v1/tasks/', {
    params: params as any,
    signal,
  });
  return response.data;
};

/**
 * Get tasks for a specific client
 * Uses client parameter for filtering
 */
export const getTasksForClient = async (clientId: number, signal?: AbortSignal): Promise<Task[]> => {
  const response = await getTasks({
    client: clientId,
  }, signal);
  return response.results;
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
  assigned_to?: number | null;
  branch_id?: number | null;
  tags?: string[];
  // Entity linking (multi-tenant safe - uses model names)
  linked_entity_type?: string; // e.g., 'client', 'visaapplication'
  linked_entity_id?: number;
  assigned_by?: number;
}

export interface TaskUpdateRequest {
  title?: string;
  detail?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string; // ISO datetime
  tags?: string[];
  // Entity linking (multi-tenant safe - uses model names)
  linked_entity_type?: string; // e.g., 'client', 'visaapplication'
  linked_entity_id?: number;
  assigned_to?: number | null;
  branch_id?: number | null;
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

/**
 * Mark task as cancelled
 */
export const cancelTask = async (id: number): Promise<Task> => {
  const response = await httpClient.post<Task>(`/v1/tasks/${id}/cancel/`);
  return response.data;
};

/**
 * Claim a branch-assigned task
 */
export const claimTask = async (id: number): Promise<Task> => {
  const response = await httpClient.post<Task>(`/v1/tasks/${id}/claim/`);
  return response.data;
};

/**
 * Add a comment to a task
 */
export interface AddCommentRequest {
  comment: string;
}

export const addComment = async (id: number, comment: string): Promise<Task> => {
  const response = await httpClient.post<Task>(`/v1/tasks/${id}/add_comment/`, {
    comment,
  });
  return response.data;
};

export default {
  getTasks,
  getTasksForClient,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  cancelTask,
  claimTask,
  addComment,
};
