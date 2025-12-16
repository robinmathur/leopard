/**
 * ClientTasks Component
 * Client-specific tasks component with full CRUD operations
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { TaskList } from '@/components/shared/TaskList';
import { TaskForm } from '@/components/shared/TaskList/TaskForm';
import {
  Task,
  TaskStatus,
  TaskCreateRequest,
  TaskUpdateRequest,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
} from '@/services/api/taskApi';
import { userApi } from '@/services/api/userApi';
import type { User } from '@/types/user';
import { CLIENT_CONTENT_TYPE_ID } from '@/services/api/reminderApi';

export interface ClientTasksProps {
  /** Client ID */
  clientId: number;
}

/**
 * ClientTasks Component
 * Displays and manages tasks for a specific client with full CRUD operations
 */
export const ClientTasks = ({ clientId }: ClientTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Fetch tasks when component mounts or clientId changes
  useEffect(() => {
    fetchTasks();
  }, [clientId]);

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getTasks(clientId);
      // Sort by due_date (earliest first, then by created_at)
      const sorted = data.sort((a, b) => {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        if (dateA === dateB) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return dateA - dateB;
      });
      setTasks(sorted);
    } catch (err) {
      setError((err as Error).message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await userApi.getAllActiveUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
      // Don't set error state, just log it
    } finally {
      setUsersLoading(false);
    }
  };

  // Handle task creation
  const handleCreate = async (data: TaskCreateRequest | TaskUpdateRequest) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await createTask({
        ...(data as TaskCreateRequest),
        content_type: CLIENT_CONTENT_TYPE_ID,
        object_id: clientId,
      });
      // Refresh tasks list to get the latest data
      await fetchTasks();
      setCreateDialogOpen(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle task update
  const handleUpdate = async (data: TaskCreateRequest | TaskUpdateRequest) => {
    if (!selectedTask) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updateTask(selectedTask.id, data as TaskUpdateRequest);
      // Refresh tasks list to get the latest data
      await fetchTasks();
      setEditDialogOpen(false);
      setSelectedTask(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle task deletion
  const handleDelete = async () => {
    if (!taskToDelete) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteTask(taskToDelete);
      // Refresh tasks list to get the latest data
      await fetchTasks();
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to delete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    // Open edit dialog on click
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  // Handle status change
  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    if (status === 'COMPLETED') {
      try {
        await completeTask(taskId);
        // Refresh tasks list to get the latest data
        await fetchTasks();
      } catch (err) {
        setError((err as Error).message || 'Failed to complete task');
      }
    }
  };

  // Handle edit
  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  // Handle delete
  const handleDeleteClick = (taskId: number) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header with Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tasks</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add Task
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Task List */}
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        onTaskClick={handleTaskClick}
        onStatusChange={handleStatusChange}
        onTaskEdit={handleEdit}
        onTaskDelete={handleDeleteClick}
        showFilters
      />

      {/* Create Task Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !isSubmitting && setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Create New Task
            <IconButton
              onClick={() => setCreateDialogOpen(false)}
              disabled={isSubmitting}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {usersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={40} />
            </Box>
          ) : (
            <TaskForm
              clientId={clientId}
              isSubmitting={isSubmitting}
              availableUsers={users}
              onSubmit={handleCreate}
              onCancel={() => {
                setCreateDialogOpen(false);
                setError(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !isSubmitting && setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Edit Task
            <IconButton
              onClick={() => setEditDialogOpen(false)}
              disabled={isSubmitting}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <TaskForm
              initialData={selectedTask}
              clientId={clientId}
              isSubmitting={isSubmitting}
              availableUsers={users}
              onSubmit={handleUpdate}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedTask(null);
                setError(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isSubmitting && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Task?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this task? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ClientTasks;
