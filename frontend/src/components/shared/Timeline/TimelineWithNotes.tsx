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
          <Box>
            {activities.map((activity) => (
              <TimelineItem key={activity.id} activity={activity} />
            ))}
          </Box>

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

export default TimelineWithNotes;
