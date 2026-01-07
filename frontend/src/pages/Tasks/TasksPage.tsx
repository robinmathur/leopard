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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { Task, getTasks, TaskListParams, TaskStatus, TaskPriority } from '@/services/api/taskApi';
import { TaskList } from '@/components/shared/TaskList/TaskList';
import { TaskDetailPanel } from '@/components/shared/TaskList/TaskDetailPanel';
import { TaskForm } from '@/components/shared/TaskList/TaskForm';
import { createTask, updateTask, deleteTask, TaskCreateRequest, TaskUpdateRequest } from '@/services/api/taskApi';

type FilterView = 'my_tasks' | 'all_tasks' | 'overdue' | 'completed';

export const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filter view from URL params to avoid extra API calls
  const viewParam = searchParams.get('view');
  const validViews: FilterView[] = ['my_tasks', 'all_tasks', 'overdue', 'completed'];
  const initialFilterView: FilterView = validViews.includes(viewParam as FilterView)
    ? (viewParam as FilterView)
    : 'my_tasks';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [filterView, setFilterView] = useState<FilterView>(initialFilterView);
  const [detailPanelKey, setDetailPanelKey] = useState(0);

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

  // Fetch tasks - reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setTasks([]);
    setHasMore(true);
    fetchTasks(1, true);
  }, [priorityFilter, statusFilter, filterView]);

  const fetchTasks = async (pageNum: number = page, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params: TaskListParams = {
        page: pageNum,
        page_size: 20,
      };

      // Apply filter view
      if (filterView === 'my_tasks') {
        params.assigned_to_me = true;
      } else if (filterView === 'all_tasks') {
        params.all_tasks = true;
      } else if (filterView === 'overdue') {
        params.status = 'OVERDUE';
      } else if (filterView === 'completed') {
        params.status = 'COMPLETED';
      }

      // Apply status filter (override filterView status if set)
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Apply priority filter
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }

      const response = await getTasks(params);

      if (reset) {
        setTasks(response.results);
      } else {
        setTasks((prev) => [...prev, ...response.results]);
      }

      setHasMore(!!response.next);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    // Load more when user scrolls to 80% of the content
    if (scrollHeight - scrollTop <= clientHeight * 1.2 && hasMore && !loadingMore && !loading) {
      fetchTasks(page + 1, false);
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

      // Update task in list
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );

      setEditDialogOpen(false);
      setSelectedTask(null);

      // Force detail panel to refresh by updating its key
      if (selectedTaskId === selectedTask.id) {
        setDetailPanelKey((prev) => prev + 1);
        handleTaskUpdate(updatedTask);
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

  const handleFilterViewChange = (newView: FilterView) => {
    setFilterView(newView);
    // Update URL with view parameter
    searchParams.set('view', newView);
    setSearchParams(searchParams, { replace: true });
  };

  const handleCreateTask = async (data: TaskCreateRequest) => {
    try {
      await createTask(data);
      setCreateDialogOpen(false);
      // Reset and fetch first page
      setPage(1);
      setTasks([]);
      setHasMore(true);
      await fetchTasks(1, true);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    }
  };

  const filterOptions = [
    { value: 'my_tasks', label: 'My Tasks', icon: <AssignmentIndIcon /> },
    { value: 'all_tasks', label: 'All Tasks', icon: <AssignmentIcon /> },
    { value: 'overdue', label: 'Overdue Tasks', icon: <EventBusyIcon /> },
    { value: 'completed', label: 'Completed Tasks', icon: <CheckCircleIcon /> },
  ];

  // Get empty state message based on current filter
  const getEmptyMessage = (): string => {
    if (statusFilter !== 'all') {
      const statusLabels: Record<TaskStatus, string> = {
        PENDING: 'Pending',
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
        OVERDUE: 'Overdue',
      };
      return `No ${statusLabels[statusFilter]} Tasks`;
    }

    if (priorityFilter !== 'all') {
      const priorityLabels: Record<TaskPriority, string> = {
        LOW: 'Low Priority',
        MEDIUM: 'Medium Priority',
        HIGH: 'High Priority',
        URGENT: 'Urgent',
      };
      return `No ${priorityLabels[priorityFilter]} Tasks`;
    }

    const filterMessages: Record<FilterView, string> = {
      my_tasks: 'No Tasks Assigned to You',
      all_tasks: 'No Tasks',
      overdue: 'No Overdue Tasks',
      completed: 'No Completed Tasks',
    };

    return filterMessages[filterView];
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

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filter Bar - Horizontal */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filter View Buttons */}
          <ToggleButtonGroup
            value={filterView}
            exclusive
            onChange={(_, newValue) => {
              if (newValue !== null) {
                handleFilterViewChange(newValue);
              }
            }}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            {filterOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {option.icon}
                  {option.label}
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
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
          <FormControl size="small" sx={{ minWidth: 120 }}>
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
        </Box>
      </Paper>

      {/* Main Content Area - Split View */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          height: 'calc(100vh - 280px)',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* Task List */}
        <Box
          sx={{
            flex: detailPanelOpen
              ? { xs: '0 0 auto', md: '0 0 55%' }
              : { xs: '1 1 100%', md: '1 1 100%' },
            transition: 'flex 0.3s ease-in-out',
            maxHeight: { xs: detailPanelOpen ? '50%' : '100%', md: '100%' },
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.3)',
              },
            },
          }}
          onScroll={handleScroll}
        >
          <TaskList
            tasks={tasks}
            isLoading={loading}
            error={error}
            onTaskClick={handleTaskClick}
            onStatusChange={handleStatusChange}
            showFilters={false}
            selectedTaskId={selectedTaskId}
            emptyMessage={getEmptyMessage()}
          />
          {loadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Loading more tasks...
              </Typography>
            </Box>
          )}
          {!hasMore && tasks.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No more tasks to load
              </Typography>
            </Box>
          )}
        </Box>

        {/* Detail Panel - Inline */}
        {detailPanelOpen && (
          <Box
            sx={{
              flex: { xs: '0 0 auto', md: '0 0 45%' },
              transition: 'flex 0.3s ease-in-out',
              maxHeight: { xs: '50%', md: '100%' },
              overflow: 'hidden',
              borderTop: { xs: 1, md: 0 },
              borderLeft: { xs: 0, md: 1 },
              borderColor: 'divider',
            }}
          >
            <TaskDetailPanel
              key={detailPanelKey}
              open={detailPanelOpen}
              taskId={selectedTaskId}
              onClose={handleCloseDetailPanel}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onEdit={handleEditTask}
            />
          </Box>
        )}
      </Box>


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
            onSubmit={(data) => {
              handleCreateTask(data as TaskCreateRequest);
            }}
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
              onSubmit={(data) => {
                handleUpdateTask(data as TaskUpdateRequest);
              }}
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

