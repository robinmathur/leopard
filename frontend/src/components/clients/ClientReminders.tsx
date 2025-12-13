/**
 * ClientReminders Component
 * Displays and manages reminders for a client
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
  listReminders,
  createReminder,
  deleteReminder,
  completeReminder,
  Reminder,
  CLIENT_CONTENT_TYPE_ID,
} from '@/services/api/reminderApi';

export interface ClientRemindersProps {
  /** Client ID */
  clientId: number;
}

/**
 * Format date for display
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Format time for display
 */
const formatTime = (timeString?: string): string => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

/**
 * Check if reminder is upcoming (in future)
 */
const isUpcoming = (dateString?: string, timeString?: string): boolean => {
  if (!dateString) return false;
  
  try {
    const now = new Date();
    const reminderDate = new Date(dateString);
    
    if (timeString) {
      const [hours, minutes] = timeString.split(':');
      reminderDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    } else {
      reminderDate.setHours(23, 59, 59, 999);
    }
    
    return reminderDate > now;
  } catch {
    return false;
  }
};

/**
 * Loading skeleton - Compact version
 */
const RemindersSkeleton = () => (
  <Box>
    {[...Array(3)].map((_, index) => (
      <Box key={index} sx={{ mb: 1 }}>
        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Reminder card - Compact version
 */
const ReminderCard = ({
  reminder,
  onComplete,
  onDelete,
}: {
  reminder: Reminder;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
}) => {
  const upcoming = isUpcoming(reminder.reminder_date, reminder.reminder_time);
  const isPast = !upcoming && !reminder.is_completed;

  // Combine date and time for compact display
  const dateTimeDisplay = (() => {
    const dateStr = reminder.reminder_date ? formatDate(reminder.reminder_date) : '';
    const timeStr = reminder.reminder_time ? formatTime(reminder.reminder_time) : '';
    if (dateStr && timeStr) return `${dateStr} at ${timeStr}`;
    if (dateStr) return dateStr;
    return 'No date set';
  })();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 1,
        borderLeft: 3,
        borderColor: reminder.is_completed
          ? 'success.main'
          : upcoming
          ? 'primary.main'
          : 'warning.main',
        opacity: reminder.is_completed ? 0.7 : 1,
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          <NotificationsActiveIcon
            color={reminder.is_completed ? 'disabled' : upcoming ? 'primary' : 'warning'}
            fontSize="small"
            sx={{ flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
              <Typography
                variant="body2"
                fontWeight={reminder.is_completed ? 400 : 600}
                sx={{
                  textDecoration: reminder.is_completed ? 'line-through' : 'none',
                  flex: '1 1 auto',
                  minWidth: 0,
                }}
              >
                {reminder.title}
              </Typography>
              {reminder.is_completed && (
                <Chip label="Done" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
              {isPast && !reminder.is_completed && (
                <Chip label="Overdue" size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 14 }} />
                {dateTimeDisplay}
              </Typography>
              {reminder.created_by_name && (
                <Typography variant="caption" color="text.secondary">
                  • {reminder.created_by_name}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {!reminder.is_completed && (
            <IconButton
              size="small"
              color="success"
              onClick={() => onComplete(reminder.id)}
              title="Mark as completed"
              sx={{ p: 0.75 }}
            >
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(reminder.id)}
            title="Delete reminder"
            sx={{ p: 0.75 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

/**
 * ClientReminders Component
 */
export const ClientReminders = ({ clientId }: ClientRemindersProps) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  // Fetch reminders
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Using content_type and object_id for generic FK
        const response = await listReminders({
          content_type: CLIENT_CONTENT_TYPE_ID,
          object_id: clientId,
        });
        
        // Sort by date/time (upcoming first, then past)
        const sorted = response.results.sort((a, b) => {
          const aUpcoming = isUpcoming(a.reminder_date, a.reminder_time);
          const bUpcoming = isUpcoming(b.reminder_date, b.reminder_time);
          
          if (aUpcoming && !bUpcoming) return -1;
          if (!aUpcoming && bUpcoming) return 1;
          
          const dateA = new Date(a.reminder_date || '').getTime();
          const dateB = new Date(b.reminder_date || '').getTime();
          return dateB - dateA;
        });
        
        setReminders(sorted);
      } catch (err) {
        setError((err as Error).message || 'Failed to load reminders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  // Handle add reminder
  const handleAdd = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newReminder = await createReminder({
        title: title.trim(),
        reminder_date: reminderDate || undefined,
        reminder_time: reminderTime || undefined,
        content_type: CLIENT_CONTENT_TYPE_ID,
        object_id: clientId,
      });

      setReminders((prev) => [newReminder, ...prev]);
      setAddDialogOpen(false);
      setTitle('');
      setReminderDate('');
      setReminderTime('');
    } catch (err) {
      setError((err as Error).message || 'Failed to create reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle complete
  const handleComplete = async (id: number) => {
    try {
      const updated = await completeReminder(id);
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    } catch (err) {
      setError((err as Error).message || 'Failed to complete reminder');
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    try {
      await deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError((err as Error).message || 'Failed to delete reminder');
    }
  };

  // Separate upcoming and past reminders
  const upcomingReminders = reminders.filter(
    (r) => !r.is_completed && isUpcoming(r.reminder_date, r.reminder_time)
  );
  const pastReminders = reminders.filter(
    (r) => r.is_completed || !isUpcoming(r.reminder_date, r.reminder_time)
  );

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Reminders
        </Typography>
        <RemindersSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Reminders</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Reminder
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
            Upcoming ({upcomingReminders.length})
          </Typography>
          {upcomingReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}

      {upcomingReminders.length > 0 && pastReminders.length > 0 && <Divider sx={{ my: 2 }} />}

      {/* Past Reminders */}
      {pastReminders.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
            Past & Completed ({pastReminders.length})
          </Typography>
          {pastReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}

      {/* Empty state */}
      {reminders.length === 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No reminders yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a reminder to stay on top of important dates
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Reminder
          </Button>
        </Paper>
      )}

      {/* Add Reminder Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => !isSubmitting && setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Reminder</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              disabled={isSubmitting}
              placeholder="e.g., Follow up with client"
            />
            <TextField
              label="Date"
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              fullWidth
              disabled={isSubmitting}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Time (Optional)"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              fullWidth
              disabled={isSubmitting}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} variant="contained" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Adding...' : 'Add Reminder'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientReminders;
