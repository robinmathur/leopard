/**
 * TimelineItem Component
 * Displays a single timeline activity with linked entities and reminder dates
 */
import { Box, Typography, Paper, Chip, Button, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { TimelineItemProps, ACTIVITY_TYPE_CONFIG } from './types';

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
};

/**
 * Format reminder date for display
 */
const formatReminderDate = (dateString?: string, timeString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    if (timeString) {
      const [hours, minutes] = timeString.split(':');
      return `${dateStr} ${hours}:${minutes}`;
    }
    return dateStr;
  } catch {
    return dateString;
  }
};

export const TimelineItem = ({ activity }: TimelineItemProps) => {
  const navigate = useNavigate();
  const config = ACTIVITY_TYPE_CONFIG[activity.activity_type] || {
    label: activity.activity_type_display || activity.activity_type,
    color: '#757575',
    icon: '•',
  };

  const metadata = activity.metadata || {};
  const reminderDate = metadata.reminder_date as string | undefined;
  const reminderTime = metadata.reminder_time as string | undefined;
  const taskId = metadata.task_id as number | undefined;
  const visaApplicationId = metadata.visa_application_id as number | undefined;
  const applicationId = metadata.application_id as number | undefined;
  const noteId = metadata.note_id as number | undefined;

  // Check if this is a note with reminder
  const hasReminder = reminderDate && activity.activity_type === 'NOTE_ADDED';

  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        borderLeft: 4,
        borderColor: config.color,
        position: 'relative',
        bgcolor: 'background.paper',
      }}
    >
      {/* Activity Type Badge */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography component="span" sx={{ fontSize: '1.2rem' }}>
            {config.icon}
          </Typography>
          <Chip
            label={config.label}
            size="small"
            sx={{
              bgcolor: config.color,
              color: 'white',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {formatDate(activity.created_at)}
        </Typography>
      </Box>

      {/* Activity Description */}
      <Typography
        variant="body2"
        sx={{
          mb: 1,
          color: 'text.primary',
        }}
      >
        {activity.description}
      </Typography>

      {/* Reminder Date (for notes with reminders) */}
      {hasReminder && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Reminder Date:</strong> {formatReminderDate(reminderDate, reminderTime)}
          </Typography>
        </Box>
      )}

      {/* Linked Entities */}
      {(taskId || visaApplicationId || applicationId) && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          {visaApplicationId && (
            <Box sx={{ mb: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate(`/visa-manager/applications?applicationId=${visaApplicationId}`)}
                sx={{ textTransform: 'none' }}
              >
                View Application
              </Button>
            </Box>
          )}
          {applicationId && (
            <Box sx={{ mb: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate(`/visa-manager/applications?applicationId=${applicationId}`)}
                sx={{ textTransform: 'none' }}
              >
                View Application
              </Button>
            </Box>
          )}
          {taskId && (
            <Box sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Task ID: {taskId}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Additional Metadata (for other fields) */}
      {metadata && Object.keys(metadata).length > 0 && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: 1,
            borderColor: 'divider',
            display: 'none', // Hide raw metadata, we show specific fields above
          }}
        >
          {/* Keep this hidden but available for debugging */}
        </Box>
      )}

      {/* Performer Information */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        by {activity.performed_by_name}
      </Typography>
    </Paper>
  );
};

export default TimelineItem;
