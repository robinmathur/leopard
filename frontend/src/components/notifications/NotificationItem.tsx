/**
 * NotificationItem Component
 * Individual notification card with icon, content, and actions
 */

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  FlightTakeoff as VisaIcon,
  Task as TaskIcon,
  NotificationsActive as ReminderIcon,
  Warning as SystemIcon,
  CheckCircle as CheckCircleIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { Notification, NotificationType } from '@/types/notification';

export interface NotificationItemProps {
  notification: Notification;
  onMarkRead?: (id: number) => void;
  onClick?: (notification: Notification) => void;
  showActions?: boolean;
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'CLIENT_ASSIGNED':
      return <PersonIcon fontSize="small" />;
    case 'APPLICATION_ASSIGNED':
      return <AssignmentIcon fontSize="small" />;
    case 'VISA_APPLICATION_ASSIGNED':
      return <VisaIcon fontSize="small" />;
    case 'TASK_ASSIGNED':
    case 'TASK_DUE_SOON':
    case 'TASK_OVERDUE':
    case 'TASK_MENTIONED':
      return <TaskIcon fontSize="small" />;
    case 'REMINDER_DUE':
      return <ReminderIcon fontSize="small" />;
    case 'SYSTEM_ALERT':
      return <SystemIcon fontSize="small" />;
    default:
      return <CircleIcon fontSize="small" />;
  }
}

/**
 * Get color for notification type
 */
function getNotificationColor(type: NotificationType): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' {
  switch (type) {
    case 'CLIENT_ASSIGNED':
    case 'APPLICATION_ASSIGNED':
    case 'VISA_APPLICATION_ASSIGNED':
      return 'primary';
    case 'TASK_ASSIGNED':
      return 'info';
    case 'TASK_DUE_SOON':
      return 'warning';
    case 'TASK_OVERDUE':
      return 'error';
    case 'REMINDER_DUE':
      return 'warning';
    case 'SYSTEM_ALERT':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Format notification time
 */
function formatNotificationTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
}

/**
 * NotificationItem Component
 */
export const NotificationItem = ({
  notification,
  onMarkRead,
  onClick,
  showActions = true,
}: NotificationItemProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
    // Auto-mark as read on click if unread
    if (!notification.read && onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  const icon = getNotificationIcon(notification.notification_type);
  const color = getNotificationColor(notification.notification_type);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 1,
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: 3,
        borderColor: notification.read ? 'divider' : `${color}.main`,
        bgcolor: notification.read ? 'background.paper' : 'action.hover',
        opacity: notification.read ? 0.7 : 1,
        '&:hover': {
          bgcolor: 'action.hover',
        },
        transition: 'all 0.2s',
      }}
      onClick={handleClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {/* Icon */}
        <Box
          sx={{
            color: `${color}.main`,
            mt: 0.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="subtitle2"
              fontWeight={notification.read ? 400 : 600}
              sx={{
                textDecoration: notification.read ? 'none' : 'none',
                flex: 1,
              }}
            >
              {notification.title}
            </Typography>
            {!notification.read && (
              <Chip
                label="New"
                size="small"
                color={color}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            {notification.message}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              {formatNotificationTime(notification.created_at)}
            </Typography>
            {notification.due_date && (
              <>
                <Typography variant="caption" color="text.secondary">
                  •
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Due: {formatNotificationTime(notification.due_date)}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* Actions */}
        {showActions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {!notification.read && (
              <Tooltip title="Mark as read">
                <IconButton
                  size="small"
                  onClick={handleMarkRead}
                  sx={{ color: 'text.secondary' }}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

