import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useEventStore } from '@/store/eventStore';
import { useAuthStore } from '@/store/authStore';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import type { CalendarEvent } from '@/types/event';
import type { User } from '@/types/user';

interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialStart?: Date;
  initialEnd?: Date;
  event?: CalendarEvent | null;
}

export const EventFormDialog: React.FC<EventFormDialogProps> = ({
  open,
  onClose,
  initialStart,
  initialEnd,
  event,
}) => {
  const { createEvent, updateEvent, isLoading } = useEventStore();
  const { user: currentUser, hasPermission } = useAuthStore();

  const canAssignToOthers = hasPermission('assign_calendarevent_to_others');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: initialStart || new Date(),
    end: initialEnd || new Date(Date.now() + 3600000), // +1 hour
    location: '',
    hex_color: '#3788d8',
    all_day: false,
  });

  const [assignedToUser, setAssignedToUser] = useState<User | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Populate form when editing an event
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description,
        start: new Date(event.start),
        end: new Date(event.end),
        location: event.location,
        hex_color: event.hex_color,
        all_day: event.all_day,
      });
    } else if (initialStart && initialEnd) {
      // Auto-populate from calendar selection
      setFormData((prev) => ({
        ...prev,
        start: initialStart,
        end: initialEnd,
      }));
    }
  }, [event, initialStart, initialEnd]);

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (formData.end <= formData.start) {
      setError('End time must be after start time');
      return;
    }

    try {
      // Auto-assign to current user if no user is selected
      const assignedToId = canAssignToOthers
        ? (assignedToUser?.id || currentUser?.id)
        : currentUser?.id;

      const payload = {
        title: formData.title,
        description: formData.description,
        start: formData.start.toISOString(),
        end: formData.end.toISOString(),
        location: formData.location,
        hex_color: formData.hex_color,
        all_day: formData.all_day,
        assigned_to_id: assignedToId,
      };

      if (event) {
        // Update existing event
        await updateEvent(event.id, payload);
      } else {
        // Create new event
        await createEvent(payload);
      }

      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    }
  };

  const handleClose = () => {
    // Reset form
    setFormData({
      title: '',
      description: '',
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      location: '',
      hex_color: '#3788d8',
      all_day: false,
    });
    setAssignedToUser(null);
    setError(null);
    onClose();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {event ? 'Edit Event' : 'Create Event'}
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
              autoFocus
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />

            <DateTimePicker
              label="Start"
              value={formData.start}
              onChange={(newValue) => {
                if (newValue) {
                  setFormData({ ...formData, start: newValue });
                }
              }}
              slotProps={{
                textField: { fullWidth: true, required: true },
              }}
            />

            <DateTimePicker
              label="End"
              value={formData.end}
              onChange={(newValue) => {
                if (newValue) {
                  setFormData({ ...formData, end: newValue });
                }
              }}
              slotProps={{
                textField: { fullWidth: true, required: true },
              }}
            />

            <TextField
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              fullWidth
              placeholder="Meeting room, video link, etc."
            />

            {canAssignToOthers && (
              <UserAutocomplete
                value={assignedToUser}
                onChange={setAssignedToUser}
                label="Assign To"
                placeholder="Search for a user to assign this event..."
                helperText="Leave empty to assign to yourself"
              />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                label="Color"
                type="color"
                value={formData.hex_color}
                onChange={(e) => setFormData({ ...formData, hex_color: e.target.value })}
                sx={{ width: 120 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.all_day}
                    onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                  />
                }
                label="All day"
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            {event ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};
