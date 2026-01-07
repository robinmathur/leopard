import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { Protect } from '@/components/protected/Protect';
import { Task, getTasks, TaskListParams, TaskStatus } from '@/services/api/taskApi';
import { EntityTag } from '@/components/shared/TaskList/EntityTag';
import { STATUS_COLORS, PRIORITY_COLORS } from '@/components/shared/TaskList/types';
import { CalendarEventsWidget } from '@/components/dashboard/CalendarEventsWidget';
import { clientApi } from '@/services/api/clientApi';
import { listVisaApplications } from '@/services/api/visaApplicationApi';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={600}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${color}15`,
            color: color, }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

/**
 * Tasks Section Component for Dashboard
 */
const TasksSection = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<'my_tasks' | 'all_tasks'>('my_tasks');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    fetchTasks();
  }, [taskView, statusFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: TaskListParams = {
        assigned_to_me: taskView === 'my_tasks',
        all_tasks: taskView === 'all_tasks',
        page_size: 5, // Show only 5 tasks on dashboard
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await getTasks(params);
      // Filter out completed tasks for dashboard display
      const filteredTasks = response.results.filter((task) => task.status !== 'COMPLETED');
      setTasks(filteredTasks);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false); }};

  const handleTaskClick = (task: Task) => {
    // Preserve the filter (My Tasks/All Tasks) when navigating
    const filterParam = taskView === 'my_tasks' ? 'my_tasks' : 'all_tasks';
    navigate(`/tasks?taskId=${task.id}&view=${filterParam}`);
  };

  const handleAddTask = () => {
    navigate('/tasks?create=true');
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString; }};

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tasks</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddTask}
        >
          Add Task
        </Button>
      </Box>

      {/* Filters */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <ToggleButtonGroup
          value={taskView}
          exclusive
          onChange={(_, newValue) => newValue && setTaskView(newValue)}
          size="small"
        >
          <ToggleButton value="my_tasks">My Tasks</ToggleButton>
          <ToggleButton value="all_tasks">All Tasks</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : tasks.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No tasks found
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ flex: 1, overflow: 'auto' }}>
          {tasks.map((task) => (
            <Paper
              key={task.id}
              variant="outlined"
              sx={{
                p: 1.5,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                }, }}onClick={() => handleTaskClick(task)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                  {task.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                  <Chip
                    label={task.status_display}
                    size="small"
                    color={STATUS_COLORS[task.status]}
                  />
                  <Chip
                    label={task.priority_display}
                    size="small"
                    color={PRIORITY_COLORS[task.priority]}
                    variant="outlined"
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Due: {formatDate(task.due_date)}
                </Typography>
                {task.linked_entity_type && <EntityTag task={task} />}
              </Box>
            </Paper>
          ))}
          {tasks.length >= 5 && (
            <Button
              size="small"
              variant="text"
              onClick={() => navigate('/tasks')}
              sx={{ mt: 1 }}>
              View All Tasks →
            </Button>
          )}
        </Stack>
      )}
    </Paper>
  );
};

export const Dashboard = () => {
  const [totalClients, setTotalClients] = useState<number | null>(null);
  const [totalLeads, setTotalLeads] = useState<number | null>(null);
  const [totalApplications, setTotalApplications] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoadingStats(true);
      try {
        // Fetch client statistics (includes total clients and leads)
        const stageCounts = await clientApi.getStageCounts();
        setTotalClients(stageCounts.TOTAL);
        setTotalLeads(stageCounts.LEAD);

        // Fetch visa applications count
        const applicationsResponse = await listVisaApplications({ page_size: 1 });
        setTotalApplications(applicationsResponse.count);
      } catch (error) {
        console.error('Failed to fetch dashboard statistics:', error);
        // Set to null on error to show loading state
        setTotalClients(null);
        setTotalLeads(null);
        setTotalApplications(null);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStatistics();
  }, []);

  const formatNumber = (num: number | null): string => {
    if (num === null) return '...';
    return num.toLocaleString();
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Welcome to your Immigration CRM dashboard
      </Typography>

      <Grid container spacing={2}>
        {/* Statistics Cards */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Protect permission="view_client">
            <StatCard
              title="Total Clients"
              value={loadingStats ? '...' : formatNumber(totalClients)}
              icon={<PeopleIcon />}
              color="#1976d2"
            />
          </Protect>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Protect permission="view_client">
            <StatCard
              title="Active Leads"
              value={loadingStats ? '...' : formatNumber(totalLeads)}
              icon={<PersonAddIcon />}
              color="#2e7d32"
            />
          </Protect>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Protect permission="view_visaapplication">
            <StatCard
              title="Applications"
              value={loadingStats ? '...' : formatNumber(totalApplications)}
              icon={<DescriptionIcon />}
              color="#ed6c02"
            />
          </Protect>
        </Grid>

        {/* Tasks Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TasksSection />
        </Grid>

        {/* Calendar Events */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CalendarEventsWidget />
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Activity feed will be displayed here
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

