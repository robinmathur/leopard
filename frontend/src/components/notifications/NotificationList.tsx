/**
 * NotificationList Component
 * Full list view with pagination, filtering, and grouping
 */

import {
  Box,
  Typography,
  Alert,
  Skeleton,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { NotificationItem } from './NotificationItem';
import { navigateToNotification } from '@/utils/notificationNavigation';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@/types/notification';

export interface NotificationListProps {
  onNotificationClick?: (notification: Notification) => void;
  showFilters?: boolean;
  groupByDate?: boolean;
  notifications?: Notification[]; // Optional: use custom filtered notifications
}

/**
 * Group notifications by date
 */
function groupNotificationsByDate(notifications: Notification[]): {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  older: Notification[];
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const groups = {
    today: [] as Notification[],
    yesterday: [] as Notification[],
    thisWeek: [] as Notification[],
    older: [] as Notification[],
  };

  notifications.forEach((notification) => {
    const notificationDate = new Date(notification.created_at);
    
    if (notificationDate >= today) {
      groups.today.push(notification);
    } else if (notificationDate >= yesterday) {
      groups.yesterday.push(notification);
    } else if (notificationDate >= thisWeek) {
      groups.thisWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
}

/**
 * Loading skeleton
 */
const NotificationListSkeleton = () => (
  <Box>
    {[...Array(5)].map((_, index) => (
      <Box key={index} sx={{ mb: 1 }}>
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * NotificationList Component
 */
export const NotificationList = ({
  onNotificationClick,
  showFilters = false,
  groupByDate = true,
  notifications: customNotifications,
}: NotificationListProps) => {
  const navigate = useNavigate();
  const {
    notifications: storeNotifications,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    fetchNotifications,
    markAsRead,
    currentPage,
  } = useNotificationStore();

  // Use custom notifications if provided, otherwise use store notifications
  const notifications = customNotifications || storeNotifications;

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate if route is available
    const navigated = navigateToNotification(notification, navigate);
    
    // Call custom handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchNotifications(currentPage + 1, false);
    }
  };

  // Loading state
  if (isLoading && notifications.length === 0) {
    return <NotificationListSkeleton />;
  }

  // Error state
  if (error && notifications.length === 0) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error.message || 'Failed to load notifications'}
      </Alert>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No notifications found
        </Typography>
      </Box>
    );
  }

  // Group by date if enabled
  if (groupByDate) {
    const groups = groupNotificationsByDate(notifications);

    return (
      <Box>
        {/* Today */}
        {groups.today.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
              Today ({groups.today.length})
            </Typography>
            {groups.today.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onClick={handleNotificationClick}
              />
            ))}
          </Box>
        )}

        {/* Yesterday */}
        {groups.yesterday.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {groups.today.length > 0 && <Divider sx={{ my: 2 }} />}
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
              Yesterday ({groups.yesterday.length})
            </Typography>
            {groups.yesterday.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onClick={handleNotificationClick}
              />
            ))}
          </Box>
        )}

        {/* This Week */}
        {groups.thisWeek.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {(groups.today.length > 0 || groups.yesterday.length > 0) && <Divider sx={{ my: 2 }} />}
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
              This Week ({groups.thisWeek.length})
            </Typography>
            {groups.thisWeek.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onClick={handleNotificationClick}
              />
            ))}
          </Box>
        )}

        {/* Older */}
        {groups.older.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {(groups.today.length > 0 || groups.yesterday.length > 0 || groups.thisWeek.length > 0) && (
              <Divider sx={{ my: 2 }} />
            )}
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
              Older ({groups.older.length})
            </Typography>
            {groups.older.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onClick={handleNotificationClick}
              />
            ))}
          </Box>
        )}

        {/* Load More */}
        {hasMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              startIcon={isLoadingMore ? <CircularProgress size={16} /> : null}
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  // Simple list without grouping
  return (
    <Box>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={markAsRead}
          onClick={handleNotificationClick}
        />
      ))}

      {/* Load More */}
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            startIcon={isLoadingMore ? <CircularProgress size={16} /> : null}
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

