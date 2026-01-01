/**
 * ApplicationDashboard - Statistics and analytics for college applications
 *
 * Critical: Shows applications grouped by intake date, counting only FINAL stage
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Grid,
} from '@mui/material';
import {
  School as SchoolIcon,
  CheckCircle as CheckIcon,
  Assignment as AssignmentIcon,
  PersonOff as UnassignedIcon,
} from '@mui/icons-material';
import { getDashboardStatistics } from '@/services/api/collegeApplicationApi';
import type { DashboardStatistics } from '@/types/collegeApplication';

const TIME_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
];

export const ApplicationDashboard: React.FC = () => {
  const [statistics, setStatistics] = React.useState<DashboardStatistics | null>(null);
  const [timeFilter, setTimeFilter] = React.useState('all');
  const [loading, setLoading] = React.useState(true);

  const loadStatistics = async (filter: string) => {
    try {
      setLoading(true);
      const stats = await getDashboardStatistics({ time_filter: filter as any });
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false); }};

  React.useEffect(() => {
    loadStatistics(timeFilter);
  }, [timeFilter]);

  if (loading || !statistics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Application Dashboard</Typography>
        <ToggleButtonGroup
          value={timeFilter}
          exclusive
          onChange={(_, value) => value && setTimeFilter(value)}
          size="small"
        >
          {TIME_FILTERS.map((filter) => (
            <ToggleButton key={filter.value} value={filter.value}>
              {filter.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AssignmentIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4">{statistics.total_applications}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Applications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4">{statistics.final_stage_count}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Final Stage ({timeFilter.replace('_', ' ')})
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SchoolIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="h4">
                    {statistics.institute_breakdown.length > 0
                      ? statistics.institute_breakdown[0].count
                      : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Top Institute
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <UnassignedIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="h4">{statistics.pending_assignments}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Assignments
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Intake Date Breakdown */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Applications by Intake Date (Final Stage Only)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing final stage applications grouped by start date
            </Typography>
            {statistics.intake_breakdown.length === 0 ? (
              <Typography color="text.secondary">No data available</Typography>
            ) : (
              <Box>
                {statistics.intake_breakdown.map((item, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        {new Date(item.start_date__intake_date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.count}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(item.count / statistics.final_stage_count) * 100}
                      sx={{ height: 8, borderRadius: 1 }}/>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Application Type Breakdown */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Application Types
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              All applications by type
            </Typography>
            {statistics.application_type_breakdown.length === 0 ? (
              <Typography color="text.secondary">No data available</Typography>
            ) : (
              <Box>
                {statistics.application_type_breakdown.map((item, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        {item.application_type__title}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.count}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(item.count / statistics.total_applications) * 100}
                      sx={{ height: 8, borderRadius: 1 }}color="secondary"
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Institute Breakdown */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Institutes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Applications by institute
            </Typography>
            {statistics.institute_breakdown.length === 0 ? (
              <Typography color="text.secondary">No data available</Typography>
            ) : (
              <Box>
                {statistics.institute_breakdown.map((item, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        {item.institute__name}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.count}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(item.count / statistics.total_applications) * 100}
                      sx={{ height: 8, borderRadius: 1 }}color="info"
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Applications */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Applications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Latest 10 applications
            </Typography>
            {statistics.recent_applications.length === 0 ? (
              <Typography color="text.secondary">No applications yet</Typography>
            ) : (
              <List dense>
                {statistics.recent_applications.map((app, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1, }}>
                    <ListItemText
                      primary={`${app.client__first_name} ${app.client__last_name}`}
                      secondary={
                        <>
                          {app.course__name} - {app.institute__name}
                          <br />
                          Intake: {new Date(app.start_date__intake_date).toLocaleDateString()}
                        </>
                      }
                    />
                    <Chip
                      label={app.stage__stage_name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
