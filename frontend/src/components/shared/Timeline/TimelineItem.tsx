/**
 * TimelineItem Component
 * Displays a single timeline activity with linked entities and reminder dates
 * Inspired by Material-UI Timeline design with timestamp on left
 */
import { Box, Typography, Chip } from '@mui/material';
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

  /**
   * Render description with clickable chips for applications
   */
  const renderDescription = () => {
    const description = activity.description;

    // For Visa Applications
    if (visaApplicationId && description.includes('Visa Application')) {
      const parts = description.split('Visa Application');
      return (
        <Box component="span">
          {parts[0]}
          <Chip
            label="Visa Application"
            size="small"
            onClick={() => navigate(`/visa-applications/${visaApplicationId}`, {
              state: { from: `/clients/${activity.client}` }
            })}
            sx={{
              cursor: 'pointer',
              bgcolor: '#1976d2',
              color: 'white',
              fontWeight: 500,
              fontSize: '0.65rem',
              height: '18px',
              mx: 0.5,
              '&:hover': {
                bgcolor: '#1565c0',
              },
            }}
          />
          {parts[1]}
        </Box>
      );
    }

    // For College Applications
    if (applicationId && description.includes('College Application')) {
      const parts = description.split('College Application');
      return (
        <Box component="span">
          {parts[0]}
          <Chip
            label="College Application"
            size="small"
            onClick={() => navigate(`/clients/${activity.client}?tab=applications&collegeApplicationId=${applicationId}`)}
            sx={{
              cursor: 'pointer',
              bgcolor: '#1976d2',
              color: 'white',
              fontWeight: 500,
              fontSize: '0.65rem',
              height: '18px',
              mx: 0.5,
              '&:hover': {
                bgcolor: '#1565c0',
              },
            }}
          />
          {parts[1]}
        </Box>
      );
    }

    // Default: plain text
    return description;
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderLeft: 3,
        borderColor: config.color,
        position: 'relative',
        bgcolor: 'transparent',
        mb: 1.5,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderLeftWidth: 4,
          pl: 1.25, // Slight shift on hover
        },
      }}
    >
      {/* Activity Type Badge and Performer Info - Inline */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, flexWrap: 'wrap' }}>
        <Chip
          label={config.label}
          size="small"
          sx={{
            bgcolor: config.color,
            color: 'white',
            fontWeight: 500,
            fontSize: '0.65rem',
            height: '18px',
            opacity: 0.7,
            '& .MuiChip-icon': {
              color: 'white !important',
            },
          }}
          icon={
            <IconComponent 
              sx={{ 
                fontSize: '0.7rem', 
                color: 'white !important',
              }} 
            />
          }
        />
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            fontSize: '0.7rem',
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
        component="div"
        sx={{
          mb: 0.5,
          color: 'text.primary',
          fontSize: '0.8rem',
          lineHeight: 1.4,
        }}
      >
        {renderDescription()}
      </Typography>

      {/* Reminder Date (for notes with reminders) */}
      {hasReminder && (
        <Box sx={{ mb: 0.5 }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: '0.7rem' }}
          >
            <strong>Reminder:</strong> {formatReminderDate(reminderDate, reminderTime)}
          </Typography>
        </Box>
      )}

      {/* Linked Entities - Only show task ID if present (applications are now clickable chips in description) */}
      {taskId && (
        <Box
          sx={{
            mt: 0.5,
            pt: 0.5,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 0.75,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: '0.7rem' }}
          >
            Task ID: {taskId}
          </Typography>
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
