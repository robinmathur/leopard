/**
 * TodaysEventsWidget Component
 * Dashboard widget showing today's calendar events
 */

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventApi } from '@/services/api/eventApi';
import type { CalendarEvent } from '@/types/event';
import { format } from 'date-fns';

export interface TodaysEventsWidgetProps {
  compact?: boolean;
  maxEvents?: number;
}

/**
 * TodaysEventsWidget Component
 */
export const TodaysEventsWidget = ({ compact = false, maxEvents = 5 }: TodaysEventsWidgetProps) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodayEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await eventApi.getToday();
        const sortedEvents = response.results
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
          .slice(0, maxEvents);
        setEvents(sortedEvents);
      } catch (err) {
        setError((err as Error).message || 'Failed to load today\'s events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayEvents();
  }, [maxEvents]);

  const handleViewCalendar = () => {
    navigate('/calendar');
  };

  const formatEventTime = (start: string, end: string, allDay: boolean): string => {
    if (allDay) {
      return 'All Day';
    }
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
    } catch {
      return start;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
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

  if (events.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No events today
        </Typography>
        {!compact && (
          <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={handleViewCalendar}>
            View Calendar
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {!compact && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {events.length} event{events.length !== 1 ? 's' : ''} today
          </Typography>
          <Button variant="text" size="small" onClick={handleViewCalendar}>
            View All
          </Button>
        </Box>
      )}

      <List sx={{ p: 0 }}>
        {events.map((event) => (
          <ListItem
            key={event.id}
            sx={{
              px: 0,
              py: 1,
              borderLeft: 3,
              borderColor: event.hex_color || 'primary.main',
              pl: 1.5,
              '&:hover': {
                bgcolor: 'action.hover',
                cursor: 'pointer',
              },
            }}
            onClick={() => navigate('/calendar')}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {event.title}
                  </Typography>
                  {event.assigned_to_name && (
                    <Chip
                      label={event.assigned_to_name}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {formatEventTime(event.start, event.end, event.all_day)}
                  {event.location && ` • ${event.location}`}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>

      {!compact && events.length >= maxEvents && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="text" size="small" onClick={handleViewCalendar}>
            View More Events
          </Button>
        </Box>
      )}
    </Box>
  );
};

