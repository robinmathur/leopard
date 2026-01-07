/**
 * CalendarEventsWidget Component
 * Dashboard widget showing today's calendar events with pagination
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
  IconButton,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventApi } from '@/services/api/eventApi';
import type { CalendarEvent } from '@/types/event';
import { format } from 'date-fns';

export interface CalendarEventsWidgetProps {
  maxEvents?: number;
}

/**
 * CalendarEventsWidget Component
 */
export const CalendarEventsWidget = ({ maxEvents = 5 }: CalendarEventsWidgetProps) => {
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const fetchTodayEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await eventApi.getToday();
        const sortedEvents = response.results.sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );
        setAllEvents(sortedEvents);
        setCurrentPage(0); // Reset to first page when events are fetched
      } catch (err) {
        setError((err as Error).message || 'Failed to load today\'s events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayEvents();
  }, []);

  const handleViewCalendar = () => {
    navigate('/calendar');
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(allEvents.length / maxEvents);
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
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

  // Calculate pagination
  const totalEvents = allEvents.length;
  const totalPages = Math.ceil(totalEvents / maxEvents);
  const startIndex = currentPage * maxEvents;
  const endIndex = Math.min(startIndex + maxEvents, totalEvents);
  const visibleEvents = allEvents.slice(startIndex, endIndex);

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

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
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No events today
        </Typography>
        <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={handleViewCalendar}>
          View Calendar
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={handlePreviousPage}
            disabled={!canGoPrevious}
            sx={{ p: 0.5 }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Today's Events
          </Typography>
          <IconButton
            size="small"
            onClick={handleNextPage}
            disabled={!canGoNext}
            sx={{ p: 0.5 }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
        <Button variant="text" size="small" onClick={handleViewCalendar}>
          View All
        </Button>
      </Box>

      {/* Event count */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        {totalEvents === 1
          ? '1 event'
          : totalPages > 1
          ? `Showing ${startIndex + 1}-${endIndex} of ${totalEvents} events`
          : `${totalEvents} events`}
      </Typography>

      {/* Events list with fixed height */}
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <List sx={{ p: 0 }}>
          {visibleEvents.map((event) => (
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
  );
};

