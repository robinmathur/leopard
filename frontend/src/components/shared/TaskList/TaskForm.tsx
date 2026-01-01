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
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import { Task, TaskPriority, TaskCreateRequest, TaskUpdateRequest } from '@/services/api/taskApi';
import { TaskAssignmentSelector } from './TaskAssignmentSelector';
import { User } from '@/types/user';
import { Branch } from '@/types/branch';
import { Client } from '@/types/client';
import { ClientAutocomplete } from '@/components/common/ClientAutocomplete';

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
  /** Client ID for linking task to client (auto-link from client detail page) */
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
  
  // Assignment state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Entity linking state (only shown when clientId is not provided)
  type EntityType = 'none' | 'client' | 'visaapplication';
  const [entityType, setEntityType] = useState<EntityType>('none');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedVisaApplication, setSelectedVisaApplication] = useState<any | null>(null);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDetail(initialData.detail || '');
      setPriority(initialData.priority || 'MEDIUM');
      setDueDateInput(initialData.due_date ? formatDateForInput(new Date(initialData.due_date)) : '');

      // Set user or branch from existing task data (no API calls needed)
      if (initialData.assigned_to_branch && initialData.branch_id && initialData.branch_name) {
        setSelectedBranch({
          id: initialData.branch_id,
          name: initialData.branch_name,
        } as Branch);
        setSelectedUser(null);
      } else if (initialData.assigned_to) {
        // Set user even if name is missing - use ID at minimum
        setSelectedUser({
          id: initialData.assigned_to,
          username: initialData.assigned_to_name || `User ${initialData.assigned_to}`,
          email: '', // Not available in task data
          first_name: initialData.assigned_to_full_name?.split(' ')[0] || '',
          last_name: initialData.assigned_to_full_name?.split(' ').slice(1).join(' ') || '',
        } as User);
        setSelectedBranch(null);
      } else {
        setSelectedUser(null);
        setSelectedBranch(null);
      }

      setTags(initialData.tags || []);
      setErrors({});

      // Initialize entity linking from task data (no API fetch needed)
      if (initialData.linked_entity_type === 'client' && initialData.linked_entity_id) {
        setEntityType('client');
        // Construct Client object from task data
        if (initialData.linked_entity_name) {
          const nameParts = initialData.linked_entity_name.split(' ');
          setSelectedClient({
            id: initialData.linked_entity_id,
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            email: '', // Not included in task response - will be fetched if needed
          } as Client);
        }
        setSelectedVisaApplication(null);
      } else if (initialData.linked_entity_type === 'visaapplication' && initialData.linked_entity_id) {
        setEntityType('visaapplication');
        setSelectedVisaApplication({ id: initialData.linked_entity_id });
        setSelectedClient(null);
      } else {
        setEntityType('none');
        setSelectedClient(null);
        setSelectedVisaApplication(null);
      }
    } else {
      // Reset form for create mode
      setTitle('');
      setDetail('');
      setPriority('MEDIUM');
      setDueDateInput('');
      setSelectedUser(null);
      setSelectedBranch(null);
      setTags([]);
      setErrors({});
      setEntityType('none');
      setSelectedClient(null);
      setSelectedVisaApplication(null);
    }
  }, [initialData]);

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

    // assigned_to is optional - no validation needed

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

    // Determine entity linking (prioritize clientId prop for auto-link)
    // Use model names instead of ContentType IDs (multi-tenant safe)
    let entityData: { linked_entity_type?: string; linked_entity_id?: number } = {};
    if (clientId) {
      // Auto-link to client when clientId prop is provided
      entityData = {
        linked_entity_type: 'client',
        linked_entity_id: clientId,
      };
    } else if (entityType === 'client' && selectedClient) {
      entityData = {
        linked_entity_type: 'client',
        linked_entity_id: selectedClient.id,
      };
    } else if (entityType === 'visaapplication' && selectedVisaApplication) {
      entityData = {
        linked_entity_type: 'visaapplication',
        linked_entity_id: selectedVisaApplication.id,
      };
    }

    const formData: TaskCreateRequest | TaskUpdateRequest = {
      title: title.trim(),
      detail: detail.trim(),
      priority,
      due_date: dueDate.toISOString(),
      ...(selectedUser && { assigned_to: selectedUser.id }),
      ...(selectedBranch && { branch_id: selectedBranch.id }),
      ...(!selectedUser && !selectedBranch && { assigned_to: null, branch_id: null }),
      tags: tags.length > 0 ? tags : undefined,
      ...entityData,
    };

    // Debug: Log entity data being submitted
    if (entityData.linked_entity_type) {
      console.log('TaskForm: Submitting with entity data:', {
        linked_entity_type: entityData.linked_entity_type,
        linked_entity_id: entityData.linked_entity_id,
        entityType,
        selectedClient: selectedClient?.id,
        clientId,
      });
    }

    onSubmit(formData);
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
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        {/* Assignment */}
        <Box>
          <TaskAssignmentSelector
            selectedUser={selectedUser}
            selectedBranch={selectedBranch}
            onUserChange={setSelectedUser}
            onBranchChange={setSelectedBranch}
            disabled={isSubmitting}
            error={errors.assignedTo ? { assignmentType: errors.assignedTo } : undefined}
          />
        </Box>

        {/* Entity Linking (only shown when NOT auto-linking from client page) */}
        {!clientId && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Link to Entity (Optional)
            </Typography>
            <RadioGroup
              row
              value={entityType}
              onChange={(e) => {
                const newType = e.target.value as EntityType;
                setEntityType(newType);
                // Clear selections when changing type
                if (newType !== 'client') setSelectedClient(null);
                if (newType !== 'visaapplication') setSelectedVisaApplication(null);
              }}
            >
              <FormControlLabel value="none" control={<Radio />} label="None" disabled={isSubmitting} />
              <FormControlLabel value="client" control={<Radio />} label="Client" disabled={isSubmitting} />
              <FormControlLabel value="visaapplication" control={<Radio />} label="Visa Application" disabled={isSubmitting} />
            </RadioGroup>

            {/* Client Autocomplete */}
            {entityType === 'client' && (
              <Box sx={{ mt: 2 }}>
                <ClientAutocomplete
                  value={selectedClient}
                  onChange={setSelectedClient}
                  label="Select Client"
                  placeholder="Search by name or email"
                  disabled={isSubmitting}
                />
              </Box>
            )}

            {/* Visa Application Autocomplete */}
            {entityType === 'visaapplication' && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Visa Application ID"
                  type="number"
                  value={selectedVisaApplication?.id || ''}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    setSelectedVisaApplication(id ? { id } : null);
                  }}
                  disabled={isSubmitting}
                  fullWidth
                  placeholder="Enter visa application ID"
                  helperText="Note: Full visa application autocomplete coming soon"
                />
              </Box>
            )}
          </Box>
        )}

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
            disabled={isSubmitting || !title.trim() || !detail.trim() || !dueDateInput}
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Task' : 'Create Task'}
          </Button>
        </Box>
      </Stack>
    </form>
  );
};

export default TaskForm;
