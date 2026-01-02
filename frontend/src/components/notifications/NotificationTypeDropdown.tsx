/**
 * NotificationTypeDropdown Component
 * Dropdown menu for a specific notification type with badge count
 */

import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/notificationStore';
import { NotificationItem } from './NotificationItem';
import { navigateToNotification } from '@/utils/notificationNavigation';
import type { Notification, NotificationType } from '@/types/notification';

export interface NotificationTypeDropdownProps {
  notificationType: NotificationType | 'ASSIGNMENTS' | 'TASKS' | 'REMINDERS' | 'SYSTEM';
  icon: React.ReactNode;
  label: string;
  maxItems?: number;
}

/**
 * Get notification types for a category
 */
function getNotificationTypesForCategory(
  category: NotificationType | 'ASSIGNMENTS' | 'TASKS' | 'REMINDERS' | 'SYSTEM'
): NotificationType[] {
  switch (category) {
    case 'ASSIGNMENTS':
      return ['CLIENT_ASSIGNED', 'APPLICATION_ASSIGNED', 'VISA_APPLICATION_ASSIGNED'];
    case 'TASKS':
      return ['TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'TASK_MENTIONED'];
    case 'REMINDERS':
      return ['REMINDER_DUE'];
    case 'SYSTEM':
      return ['SYSTEM_ALERT'];
    default:
      return [category as NotificationType];
  }
}

/**
 * NotificationTypeDropdown Component
 */
export const NotificationTypeDropdown = ({
  notificationType,
  icon,
  label,
  maxItems = 10,
}: NotificationTypeDropdownProps) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const {
    notifications,
    isLoading,
    fetchNotifications,
    fetchNotificationsForBadges,
    markAsRead,
    fetchUnreadCount,
  } = useNotificationStore();

  // Get notification types for this category
  const types = getNotificationTypesForCategory(notificationType);

  // Fetch notifications and unread count on mount to show badge counts
  useEffect(() => {
    // Fetch unread notifications for badge counts if not already loaded
    if (notifications.length === 0) {
      fetchNotificationsForBadges();
    }
    // Always fetch unread count to ensure it's up to date
    fetchUnreadCount();
  }, [fetchNotificationsForBadges, fetchUnreadCount]);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications(1, true);
    }
  }, [open, fetchNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate
    navigateToNotification(notification, navigate);
    
    // Close dropdown
    handleClose();
  };

  const handleViewAll = () => {
    // Navigate to notifications page with filter
    const typeParam = notificationType === 'ASSIGNMENTS' 
      ? 'assignments'
      : notificationType === 'TASKS'
      ? 'tasks'
      : notificationType === 'REMINDERS'
      ? 'reminders'
      : 'system';
    navigate(`/notifications?type=${typeParam}`);
    handleClose();
  };

  // Filter notifications by type
  const filteredNotifications = notifications.filter((n) => 
    types.includes(n.notification_type as NotificationType)
  );

  // Get unread count for this category
  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  // Get recent unread notifications (last maxItems)
  const recentNotifications = filteredNotifications
    .filter((n) => !n.read)
    .slice(0, maxItems);

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ position: 'relative' }}
        title={label}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          {icon}
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            mt: 1,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              {label}
            </Typography>
            {unreadCount > 0 && (
              <Typography variant="body2" color="text.secondary">
                {unreadCount} unread
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : recentNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No new {label.toLowerCase()}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onClick={handleNotificationClick}
                  showActions={false}
                />
              ))}
            </Box>
          )}

          <Divider sx={{ mt: 2, mb: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button variant="text" size="small" onClick={handleViewAll}>
              View All {label}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

