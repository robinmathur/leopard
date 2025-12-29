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
  cancelTask,
} from '@/services/api/taskApi';
import { userApi } from '@/services/api/userApi';
import type { User } from '@/types/user';

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
    let isMounted = true;
    const abortController = new AbortController();

    const loadTasks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use client parameter for filtering
        const response = await getTasks({ client: clientId }, abortController.signal);
        const data = response.results;
        if (isMounted) {
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
        }
      } catch (err) {
        if ((err as Error).name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError((err as Error).message || 'Failed to load tasks');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [clientId]);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getTasks({ client: clientId });
      const data = response.results;
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

  // Lazy load users only when needed (create/edit dialog opens)
  const fetchUsers = async () => {
    if (users.length > 0) return; // Already loaded
    
    setUsersLoading(true);
    try {
      const data = await userApi.getAllActiveUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setUsersLoading(false);
    }
  };

  // Load users when create dialog opens
  const handleCreateDialogOpen = () => {
    setCreateDialogOpen(true);
    fetchUsers();
  };

  // Load users when edit dialog opens
  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
    fetchUsers();
  };

  // Handle quick assign/reassign
  const handleQuickAssign = async (taskId: number, userId: number | null) => {
    try {
      await updateTask(taskId, { assigned_to: userId ?? undefined });
      // Refresh to get latest data
      await fetchTasks();
    } catch (err) {
      setError((err as Error).message || 'Failed to assign task');
    }
  };

  // Handle task creation
  const handleCreate = async (data: TaskCreateRequest | TaskUpdateRequest) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await createTask({
        ...(data as TaskCreateRequest),
        linked_entity_type: 'client',
        linked_entity_id: clientId,
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

  // Handle status change with optimistic updates
  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    // Find the task to update optimistically
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const originalTask = tasks[taskIndex];
    
    // Optimistic update - update UI immediately
    const updatedTasks = [...tasks];
    if (status === 'COMPLETED') {
      updatedTasks[taskIndex] = {
        ...originalTask,
        status: 'COMPLETED',
        status_display: 'Completed',
      };
      setTasks(updatedTasks);
    } else if (status === 'IN_PROGRESS') {
      updatedTasks[taskIndex] = {
        ...originalTask,
        status: 'IN_PROGRESS',
        status_display: 'In Progress',
      };
      setTasks(updatedTasks);
    } else if (status === 'CANCELLED') {
      updatedTasks[taskIndex] = {
        ...originalTask,
        status: 'CANCELLED',
        status_display: 'Cancelled',
      };
      setTasks(updatedTasks);
    }

    try {
      if (status === 'COMPLETED') {
        await completeTask(taskId);
      } else if (status === 'IN_PROGRESS') {
        await updateTask(taskId, { status: 'IN_PROGRESS' });
      } else if (status === 'CANCELLED') {
        await cancelTask(taskId);
      }
      // Refresh tasks list to get the latest data from server
      await fetchTasks();
    } catch (err) {
      // Revert optimistic update on error
      setTasks(tasks);
      setError((err as Error).message || `Failed to ${status === 'COMPLETED' ? 'complete' : status === 'CANCELLED' ? 'cancel' : 'update'} task`);
    }
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
          onClick={handleCreateDialogOpen}
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
        onStatusChange={handleStatusChange}
        onTaskEdit={handleEdit}
        onTaskDelete={handleDeleteClick}
        onQuickAssign={handleQuickAssign}
        showFilters
        useExpandableItems={true}
        onTaskUpdate={(updatedTask) => {
          // Update task in list
          setTasks((prevTasks) =>
            prevTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
          );
        }}
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
