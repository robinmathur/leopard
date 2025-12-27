/**
 * TimelineItem Component
 * Displays a single timeline activity with linked entities and reminder dates
 * Inspired by Material-UI Timeline design with timestamp on left
 */
import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { TimelineItemProps, ACTIVITY_TYPE_CONFIG } from './types';
import NoteIcon from '@mui/icons-material/Note';

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
    color: '#1976d2',
    icon: NoteIcon,
  };
  
  const IconComponent = config.icon;

  const metadata = activity.metadata || {};
  const reminderDate = metadata.reminder_date as string | undefined;
  const reminderTime = metadata.reminder_time as string | undefined;
  const taskId = metadata.task_id as number | undefined;
  const visaApplicationId = metadata.visa_application_id as number | undefined;
  const applicationId = metadata.application_id as number | undefined;

  // Check if this is a note with reminder
  const hasReminder = reminderDate && activity.activity_type === 'NOTE_ADDED';

  return (
    <Box
      sx={{
        p: 2,
        borderLeft: 3,
        borderColor: config.color,
        position: 'relative',
        bgcolor: 'transparent',
        mb: 1.5,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderLeftWidth: 4,
          pl: 1.75, // Slight shift on hover
        },
      }}
    >
      {/* Activity Type Badge and Performer Info - Inline */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Chip
          label={config.label}
          size="small"
          sx={{
            bgcolor: config.color,
            color: 'white',
            fontWeight: 500,
            fontSize: '0.75rem',
            height: '24px',
          }}
          icon={
            <IconComponent 
              sx={{ 
                fontSize: '0.875rem', 
                color: 'white',
              }} 
            />
          }
        />
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            '&::before': {
              content: '"•"',
              mx: 0.5,
              color: 'text.disabled',
            },
          }}
        >
          by {activity.performed_by_name}
        </Typography>
      </Box>

      {/* Activity Description */}
      <Typography
        variant="body2"
        sx={{
          mb: 0.75,
          color: 'text.primary',
          fontSize: '0.875rem',
          lineHeight: 1.5,
        }}
      >
        {activity.description}
      </Typography>

      {/* Reminder Date (for notes with reminders) */}
      {hasReminder && (
        <Box sx={{ mb: 0.75 }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: '0.75rem' }}
          >
            <strong>Reminder:</strong> {formatReminderDate(reminderDate, reminderTime)}
          </Typography>
        </Box>
      )}

      {/* Linked Entities */}
      {(taskId || visaApplicationId || applicationId) && (
        <Box
          sx={{
            mt: 0.75,
            pt: 0.75,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {visaApplicationId && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(`/visa-manager/applications?applicationId=${visaApplicationId}`)}
              sx={{ 
                textTransform: 'none',
                fontSize: '0.75rem',
                py: 0.25,
                px: 1,
                minWidth: 'auto',
              }}
            >
              View Application
            </Button>
          )}
          {applicationId && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(`/visa-manager/applications?applicationId=${applicationId}`)}
              sx={{ 
                textTransform: 'none',
                fontSize: '0.75rem',
                py: 0.25,
                px: 1,
                minWidth: 'auto',
              }}
            >
              View Application
            </Button>
          )}
          {taskId && (
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.75rem' }}
            >
              Task ID: {taskId}
            </Typography>
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
    </Box>
  );
};

export default TimelineItem;
