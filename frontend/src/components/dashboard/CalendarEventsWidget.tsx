/**
 * CalendarEventsWidget Component
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
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventApi } from '@/services/api/eventApi';
import type { CalendarEvent } from '@/types/event';
import { format } from 'date-fns';
import { EventFormDialog } from '@/components/calendar/EventFormDialog';

export interface CalendarEventsWidgetProps {
  maxEvents?: number;
}

/**
 * CalendarEventsWidget Component
 */
export const CalendarEventsWidget = ({ maxEvents }: CalendarEventsWidgetProps) => {
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const fetchTodayEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await eventApi.getToday();
      const sortedEvents = response.results.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      setAllEvents(sortedEvents);
    } catch (err) {
      setError((err as Error).message || 'Failed to load today\'s events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayEvents();
  }, []);

  const handleViewCalendar = () => {
    navigate('/calendar');
  };

  const handleAddEvent = () => {
    setFormDialogOpen(true);
  };

  const handleFormClose = () => {
    setFormDialogOpen(false);
    // Refresh events after creating/updating
    fetchTodayEvents();
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

  const totalEvents = allEvents.length;

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

  if (totalEvents === 0) {
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Today's Events</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddEvent}
          >
            Add Event
          </Button>
        </Box>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No events today
          </Typography>
          <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={handleViewCalendar}>
            View Calendar
          </Button>
        </Box>
        <EventFormDialog open={formDialogOpen} onClose={handleFormClose} />
      </>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header with Add Event button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Today's Events</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddEvent}
          >
            Add Event
          </Button>
        </Box>

        {/* Event count */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          {totalEvents === 1 ? '1 event' : `${totalEvents} events`}
        </Typography>

        {/* Events list with scrollable area */}
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <List sx={{ p: 0 }}>
            {allEvents.map((event) => (
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
        </Box>
      </Box>
      <EventFormDialog open={formDialogOpen} onClose={handleFormClose} />
    </>
  );
};

