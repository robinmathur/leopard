/**
 * TimelineWithNotes Component
 * Enhanced timeline component with note creation and reminder conversion
 */
import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Skeleton,
  Divider,
  CircularProgress,
  Paper,
  TextField,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { TimelineProps } from './types';
import { TimelineItem } from './TimelineItem';
import { TimelineFilters } from './TimelineFilters';
import { TimelineDateHeader } from './TimelineDateHeader';
import { groupActivitiesBySmartDate, formatTimelineDate } from '@/utils/dateGrouping';
import { ACTIVITY_TYPE_CONFIG } from './types';
import { useRelativeTime } from '@/utils/useRelativeTime';
import NoteIcon from '@mui/icons-material/Note';
import { SvgIconComponent } from '@mui/icons-material';
import {
  Timeline as MuiTimeline,
  TimelineItem as MuiTimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
  TimelineDot,
} from '@mui/lab';
import { ClientActivity } from './types';
import { useNoteStore } from '@/store/noteStore';
import { createReminder, CLIENT_CONTENT_TYPE_ID } from '@/services/api/reminderApi';
import { usePermission } from '@/auth/hooks/usePermission';

interface TimelineWithNotesProps extends TimelineProps {
  /** Client ID for creating notes and reminders */
  clientId: number;
  /** Callback when note is added (to refresh timeline) */
  onNoteAdded?: () => void;
}

/**
 * Loading skeleton for timeline
 */
const TimelineSkeleton = () => (
  <Box>
    {[...Array(5)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * TimelineWithNotes Component
 */
export const TimelineWithNotes = ({
  activities,
  isLoading = false,
  error = null,
  hasMore = false,
  onLoadMore,
  activeFilter = null,
  onFilterChange,
  showFilters = true,
  clientId,
  onNoteAdded,
}: TimelineWithNotesProps) => {
  const { addNote } = useNoteStore();
  const { hasPermission } = usePermission();
  const canAddNote = hasPermission('add_note');
  const canAddReminder = hasPermission('add_reminder');

  // Note form state
  const [noteContent, setNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [addToReminder, setAddToReminder] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

  // Handle adding a note
  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      return;
    }

    setIsAddingNote(true);
    try {
      await addNote({ client: clientId, content: noteContent.trim() });
      setNoteContent('');
      setShowNoteForm(false);
      setAddToReminder(false);
      onNoteAdded?.();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle converting note to reminder
  const handleConvertToReminder = () => {
    if (!noteContent.trim()) {
      return;
    }

    // If add to reminder is checked, show dialog for date/time
    if (addToReminder) {
      setReminderDialogOpen(true);
    } else {
      // Just add note without reminder
      handleAddNote();
    }
  };

  // Handle creating note with reminder
  const handleCreateNoteWithReminder = async () => {
    if (!noteContent.trim() || !reminderDate) {
      return;
    }

    setIsSubmittingReminder(true);
    try {
      // First create the note
      await addNote({ client: clientId, content: noteContent.trim() });

      // Then create the reminder
      await createReminder({
        title: noteContent.trim().substring(0, 255), // Reminder title max 255 chars
        reminder_date: reminderDate,
        reminder_time: reminderTime || undefined,
        content_type: CLIENT_CONTENT_TYPE_ID,
        object_id: clientId,
        meta_info: {
          note_content: noteContent.trim(),
        },
      });

      // Reset form
      setNoteContent('');
      setShowNoteForm(false);
      setAddToReminder(false);
      setReminderDate('');
      setReminderTime('');
      setReminderDialogOpen(false);
      onNoteAdded?.();
    } catch (err) {
      console.error('Failed to create note with reminder:', err);
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  // Loading state (initial load)
  if (isLoading && activities.length === 0) {
    return <TimelineSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Note Creation Form */}
      {canAddNote && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {!showNoteForm ? (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setShowNoteForm(true)}
              fullWidth
              size="small"
            >
              Type a Comment
            </Button>
          ) : (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Type a Comment"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                disabled={isAddingNote || isSubmittingReminder}
                sx={{ mb: 1 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={addToReminder}
                    onChange={(e) => setAddToReminder(e.target.checked)}
                    disabled={isAddingNote || isSubmittingReminder}
                  />
                }
                label="Add to Reminder"
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowNoteForm(false);
                    setNoteContent('');
                    setAddToReminder(false);
                  }}
                  disabled={isAddingNote || isSubmittingReminder}
                  size="small"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConvertToReminder}
                  disabled={!noteContent.trim() || isAddingNote || isSubmittingReminder}
                  size="small"
                >
                  {isAddingNote ? 'Posting...' : 'Post a Comment'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Reminder Date/Time Dialog */}
      <Dialog
        open={reminderDialogOpen}
        onClose={() => !isSubmittingReminder && setReminderDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Set Reminder Date and Time</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Reminder Date"
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              fullWidth
              required
              disabled={isSubmittingReminder}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Reminder Time (Optional)"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              fullWidth
              disabled={isSubmittingReminder}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setReminderDialogOpen(false)}
            disabled={isSubmittingReminder}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateNoteWithReminder}
            variant="contained"
            disabled={!reminderDate || isSubmittingReminder}
          >
            {isSubmittingReminder ? 'Creating...' : 'Create Note & Reminder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filters */}
      {showFilters && onFilterChange && (
        <TimelineFilters
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
      )}

      {/* Timeline Items */}
      {activities.length === 0 ? (
        <Box
          sx={{
            py: 6,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No activities yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeFilter
              ? 'No activities match the selected filter.'
              : 'Activities will appear here as actions are performed.'}
          </Typography>
        </Box>
      ) : (
        <>
          <Divider sx={{ mb: 2 }} />
          {/* Timeline with date grouping */}
          <GroupedTimelineContent activities={activities} />

          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={onLoadMore}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={16} /> : null}
              >
                {isLoading ? 'Loading...' : 'More'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

/**
 * GroupedTimelineContent Component
 * Renders grouped timeline activities with date headers using Material-UI Timeline
 */
const GroupedTimelineContent = ({ activities }: { activities: any[] }) => {
  // Group activities by smart date ranges (Today, This Week, This Month, This Year, then by year)
  const groupedActivities = groupActivitiesBySmartDate(activities);

  return (
    <Box>
      {groupedActivities.map((group, groupIndex) => (
        <Box key={group.key}>
          {/* Date Header */}
          <TimelineDateHeader label={group.label} date={group.date} />

          {/* Material-UI Timeline */}
          <MuiTimeline 
            position="right" 
            sx={{ 
              pl: 0, 
              pr: 0,
              '& .MuiTimelineItem-root': {
                minHeight: 'auto',
                '&:before': {
                  display: 'none',
                },
              },
            }}
          >
            {group.activities.map((activity, activityIndex) => {
              const config = ACTIVITY_TYPE_CONFIG[activity.activity_type] || {
                color: '#1976d2',
                icon: NoteIcon,
              };
              const isLast = activityIndex === group.activities.length - 1;
              const IconComponent = config.icon;

              return (
                <TimelineItemWithTimestamp
                  key={activity.id}
                  activity={activity}
                  config={config}
                  iconComponent={IconComponent}
                  isLast={isLast}
                />
              );
            })}
          </MuiTimeline>
        </Box>
      ))}
    </Box>
  );
};

/**
 * TimelineItemWithTimestamp Component
 * Wraps TimelineItem with Material-UI Timeline components and timestamp
 */
const TimelineItemWithTimestamp = ({
  activity,
  config,
  iconComponent: IconComponent,
  isLast,
}: {
  activity: ClientActivity;
  config: { color: string; icon: SvgIconComponent };
  iconComponent: SvgIconComponent;
  isLast: boolean;
}) => {
  const relativeTime = useRelativeTime(activity.created_at);
  const { time, date } = formatTimelineDate(activity.created_at);
  
  // Format date more compactly for timeline
  const formatCompactDate = (dateString: string): string => {
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }
    
    // Check if it's yesterday
    if (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }
    
    // Check if it's this year
    if (d.getFullYear() === today.getFullYear()) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
    
    // Otherwise show full date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const compactDate = formatCompactDate(activity.created_at);

  return (
    <MuiTimelineItem>
      {/* Timestamp on left */}
      <TimelineOppositeContent
        sx={{
          flex: 0.15,
          minWidth: '120px',
          maxWidth: '150px',
          pr: 3,
          textAlign: 'right',
          alignSelf: 'flex-start',
          pt: 0.5,
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600, 
            color: 'text.primary',
            fontSize: '0.875rem',
            lineHeight: 1.2,
            mb: 0.25,
          }}
        >
          {compactDate}
        </Typography>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          {time}
        </Typography>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block',
            fontSize: '0.7rem',
            mt: 0.125,
          }}
        >
          {relativeTime}
        </Typography>
      </TimelineOppositeContent>

      {/* Timeline separator with dot */}
      <TimelineSeparator>
        <TimelineDot
          sx={{
            bgcolor: config.color,
            color: 'white',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: 'none',
          }}
        >
          <IconComponent sx={{ fontSize: '1.125rem' }} />
        </TimelineDot>
        {!isLast && (
          <TimelineConnector 
            sx={{
              bgcolor: 'primary.main',
              opacity: 0.2,
            }}
          />
        )}
      </TimelineSeparator>

      {/* Activity content on right */}
      <TimelineContent 
        sx={{ 
          pl: 2, 
          pr: 0,
          py: 0,
          flex: 1,
        }}
      >
        <TimelineItem activity={activity} />
      </TimelineContent>
    </MuiTimelineItem>
  );
};

export default TimelineWithNotes;
