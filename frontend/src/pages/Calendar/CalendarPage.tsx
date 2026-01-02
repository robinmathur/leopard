import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, IconButton, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { FullCalendarView } from '@/components/calendar/FullCalendarView';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import httpClient from '@/services/api/httpClient';
import type { User } from '@/types/user';

export const CalendarPage: React.FC = () => {
  const { hasPermission, user: currentUser } = useAuthStore();
  const { fetchEvents, isLoading } = useEventStore();
  const canViewTeamEvents = hasPermission('view_team_events');

  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(false);

  // Fetch team users if permission is granted
  useEffect(() => {
    if (canViewTeamEvents && currentUser) {
      const fetchTeamUsers = async () => {
        try {
          setLoading(true);
          const response = await httpClient.get<{ count: number; results: User[] }>(
            '/v1/users/',
            {
              params: {
                page_size: 100,
                is_active: true,
              },
            }
          );
          setTeamUsers(response.data.results);
        } catch (err) {
          console.error('Failed to fetch team users:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchTeamUsers();
    }
  }, [canViewTeamEvents, currentUser]);

  // Fetch events when filter changes
  useEffect(() => {
    const filters = selectedUserId === 'all' ? {} : { assigned_to: selectedUserId };
    fetchEvents(filters);
  }, [selectedUserId, fetchEvents]);

  const handleRefresh = () => {
    const filters = selectedUserId === 'all' ? {} : { assigned_to: selectedUserId };
    fetchEvents(filters);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Calendar
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {canViewTeamEvents && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by User</InputLabel>
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value as number | 'all')}
                label="Filter by User"
                disabled={loading}
              >
                <MenuItem value="all">All Team Events</MenuItem>
                <MenuItem value={currentUser?.id}>My Events Only</MenuItem>
                {teamUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.full_name || `${user.first_name} ${user.last_name}`.trim()}
                    {user.id === currentUser?.id && ' (Me)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <IconButton
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh calendar"
            color="primary"
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={20} />
            ) : (
              <RefreshIcon />
            )}
          </IconButton>
        </Box>
      </Box>

      <Paper
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <FullCalendarView height="100%" />
      </Paper>
    </Box>
  );
};
