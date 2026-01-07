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
  Checkbox,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Task, getTasks, TaskListParams, TaskStatus, TaskPriority } from '@/services/api/taskApi';
import { TaskList } from '@/components/shared/TaskList/TaskList';
import { TaskDetailPanel } from '@/components/shared/TaskList/TaskDetailPanel';
import { TaskForm } from '@/components/shared/TaskList/TaskForm';
import { createTask, updateTask, deleteTask, TaskCreateRequest, TaskUpdateRequest } from '@/services/api/taskApi';
import { userApi } from '@/services/api/userApi';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/user';

type TaskTypeFilter = 'my_tasks' | 'team_tasks' | 'team_member_tasks';

export const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize task type from URL params
  const taskTypeParam = searchParams.get('taskType');
  const teamMemberIdParam = searchParams.get('teamMemberId');
  const validTaskTypes: TaskTypeFilter[] = ['my_tasks', 'team_tasks'];
  
  let initialTaskType: TaskTypeFilter | number = 'my_tasks';
  if (teamMemberIdParam) {
    const memberId = parseInt(teamMemberIdParam, 10);
    if (!isNaN(memberId)) {
      initialTaskType = memberId;
    }
  } else if (taskTypeParam && validTaskTypes.includes(taskTypeParam as TaskTypeFilter)) {
    initialTaskType = taskTypeParam as TaskTypeFilter;
  }

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
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskTypeFilter | number>(initialTaskType);
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>(['PENDING', 'IN_PROGRESS']);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [detailPanelKey, setDetailPanelKey] = useState(0);
  const { user: currentUser } = useAuthStore();

  // Handle URL parameters on mount
  useEffect(() => {
    const taskIdParam = searchParams.get('taskId');
    const createParam = searchParams.get('create');

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

  // Fetch team members on mount
  useEffect(() => {
    if (currentUser) {
      fetchTeamMembers();
    }
  }, [currentUser]);

  // Fetch tasks - reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setTasks([]);
    setHasMore(true);
    fetchTasks(1, true);
  }, [priorityFilter, statusFilter, taskTypeFilter]);

  const fetchTeamMembers = async () => {
    if (!currentUser) return;

    setLoadingTeamMembers(true);
    try {
      const allUsers = await userApi.getAllActiveUsers();
      
      // Get current user's branch IDs
      // Handle both authStore User type (branches) and API User type (branches_data)
      const currentUserBranchIds: number[] = [];
      if ((currentUser as any).branches_data) {
        // API User type
        currentUserBranchIds.push(...((currentUser as any).branches_data.map((b: { id: number }) => b.id)));
      } else if ((currentUser as any).branches) {
        // AuthStore User type
        currentUserBranchIds.push(...((currentUser as any).branches.map((b: { id: number | string }) => Number(b.id))));
      }
      
      // Filter users who share at least one branch with current user
      const teamMembersList = allUsers.filter((user) => {
        // Exclude current user (compare as numbers)
        if (user.id === Number(currentUser.id)) return false;
        
        // Check if user shares any branch with current user
        const userBranchIds = user.branches_data?.map((b) => b.id) || [];
        return userBranchIds.some((branchId) => currentUserBranchIds.includes(branchId));
      });
      
      setTeamMembers(teamMembersList);
    } catch (err: any) {
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const fetchTasks = async (pageNum: number = page, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params: any = {
        page: pageNum,
        page_size: 50, // Fetch more to account for client-side filtering
      };

      // Apply task type filter
      if (taskTypeFilter === 'my_tasks') {
        params.assigned_to_me = true;
      } else if (taskTypeFilter === 'team_tasks') {
        // Team tasks - tasks assigned to user's branch/team
        params.all_tasks = true;
      } else if (typeof taskTypeFilter === 'number') {
        // Team member selected - filter by their user ID
        (params as any).assigned_to = taskTypeFilter;
      }

      // Send status and priority as arrays - axios will convert to multiple query params
      // e.g., ?status=PENDING&status=IN_PROGRESS
      if (statusFilter.length > 0) {
        params.status = statusFilter;
      }

      if (priorityFilter.length > 0) {
        params.priority = priorityFilter;
      }

      const response = await getTasks(params as TaskListParams);

      // If backend doesn't support arrays, filter client-side as fallback
      let filteredResults = response.results;

      if (statusFilter.length > 0) {
        filteredResults = filteredResults.filter((task) => statusFilter.includes(task.status));
      }

      if (priorityFilter.length > 0) {
        filteredResults = filteredResults.filter((task) => priorityFilter.includes(task.priority));
      }

      // Additional client-side filtering for team member tasks if API doesn't support assigned_to
      if (typeof taskTypeFilter === 'number') {
        filteredResults = filteredResults.filter((task) => task.assigned_to === taskTypeFilter);
      }

      if (reset) {
        setTasks(filteredResults);
      } else {
        setTasks((prev) => [...prev, ...filteredResults]);
      }

      // Adjust hasMore based on filtered results
      // If we got fewer results than requested, we might have more pages
      const hasMoreResults = filteredResults.length > 0 && response.results.length === 50;
      setHasMore(hasMoreResults || !!response.next);
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

  const handleTaskTypeChange = (value: string) => {
    if (value === 'my_tasks' || value === 'team_tasks') {
      setTaskTypeFilter(value as TaskTypeFilter);
      searchParams.set('taskType', value);
      searchParams.delete('teamMemberId');
    } else {
      // It's a team member ID (as string from Select)
      const memberId = parseInt(value, 10);
      if (!isNaN(memberId)) {
        setTaskTypeFilter(memberId);
        searchParams.delete('taskType');
        searchParams.set('teamMemberId', memberId.toString());
      }
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleStatusChange = (event: any) => {
    const value = event.target.value;
    setStatusFilter(typeof value === 'string' ? value.split(',') : value);
  };

  const handlePriorityChange = (event: any) => {
    const value = event.target.value;
    setPriorityFilter(typeof value === 'string' ? value.split(',') : value);
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

  // Get empty state message based on current filter
  const getEmptyMessage = (): string => {
    if (typeof taskTypeFilter === 'number') {
      const selectedMember = teamMembers.find((m) => m.id === taskTypeFilter);
      const memberName = selectedMember
        ? selectedMember.full_name || `${selectedMember.first_name} ${selectedMember.last_name}`.trim() || selectedMember.username
        : 'Selected Team Member';
      return `No Tasks for ${memberName}`;
    }

    if (statusFilter.length > 0 && statusFilter.length < 6) {
      const statusLabels: Record<TaskStatus, string> = {
        PENDING: 'Pending',
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
        OVERDUE: 'Overdue',
      };
      const selectedLabels = statusFilter.map((s) => statusLabels[s]).join(', ');
      return `No Tasks with Status: ${selectedLabels}`;
    }

    if (priorityFilter.length > 0) {
      const priorityLabels: Record<TaskPriority, string> = {
        LOW: 'Low Priority',
        MEDIUM: 'Medium Priority',
        HIGH: 'High Priority',
        URGENT: 'Urgent',
      };
      const selectedLabels = priorityFilter.map((p) => priorityLabels[p]).join(', ');
      return `No Tasks with Priority: ${selectedLabels}`;
    }

    if (typeof taskTypeFilter === 'string') {
      const filterMessages: Record<TaskTypeFilter, string> = {
        my_tasks: 'No Tasks Assigned to You',
        team_tasks: 'No Team Tasks',
        team_member_tasks: 'No Team Member Tasks',
      };
      return filterMessages[taskTypeFilter];
    }

    return 'No Tasks';
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
          {/* Task Type Filter - Includes My Tasks, Team Tasks, and Team Members */}
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={loadingTeamMembers}>
            <InputLabel>Filter by User</InputLabel>
            <Select
              value={typeof taskTypeFilter === 'number' ? taskTypeFilter.toString() : taskTypeFilter}
              label="Task Type"
              onChange={(e) => handleTaskTypeChange(e.target.value)}
            >
              <MenuItem value="my_tasks">My Tasks</MenuItem>
              <MenuItem value="team_tasks">Team Tasks</MenuItem>
              {teamMembers.length > 0 && <MenuItem disabled sx={{ borderTop: 1, borderColor: 'divider', mt: 0.5, pt: 0.5 }} />}
              {teamMembers.map((member) => (
                <MenuItem key={member.id} value={member.id.toString()}>
                  {member.full_name || `${member.first_name} ${member.last_name}`.trim() || member.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Filter - Multiselect */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select
              multiple
              value={statusFilter}
              label="Status"
              onChange={handleStatusChange}
              renderValue={(selected) => {
                const statusLabels: Record<TaskStatus, string> = {
                  PENDING: 'Pending',
                  IN_PROGRESS: 'In Progress',
                  COMPLETED: 'Completed',
                  CANCELLED: 'Cancelled',
                  OVERDUE: 'Overdue',
                };
                return (selected as TaskStatus[]).map((s) => statusLabels[s]).join(', ');
              }}
            >
              <MenuItem value="PENDING">
                <Checkbox checked={statusFilter.indexOf('PENDING') > -1} />
                <ListItemText primary="Pending" />
              </MenuItem>
              <MenuItem value="IN_PROGRESS">
                <Checkbox checked={statusFilter.indexOf('IN_PROGRESS') > -1} />
                <ListItemText primary="In Progress" />
              </MenuItem>
              <MenuItem value="COMPLETED">
                <Checkbox checked={statusFilter.indexOf('COMPLETED') > -1} />
                <ListItemText primary="Completed" />
              </MenuItem>
              <MenuItem value="CANCELLED">
                <Checkbox checked={statusFilter.indexOf('CANCELLED') > -1} />
                <ListItemText primary="Cancelled" />
              </MenuItem>
              <MenuItem value="OVERDUE">
                <Checkbox checked={statusFilter.indexOf('OVERDUE') > -1} />
                <ListItemText primary="Overdue" />
              </MenuItem>
            </Select>
          </FormControl>

          {/* Priority Filter - Multiselect */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              multiple
              value={priorityFilter}
              label="Priority"
              onChange={handlePriorityChange}
              renderValue={(selected) => {
                if (selected.length === 0) return 'All';
                const priorityLabels: Record<TaskPriority, string> = {
                  LOW: 'Low',
                  MEDIUM: 'Medium',
                  HIGH: 'High',
                  URGENT: 'Urgent',
                };
                return (selected as TaskPriority[]).map((p) => priorityLabels[p]).join(', ');
              }}
            >
              <MenuItem value="LOW">
                <Checkbox checked={priorityFilter.indexOf('LOW') > -1} />
                <ListItemText primary="Low" />
              </MenuItem>
              <MenuItem value="MEDIUM">
                <Checkbox checked={priorityFilter.indexOf('MEDIUM') > -1} />
                <ListItemText primary="Medium" />
              </MenuItem>
              <MenuItem value="HIGH">
                <Checkbox checked={priorityFilter.indexOf('HIGH') > -1} />
                <ListItemText primary="High" />
              </MenuItem>
              <MenuItem value="URGENT">
                <Checkbox checked={priorityFilter.indexOf('URGENT') > -1} />
                <ListItemText primary="Urgent" />
              </MenuItem>
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
            width: detailPanelOpen
              ? { xs: '100%', md: '55%' }
              : { xs: '100%', md: '100%' },
            transition: 'width 0.3s ease-in-out',
            maxHeight: { xs: detailPanelOpen ? '50%' : '100%', md: '100%' },
            overflowY: 'auto',
            flexShrink: 0,
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
        <Box
          sx={{
            width: detailPanelOpen
              ? { xs: '100%', md: '45%' }
              : { xs: 0, md: 0 },
            transition: 'width 0.3s ease-in-out',
            maxHeight: { xs: detailPanelOpen ? '50%' : 0, md: '100%' },
            overflow: 'hidden',
            borderTop: { xs: detailPanelOpen ? 1 : 0, md: 0 },
            borderLeft: { xs: 0, md: detailPanelOpen ? 1 : 0 },
            borderColor: 'divider',
            flexShrink: 0,
            opacity: detailPanelOpen ? 1 : 0,
            pointerEvents: detailPanelOpen ? 'auto' : 'none',
          }}
        >
          {detailPanelOpen && (
            <TaskDetailPanel
              key={detailPanelKey}
              open={detailPanelOpen}
              taskId={selectedTaskId}
              onClose={handleCloseDetailPanel}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onEdit={handleEditTask}
            />
          )}
        </Box>
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

