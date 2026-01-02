/**
 * Notification Navigation Utility
 * Maps notification types and meta_info to routes for navigation
 */

import type { Notification, NotificationType, NotificationNavigationInfo } from '@/types/notification';

/**
 * Get navigation route for a notification based on its type and meta_info
 */
export function getNotificationRoute(notification: Notification): NotificationNavigationInfo | null {
  const { notification_type, meta_info } = notification;

  switch (notification_type) {
    case 'CLIENT_ASSIGNED':
      if (meta_info.entity_id && meta_info.entity_type === 'Client') {
        return {
          route: `/clients/${meta_info.entity_id}`,
        };
      }
      // Fallback: try to get client_id from meta_info
      if (typeof meta_info.client_id === 'number') {
        return {
          route: `/clients/${meta_info.client_id}`,
        };
      }
      break;

    case 'APPLICATION_ASSIGNED':
      if (meta_info.entity_id && meta_info.entity_type === 'Application') {
        return {
          route: `/applications/${meta_info.entity_id}`,
        };
      }
      // Fallback: try to get application_id from meta_info
      if (typeof meta_info.application_id === 'number') {
        return {
          route: `/applications/${meta_info.application_id}`,
        };
      }
      break;

    case 'VISA_APPLICATION_ASSIGNED':
      if (meta_info.entity_id && meta_info.entity_type === 'VisaApplication') {
        return {
          route: `/visa-applications/${meta_info.entity_id}`,
        };
      }
      // Fallback: try to get visa_application_id from meta_info
      if (typeof meta_info.visa_application_id === 'number') {
        return {
          route: `/visa-applications/${meta_info.visa_application_id}`,
        };
      }
      break;

    case 'TASK_ASSIGNED':
    case 'TASK_DUE_SOON':
    case 'TASK_OVERDUE':
    case 'TASK_MENTIONED':
      if (typeof meta_info.task_id === 'number') {
        return {
          route: '/tasks',
          params: { taskId: String(meta_info.task_id) },
        };
      }
      // Fallback: try entity_id if it's a Task
      if (meta_info.entity_id && meta_info.entity_type === 'Task') {
        return {
          route: '/tasks',
          params: { taskId: String(meta_info.entity_id) },
        };
      }
      break;

    case 'REMINDER_DUE':
      // Reminders are linked to entities via content_type and object_id
      if (typeof meta_info.content_type === 'number' && typeof meta_info.object_id === 'number') {
        // Check if it's a client reminder
        // ContentType ID for Client is typically 10 (but may vary)
        if (meta_info.content_type === 10 || meta_info.content_type_id === 10) {
          return {
            route: `/clients/${meta_info.object_id}`,
          };
        }
        // Could add more entity types here as needed
      }
      // Fallback: try client_id
      if (typeof meta_info.client_id === 'number') {
        return {
          route: `/clients/${meta_info.client_id}`,
        };
      }
      break;

    case 'SYSTEM_ALERT':
      // System alerts don't navigate anywhere
      return null;

    default:
      return null;
  }

  return null;
}

/**
 * Navigate to notification's target route
 * Returns true if navigation was successful, false otherwise
 */
export function navigateToNotification(
  notification: Notification,
  navigate: (path: string, options?: { state?: unknown; replace?: boolean }) => void
): boolean {
  const routeInfo = getNotificationRoute(notification);
  
  if (!routeInfo) {
    return false;
  }

  // Build route with query params if needed
  let route = routeInfo.route;
  if (routeInfo.params) {
    const params = new URLSearchParams(routeInfo.params);
    route = `${route}?${params.toString()}`;
  }

  navigate(route);
  return true;
}

