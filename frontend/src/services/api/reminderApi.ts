/**
 * Reminder API Client
 * Handles all reminder-related API operations
 */
import httpClient from './httpClient';

export interface Reminder {
  id: number;
  reminder_date?: string; // ISO date
  reminder_time?: string; // HH:MM:SS format
  title: string;
  meta_info?: Record<string, unknown>;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  read: boolean;
  is_completed: boolean;
  notification_created: boolean;
  content_type: number;
  object_id: number;
}

export interface ReminderCreateRequest {
  reminder_date?: string;
  reminder_time?: string;
  title: string;
  meta_info?: Record<string, unknown>;
  content_type: number;
  object_id: number;
}

export interface ReminderUpdateRequest {
  reminder_date?: string;
  reminder_time?: string;
  title?: string;
  read?: boolean;
  is_completed?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Get reminders for a specific client
 * Uses generic foreign key with content_type and object_id
 */
export const listReminders = async (params: {
  content_type?: number;
  object_id?: number;
  page?: number;
  page_size?: number;
}, signal?: AbortSignal): Promise<PaginatedResponse<Reminder>> => {
  const response = await httpClient.get<PaginatedResponse<Reminder>>('/v1/reminders/', {
    params,
    signal,
  });
  return response.data;
};

/**
 * Get a specific reminder by ID
 */
export const getReminder = async (id: number): Promise<Reminder> => {
  const response = await httpClient.get<Reminder>(`/v1/reminders/${id}/`);
  return response.data;
};

/**
 * Create a new reminder
 */
export const createReminder = async (data: ReminderCreateRequest): Promise<Reminder> => {
  const response = await httpClient.post<Reminder>('/v1/reminders/', data);
  return response.data;
};

/**
 * Update a reminder
 */
export const updateReminder = async (id: number, data: ReminderUpdateRequest): Promise<Reminder> => {
  const response = await httpClient.patch<Reminder>(`/v1/reminders/${id}/`, data);
  return response.data;
};

/**
 * Delete a reminder
 */
export const deleteReminder = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/reminders/${id}/`);
};

/**
 * Mark reminder as completed
 */
export const completeReminder = async (id: number): Promise<Reminder> => {
  const response = await httpClient.post<Reminder>(`/v1/reminders/${id}/completed/`);
  return response.data;
};

/**
 * Get content type ID for Client model
 * This is the ContentType ID for the Client model in Django
 * To get this value, run: ContentType.objects.get_for_model(Client).id
 */
export const CLIENT_CONTENT_TYPE_ID = 10; // ContentType ID for Client model

export default {
  listReminders,
  getReminder,
  createReminder,
  updateReminder,
  deleteReminder,
  completeReminder,
};
