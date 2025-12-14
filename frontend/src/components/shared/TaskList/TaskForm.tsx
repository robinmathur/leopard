/**
 * TaskForm Component
 * Form for creating and editing tasks
 */
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Chip,
  Autocomplete,
  Stack,
  Typography,
} from '@mui/material';
import { Task, TaskPriority, TaskCreateRequest, TaskUpdateRequest } from '@/services/api/taskApi';

export interface TaskFormProps {
  /** Initial task data for editing (optional) */
  initialData?: Task;
  /** Current user ID (for assignment) */
  currentUserId?: number;
  /** Available users for assignment */
  availableUsers?: Array<{ id: number; username: string; full_name: string; email: string }>;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Callback when form is submitted */
  onSubmit: (data: TaskCreateRequest | TaskUpdateRequest) => void;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Client ID for linking task to client */
  clientId?: number;
}

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm)
 */
const formatDateForInput = (date: Date | null): string => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * TaskForm Component
 */
export const TaskForm = ({
  initialData,
  currentUserId,
  availableUsers = [],
  isSubmitting = false,
  onSubmit,
  onCancel,
  clientId,
}: TaskFormProps) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [detail, setDetail] = useState(initialData?.detail || '');
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || 'MEDIUM');
  const [dueDateInput, setDueDateInput] = useState<string>(
    initialData?.due_date ? formatDateForInput(new Date(initialData.due_date)) : ''
  );
  
  // Find the assigned user object from availableUsers
  const getSelectedUser = () => {
    if (initialData?.assigned_to && availableUsers.length > 0) {
      return availableUsers.find(u => u.id === initialData.assigned_to) || null;
    }
    if (currentUserId && availableUsers.length > 0) {
      return availableUsers.find(u => u.id === currentUserId) || availableUsers[0];
    }
    return availableUsers.length > 0 ? availableUsers[0] : null;
  };
  
  const [selectedUser, setSelectedUser] = useState<typeof availableUsers[0] | null>(getSelectedUser());
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when initialData or availableUsers changes
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDetail(initialData.detail || '');
      setPriority(initialData.priority || 'MEDIUM');
      setDueDateInput(initialData.due_date ? formatDateForInput(new Date(initialData.due_date)) : '');
      setSelectedUser(getSelectedUser());
      setTags(initialData.tags || []);
      setErrors({});
    } else {
      // Reset form for create mode
      setTitle('');
      setDetail('');
      setPriority('MEDIUM');
      setDueDateInput('');
      setSelectedUser(getSelectedUser());
      setTags([]);
      setErrors({});
    }
  }, [initialData, currentUserId, availableUsers]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    if (!detail.trim()) {
      newErrors.detail = 'Description is required';
    }

    if (!dueDateInput) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const dueDate = new Date(dueDateInput);
      // Allow past dates for editing existing tasks
      const now = new Date();
      now.setMinutes(now.getMinutes() - 1); // Allow 1 minute buffer
      if (!initialData && dueDate < now) {
        newErrors.dueDate = 'Due date must be in the future';
      }
    }

    if (!selectedUser) {
      newErrors.assignedTo = 'Assignee is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Convert datetime-local string to ISO string
    const dueDate = new Date(dueDateInput);
    
    const formData: TaskCreateRequest | TaskUpdateRequest = {
      title: title.trim(),
      detail: detail.trim(),
      priority,
      due_date: dueDate.toISOString(),
      assigned_to: selectedUser!.id,
      tags: tags.length > 0 ? tags : undefined,
      ...(clientId && {
        content_type: 10, // CLIENT_CONTENT_TYPE_ID
        object_id: clientId,
      }),
    };

    onSubmit(formData);
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        {/* Task Title */}
        <TextField
          label="Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
          error={!!errors.title}
          helperText={errors.title}
          disabled={isSubmitting}
          placeholder="e.g., Review client documents"
        />

        {/* Description */}
        <TextField
          label="Description"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          required
          fullWidth
          multiline
          rows={3}
          error={!!errors.detail}
          helperText={errors.detail}
          disabled={isSubmitting}
          placeholder="Provide detailed instructions..."
        />

        {/* Priority and Due Date */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            fullWidth
            disabled={isSubmitting}
            error={!!errors.priority}
            helperText={errors.priority}
          >
            <MenuItem value="LOW">🟢 Low</MenuItem>
            <MenuItem value="MEDIUM">🟡 Medium</MenuItem>
            <MenuItem value="HIGH">🟠 High</MenuItem>
            <MenuItem value="URGENT">🔴 Urgent</MenuItem>
          </TextField>
          <TextField
            label="Due Date & Time"
            type="datetime-local"
            value={dueDateInput}
            onChange={(e) => setDueDateInput(e.target.value)}
            required
            fullWidth
            error={!!errors.dueDate}
            helperText={errors.dueDate}
            disabled={isSubmitting}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* Assignment */}
        <Autocomplete
          value={selectedUser}
          onChange={(_, newValue) => setSelectedUser(newValue)}
          options={availableUsers}
          getOptionLabel={(option) => option.full_name}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box>
                <Typography variant="body2">{option.full_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.email}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Assign To"
              placeholder="Search by name or email"
              required
              error={!!errors.assignedTo}
              helperText={errors.assignedTo}
            />
          )}
          disabled={isSubmitting || availableUsers.length === 0}
          noOptionsText={availableUsers.length === 0 ? "Loading users..." : "No users found"}
          fullWidth
        />

        {/* Tags */}
        <Autocomplete
          multiple
          freeSolo
          value={tags}
          onChange={(_, newValue) => setTags(newValue)}
          options={[]}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option}
                {...getTagProps({ index })}
                size="small"
                disabled={isSubmitting}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags (Optional)"
              placeholder="Type and press Enter to add tags"
            />
          )}
          disabled={isSubmitting}
          fullWidth
        />

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 1 }}>
          <Button onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !title.trim() || !detail.trim() || !dueDateInput || !selectedUser}
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Task' : 'Create Task'}
          </Button>
        </Box>
      </Stack>
    </form>
  );
};

export default TaskForm;
