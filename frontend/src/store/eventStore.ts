/**
 * Zustand store for calendar events
 */

import { create } from 'zustand';
import { eventApi } from '@/services/api/eventApi';
import type {
  CalendarEvent,
  CalendarEventCreateRequest,
  CalendarEventUpdateRequest,
  CalendarEventListParams,
} from '@/types/event';
import type { EventInput } from '@fullcalendar/core';
import { toFullCalendarEvent } from '@/types/event';

interface EventStore {
  events: CalendarEvent[];
  fullCalendarEvents: EventInput[];
  selectedEvent: CalendarEvent | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchEvents: (params?: CalendarEventListParams) => Promise<void>;
  createEvent: (data: CalendarEventCreateRequest) => Promise<CalendarEvent>;
  updateEvent: (id: number, data: CalendarEventUpdateRequest) => Promise<CalendarEvent>;
  deleteEvent: (id: number) => Promise<void>;
  setSelectedEvent: (event: CalendarEvent | null) => void;
  clearEvents: () => void;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  fullCalendarEvents: [],
  selectedEvent: null,
  isLoading: false,
  error: null,

  fetchEvents: async (params?: CalendarEventListParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await eventApi.list(params);
      const events = response.results;
      const fullCalendarEvents = events.map(toFullCalendarEvent);

      set({
        events,
        fullCalendarEvents,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch events',
        isLoading: false,
      });
    }
  },

  createEvent: async (data: CalendarEventCreateRequest) => {
    set({ isLoading: true, error: null });
    try {
      const newEvent = await eventApi.create(data);

      // Add to local state
      const events = [...get().events, newEvent];
      const fullCalendarEvents = events.map(toFullCalendarEvent);

      set({
        events,
        fullCalendarEvents,
        isLoading: false,
      });

      return newEvent;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create event',
        isLoading: false,
      });
      throw error;
    }
  },

  updateEvent: async (id: number, data: CalendarEventUpdateRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedEvent = await eventApi.update(id, data);

      // Update in local state
      const events = get().events.map((event) =>
        event.id === id ? updatedEvent : event
      );
      const fullCalendarEvents = events.map(toFullCalendarEvent);

      set({
        events,
        fullCalendarEvents,
        isLoading: false,
      });

      return updatedEvent;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update event',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteEvent: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await eventApi.delete(id);

      // Remove from local state
      const events = get().events.filter((event) => event.id !== id);
      const fullCalendarEvents = events.map(toFullCalendarEvent);

      set({
        events,
        fullCalendarEvents,
        selectedEvent: get().selectedEvent?.id === id ? null : get().selectedEvent,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to delete event',
        isLoading: false,
      });
      throw error;
    }
  },

  setSelectedEvent: (event: CalendarEvent | null) => {
    set({ selectedEvent: event });
  },

  clearEvents: () => {
    set({
      events: [],
      fullCalendarEvents: [],
      selectedEvent: null,
      error: null,
    });
  },
}));
