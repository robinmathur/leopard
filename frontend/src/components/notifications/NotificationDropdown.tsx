/**
 * NotificationDropdown Component
 * Dropdown menu in AppBar with unread count badge and recent notifications
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
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/notificationStore';
import { NotificationItem } from './NotificationItem';
import { navigateToNotification } from '@/utils/notificationNavigation';
import type { Notification } from '@/types/notification';

/**
 * NotificationDropdown Component
 */
export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    fetchUnreadCount,
  } = useNotificationStore();

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Fetch recent notifications when dropdown opens
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
    navigate('/notifications');
    handleClose();
  };

  // Get recent unread notifications (last 10)
  const recentNotifications = notifications
    .filter((n) => !n.read)
    .slice(0, 10);

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ position: 'relative' }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
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
              Notifications
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
                No new notifications
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
              View All Notifications
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

