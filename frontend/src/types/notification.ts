/**
 * Notification Types
 */

export type NotificationType =
  | 'CLIENT_ASSIGNED'
  | 'APPLICATION_ASSIGNED'
  | 'VISA_APPLICATION_ASSIGNED'
  | 'REMINDER_DUE'
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'TASK_MENTIONED'
  | 'SYSTEM_ALERT';

export interface Notification {
  id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  due_date: string | null; // ISO datetime
  meta_info: Record<string, unknown>;
  read: boolean;
  read_at: string | null; // ISO datetime
  is_completed: boolean;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface NotificationListParams {
  include_read?: boolean;
  type?: NotificationType;
  page?: number;
  page_size?: number;
}

export interface NotificationUpdateParams {
  read?: boolean;
  is_completed?: boolean;
}

export interface NotificationNavigationInfo {
  route: string;
  params?: Record<string, string>;
}

