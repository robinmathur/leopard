/**
 * Notification API Client
 * Handles all notification-related API operations
 */
import { httpClient } from './httpClient';
import type { PaginatedResponse } from '@/types/common';
import type {
  Notification,
  NotificationListParams,
  NotificationUpdateParams,
} from '@/types/notification';

export interface UnreadCountResponse {
  unread_count: number;
}

export interface BulkMarkReadRequest {
  notification_ids: number[];
}

export interface BulkMarkReadResponse {
  marked_read_count: number;
}

/**
 * List notifications with optional filtering
 */
export const listNotifications = async (
  params?: NotificationListParams,
  signal?: AbortSignal
): Promise<PaginatedResponse<Notification>> => {
  const response = await httpClient.get<PaginatedResponse<Notification>>('/v1/notifications/', {
    params: params as any,
    signal,
  });
  return response.data;
};

/**
 * Get a specific notification by ID
 */
export const getNotification = async (
  id: number,
  signal?: AbortSignal
): Promise<Notification> => {
  const response = await httpClient.get<Notification>(`/v1/notifications/${id}/`, { signal });
  return response.data;
};

/**
 * Update a notification (mark as read, completed, etc.)
 */
export const updateNotification = async (
  id: number,
  data: NotificationUpdateParams,
  signal?: AbortSignal
): Promise<Notification> => {
  const response = await httpClient.patch<Notification>(`/v1/notifications/${id}/update_notification/`, data, {
    signal,
  });
  return response.data;
};

/**
 * Mark a notification as read
 */
export const markNotificationRead = async (
  id: number,
  signal?: AbortSignal
): Promise<Notification> => {
  const response = await httpClient.post<Notification>(`/v1/notifications/${id}/mark_read/`, {}, {
    signal,
  });
  return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (signal?: AbortSignal): Promise<number> => {
  const response = await httpClient.get<UnreadCountResponse>('/v1/notifications/unread_count/', {
    signal,
  });
  return response.data.unread_count;
};

/**
 * Bulk mark notifications as read
 */
export const bulkMarkRead = async (
  notificationIds: number[],
  signal?: AbortSignal
): Promise<number> => {
  const response = await httpClient.post<BulkMarkReadResponse>(
    '/v1/notifications/bulk_mark_read/',
    { notification_ids: notificationIds },
    { signal }
  );
  return response.data.marked_read_count;
};

/**
 * Get overdue notifications
 */
export const getOverdueNotifications = async (
  signal?: AbortSignal
): Promise<Notification[]> => {
  const response = await httpClient.get<Notification[]>('/v1/notifications/overdue/', { signal });
  return response.data;
};

export default {
  listNotifications,
  getNotification,
  updateNotification,
  markNotificationRead,
  getUnreadCount,
  bulkMarkRead,
  getOverdueNotifications,
};

