/**
 * TaskList Component
 * Reusable task list component for displaying tasks
 */
import {
  Box,
  Typography,
  Alert,
  Skeleton,
  Tabs,
  Tab,
} from '@mui/material';
import { useState } from 'react';
import { TaskListProps, TaskStatus } from './types';
import { TaskItem } from './TaskItem';

/**
 * Loading skeleton for tasks
 */
const TaskListSkeleton = () => (
  <Box>
    {[...Array(3)].map((_, index) => (
      <Box key={index} sx={{ mb: 1.5 }}>
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * TaskList Component
 */
export const TaskList = ({
  tasks,
  isLoading = false,
  error = null,
  onTaskClick,
  onStatusChange,
  showFilters = true,
  activeStatusFilter = 'all',
  onFilterChange,
}: TaskListProps) => {
  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>(activeStatusFilter);

  // Filter tasks by status
  const filteredTasks = activeTab === 'all'
    ? tasks
    : tasks.filter((task) => task.status === activeTab);

  // Count tasks by status
  const statusCounts = {
    all: tasks.length,
    PENDING: tasks.filter((t) => t.status === 'PENDING').length,
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    COMPLETED: tasks.filter((t) => t.status === 'COMPLETED').length,
    OVERDUE: tasks.filter((t) => t.status === 'OVERDUE').length,
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TaskStatus | 'all') => {
    setActiveTab(newValue);
    onFilterChange?.(newValue);
  };

  // Loading state
  if (isLoading) {
    return <TaskListSkeleton />;
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
      {/* Status Filter Tabs */}
      {showFilters && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="task status filter"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={`All (${statusCounts.all})`} value="all" />
            <Tab label={`Pending (${statusCounts.PENDING})`} value="PENDING" />
            <Tab label={`In Progress (${statusCounts.IN_PROGRESS})`} value="IN_PROGRESS" />
            <Tab label={`Completed (${statusCounts.COMPLETED})`} value="COMPLETED" />
            {statusCounts.OVERDUE > 0 && (
              <Tab label={`Overdue (${statusCounts.OVERDUE})`} value="OVERDUE" />
            )}
          </Tabs>
        </Box>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1">
            No tasks {activeTab !== 'all' ? `with status "${activeTab}"` : ''}
          </Typography>
        </Box>
      ) : (
        <>
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={onTaskClick}
              onStatusChange={onStatusChange}
            />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </Typography>
        </>
      )}
    </Box>
  );
};

export default TaskList;
