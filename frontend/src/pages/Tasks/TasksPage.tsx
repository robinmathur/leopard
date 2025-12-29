/**
 * TasksPage Component
 * Task dashboard page at /tasks route
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Task, getTasks, TaskListParams, TaskStatus, TaskPriority } from '@/services/api/taskApi';
import { TaskList } from '@/components/shared/TaskList/TaskList';
import { TaskDetailPanel } from '@/components/shared/TaskList/TaskDetailPanel';
import { TaskForm, TaskFormProps } from '@/components/shared/TaskList/TaskForm';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { createTask, updateTask, deleteTask, TaskCreateRequest, TaskUpdateRequest } from '@/services/api/taskApi';

export const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize taskView from URL params to avoid extra API calls
  const viewParam = searchParams.get('view');
  const initialTaskView = (viewParam === 'my_tasks' || viewParam === 'all_tasks') ? viewParam : 'my_tasks';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [taskView, setTaskView] = useState<'my_tasks' | 'all_tasks'>(initialTaskView);

  // Handle URL parameters on mount
  useEffect(() => {
    const taskIdParam = searchParams.get('taskId');
    const createParam = searchParams.get('create');

    // taskView is already initialized from URL params above, no need to set it here

    if (taskIdParam) {
      const taskId = parseInt(taskIdParam, 10);
      if (!isNaN(taskId)) {
        setSelectedTaskId(taskId);
        setDetailPanelOpen(true);
        // Keep taskId in URL - don't remove it
      }
    }

    if (createParam === 'true') {
      setCreateDialogOpen(true);
      // Remove create from URL
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Fetch tasks
  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, taskView]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: TaskListParams = {
        assigned_to_me: taskView === 'my_tasks',
        all_tasks: taskView === 'all_tasks',
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }

      const response = await getTasks(params);
      setTasks(response.results);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setDetailPanelOpen(true);
    // Update URL with taskId
    searchParams.set('taskId', task.id.toString());
    setSearchParams(searchParams, { replace: true });
  };

  const handleCloseDetailPanel = () => {
    setDetailPanelOpen(false);
    setSelectedTaskId(null);
    // Remove taskId from URL
    searchParams.delete('taskId');
    setSearchParams(searchParams, { replace: true });
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    fetchTasks(); // Refresh to get latest data
  };

  const handleTaskDelete = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTask(taskId);
      setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) {
        handleCloseDetailPanel();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    }
  };

  const handleEditTask = async (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleUpdateTask = async (data: TaskUpdateRequest) => {
    if (!selectedTask) return;
    
    try {
      const updatedTask = await updateTask(selectedTask.id, data);
      await fetchTasks();
      setEditDialogOpen(false);
      setSelectedTask(null);
      // Update detail panel if it's open for this task
      if (selectedTaskId === selectedTask.id) {
        setSelectedTaskId(updatedTask.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );

    try {
      // Refresh to get latest data
      await fetchTasks();
    } catch (err) {
      // Revert on error
      fetchTasks();
    }
  };

  const handleTaskViewChange = (newView: 'my_tasks' | 'all_tasks') => {
    setTaskView(newView);
    // Update URL with view parameter
    searchParams.set('view', newView);
    setSearchParams(searchParams, { replace: true });
  };

  const handleCreateTask = async (data: TaskCreateRequest) => {
    try {
      await createTask(data);
      setCreateDialogOpen(false);
      await fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Task Manager</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Task
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
          {/* Task View Toggle */}
          <ToggleButtonGroup
            value={taskView}
            exclusive
            onChange={(_, newValue) => newValue && handleTaskViewChange(newValue)}
            size="small"
          >
            <ToggleButton value="my_tasks">My Tasks</ToggleButton>
            <ToggleButton value="all_tasks">All Tasks</ToggleButton>
          </ToggleButtonGroup>

          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
              <MenuItem value="OVERDUE">Overdue</MenuItem>
            </Select>
          </FormControl>

          {/* Priority Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priorityFilter}
              label="Priority"
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="URGENT">Urgent</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Task List */}
      <TaskList
        tasks={tasks}
        isLoading={loading}
        error={error}
        onTaskClick={handleTaskClick}
        onStatusChange={handleStatusChange}
        showFilters={false} // We have our own filters
        activeStatusFilter={statusFilter}
        selectedTaskId={selectedTaskId}
      />

      {/* Task Detail Panel */}
      <TaskDetailPanel
        open={detailPanelOpen}
        taskId={selectedTaskId}
        onClose={handleCloseDetailPanel}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        onEdit={handleEditTask}
      />

      {/* Create Task Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Create New Task
          <IconButton onClick={() => setCreateDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={() => setCreateDialogOpen(false)}
            isSubmitting={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedTask(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Task
          <IconButton
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedTask(null);
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <TaskForm
              initialData={selectedTask}
              onSubmit={handleUpdateTask}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedTask(null);
              }}
              isSubmitting={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TasksPage;

