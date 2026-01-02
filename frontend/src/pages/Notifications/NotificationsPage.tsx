/**
 * NotificationsPage Component
 * Full page for notifications with filtering, grouping, and today's events
 */

import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Divider,
} from '@mui/material';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotificationStore } from '@/store/notificationStore';
import { NotificationList } from '@/components/notifications/NotificationList';
import { TodaysEventsWidget } from '@/components/dashboard/TodaysEventsWidget';
import type { NotificationType } from '@/types/notification';

/**
 * Get notification types for a category
 */
function getNotificationTypesForCategory(
  category: string
): NotificationType[] | 'all' {
  switch (category) {
    case 'assignments':
      return ['CLIENT_ASSIGNED', 'APPLICATION_ASSIGNED', 'VISA_APPLICATION_ASSIGNED'];
    case 'tasks':
      return ['TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'TASK_MENTIONED'];
    case 'reminders':
      return ['REMINDER_DUE'];
    case 'system':
      return ['SYSTEM_ALERT'];
    default:
      return 'all';
  }
}

/**
 * NotificationsPage Component
 */
export const NotificationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    filterType,
    filterRead,
    setFilterType,
    setFilterRead,
    bulkMarkAsRead,
    notifications,
    fetchNotifications,
  } = useNotificationStore();

  // Get category from URL
  const categoryParam = searchParams.get('type');
  const categoryTypes = categoryParam ? getNotificationTypesForCategory(categoryParam) : 'all';

  // Fetch notifications when filters change
  useEffect(() => {
    fetchNotifications(1, true);
  }, [filterType, filterRead, fetchNotifications]);

  // Filter notifications by category if URL param is set
  const filteredNotifications = categoryTypes !== 'all' && Array.isArray(categoryTypes)
    ? notifications.filter((n) => categoryTypes.includes(n.notification_type as NotificationType))
    : notifications;

  const handleMarkAllRead = async () => {
    const unreadIds = filteredNotifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await bulkMarkAsRead(unreadIds);
    }
  };

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Notifications
        </Typography>
        {unreadCount > 0 && (
          <Button variant="outlined" size="small" onClick={handleMarkAllRead}>
            Mark All Read ({unreadCount})
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  label="Type"
                  onChange={(e) => setFilterType(e.target.value as NotificationType | 'all')}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="CLIENT_ASSIGNED">Client Assigned</MenuItem>
                  <MenuItem value="APPLICATION_ASSIGNED">Application Assigned</MenuItem>
                  <MenuItem value="VISA_APPLICATION_ASSIGNED">Visa Application Assigned</MenuItem>
                  <MenuItem value="TASK_ASSIGNED">Task Assigned</MenuItem>
                  <MenuItem value="TASK_DUE_SOON">Task Due Soon</MenuItem>
                  <MenuItem value="TASK_OVERDUE">Task Overdue</MenuItem>
                  <MenuItem value="TASK_MENTIONED">Task Mentioned</MenuItem>
                  <MenuItem value="REMINDER_DUE">Reminder Due</MenuItem>
                  <MenuItem value="SYSTEM_ALERT">System Alert</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterRead}
                  label="Status"
                  onChange={(e) => setFilterRead(e.target.value as 'all' | 'unread' | 'read')}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="unread">Unread</MenuItem>
                  <MenuItem value="read">Read</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Show category filter if URL param is set */}
            {categoryParam && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing: {categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)} notifications
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      searchParams.delete('type');
                      setSearchParams(searchParams, { replace: true });
                    }}
                    sx={{ ml: 1 }}
                  >
                    Clear filter
                  </Button>
                </Typography>
              </Box>
            )}

            {/* Notification List */}
            <NotificationList groupByDate={true} notifications={filteredNotifications} />
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Today's Events */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Today's Events
              </Typography>
              <TodaysEventsWidget compact={true} />
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

