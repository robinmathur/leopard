/**
 * VisaDashboard
 * Comprehensive dashboard showing visa application statistics with graphs and charts
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Description,
  PersonAdd,
} from '@mui/icons-material';
import { getVisaDashboardStatistics } from '@/services/api/visaTypeApi';
import { VisaDashboardStatistics, VISA_STATUS_LABELS } from '@/types/visaType';

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, color, subtitle }: StatCardProps) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}15`,
            borderRadius: 2,
            p: 1,
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

/**
 * Status Breakdown Chart Component
 */
interface StatusBreakdownProps {
  statusBreakdown: Record<string, number>;
}

const StatusBreakdown = ({ statusBreakdown }: StatusBreakdownProps) => {
  const statuses = Object.keys(statusBreakdown).filter(
    (key) => key !== 'TOTAL' && statusBreakdown[key] > 0
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      TO_BE_APPLIED: '#2196F3',
      VISA_APPLIED: '#FF9800',
      CASE_OPENED: '#9C27B0',
      GRANTED: '#4CAF50',
      REJECTED: '#F44336',
      WITHDRAWN: '#757575',
    };
    return colors[status] || '#999';
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Status Breakdown
      </Typography>
      <Box sx={{ mt: 2 }}>
        {statuses.map((status) => {
          const count = statusBreakdown[status];
          const percentage = statusBreakdown.TOTAL > 0
            ? ((count / statusBreakdown.TOTAL) * 100).toFixed(1)
            : 0;

          return (
            <Box key={status} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={500}>
                  {VISA_STATUS_LABELS[status as keyof typeof VISA_STATUS_LABELS]}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {count} ({percentage}%)
                </Typography>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  height: 8,
                  backgroundColor: '#E0E0E0',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: getStatusColor(status),
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

/**
 * Visa Type Breakdown Component
 */
interface VisaTypeBreakdownProps {
  visaTypeBreakdown: Array<{ visa_type__id: number; visa_type__name: string; count: number }>;
}

const VisaTypeBreakdown = ({ visaTypeBreakdown }: VisaTypeBreakdownProps) => {
  const total = visaTypeBreakdown.reduce((sum, item) => sum + item.count, 0);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Top Visa Types
      </Typography>
      <Box sx={{ mt: 2 }}>
        {visaTypeBreakdown.map((item, index) => {
          const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
          const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'];
          const color = colors[index % colors.length];

          return (
            <Box key={item.visa_type__id} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: '70%' }}>
                  {item.visa_type__name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.count} ({percentage}%)
                </Typography>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  height: 8,
                  backgroundColor: '#E0E0E0',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: color,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          );
        })}
        {visaTypeBreakdown.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No data available
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

/**
 * Recent Applications Component
 */
interface RecentApplicationsProps {
  recentApplications: VisaDashboardStatistics['recent_applications'];
}

const RecentApplications = ({ recentApplications }: RecentApplicationsProps) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
      TO_BE_APPLIED: 'info',
      VISA_APPLIED: 'warning',
      CASE_OPENED: 'secondary',
      GRANTED: 'success',
      REJECTED: 'error',
      WITHDRAWN: 'default',
    };
    return colors[status] || 'default';
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Recent Applications
      </Typography>
      <Box sx={{ mt: 2 }}>
        {recentApplications.map((app) => (
          <Box
            key={app.id}
            sx={{
              p: 1.5,
              mb: 1,
              backgroundColor: '#F5F5F5',
              borderRadius: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {app.client__first_name} {app.client__last_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {app.visa_type__name}
              </Typography>
            </Box>
            <Chip
              label={VISA_STATUS_LABELS[app.status]}
              size="small"
              color={getStatusColor(app.status)}
            />
          </Box>
        ))}
        {recentApplications.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No recent applications
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

/**
 * Main VisaDashboard Component
 */
export const VisaDashboard = () => {
  const [statistics, setStatistics] = useState<VisaDashboardStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getVisaDashboardStatistics();
        setStatistics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!statistics) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No statistics available
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Visa Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Comprehensive overview of visa applications and statistics
        </Typography>
      </Box>

      {/* Top Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Applications"
            value={statistics.total_applications}
            icon={<Description />}
            color="#2196F3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Applications Today"
            value={statistics.time_based_counts.today}
            icon={<TrendingUp />}
            color="#FF9800"
            subtitle={`${statistics.time_based_counts.this_week} this week`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Granted This Month"
            value={statistics.granted_counts.this_month}
            icon={<CheckCircle />}
            color="#4CAF50"
            subtitle={`${statistics.granted_counts.today} today`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Pending Assignments"
            value={statistics.pending_assignments}
            icon={<PersonAdd />}
            color="#9C27B0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="In Progress"
            value={statistics.status_breakdown.VISA_APPLIED + statistics.status_breakdown.CASE_OPENED}
            icon={<HourglassEmpty />}
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Rejected"
            value={statistics.status_breakdown.REJECTED}
            icon={<Cancel />}
            color="#F44336"
          />
        </Grid>
      </Grid>

      {/* Charts and Breakdown */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <StatusBreakdown statusBreakdown={statistics.status_breakdown} />
        </Grid>
        <Grid item xs={12} md={6}>
          <VisaTypeBreakdown visaTypeBreakdown={statistics.visa_type_breakdown} />
        </Grid>
        <Grid item xs={12}>
          <RecentApplications recentApplications={statistics.recent_applications} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default VisaDashboard;
