import React, { useEffect, useState, useRef } from 'react';
import { Box, Alert } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { useEventStore } from '@/store/eventStore';
import { EventFormDialog } from './EventFormDialog';
import type { CalendarEvent } from '@/types/event';

interface FullCalendarViewProps {
  height?: string | number;
}

export const FullCalendarView: React.FC<FullCalendarViewProps> = ({ height = '100%' }) => {
  const { fullCalendarEvents, fetchEvents, error, setSelectedEvent } = useEventStore();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState<Date | undefined>();
  const [selectedEnd, setSelectedEnd] = useState<Date | undefined>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle date selection (drag-to-select)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedStart(selectInfo.start);
    setSelectedEnd(selectInfo.end);
    setEditingEvent(null);
    setFormDialogOpen(true);

    // Clear selection
    selectInfo.view.calendar.unselect();
  };

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = parseInt(clickInfo.event.id);
    const event = useEventStore.getState().events.find((e) => e.id === eventId);

    if (event) {
      setEditingEvent(event);
      setSelectedEvent(event);
      setSelectedStart(undefined);
      setSelectedEnd(undefined);
      setFormDialogOpen(true);
    }
  };

  const handleFormClose = () => {
    setFormDialogOpen(false);
    setEditingEvent(null);
    setSelectedEvent(null);
    setSelectedStart(undefined);
    setSelectedEnd(undefined);
  };

  return (
    <Box sx={{ height, p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          height: 'calc(100% - 16px)',
          '& .fc': {
            height: '100%',
          },
          '& .fc-toolbar-title': {
            fontSize: '1.25rem',
            fontWeight: 600,
          },
          '& .fc-button': {
            textTransform: 'capitalize',
            fontSize: '0.8125rem',
          },
          '& .fc-event': {
            cursor: 'pointer',
          },
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          initialView="dayGridMonth"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={fullCalendarEvents}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="100%"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
        />
      </Box>

      <EventFormDialog
        open={formDialogOpen}
        onClose={handleFormClose}
        initialStart={selectedStart}
        initialEnd={selectedEnd}
        event={editingEvent}
      />
    </Box>
  );
};
