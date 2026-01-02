/**
 * TypeScript types for Calendar Events
 */

import { EventInput } from '@fullcalendar/core';

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start: string; // ISO datetime string
  end: string; // ISO datetime string
  duration: string | null; // Duration in HH:MM:SS format
  duration_minutes: number;
  assigned_to: number | null;
  assigned_to_name: string | null;
  assigned_to_full_name: string | null;
  hex_color: string;
  location: string;
  all_day: boolean;
  branch: number | null;
  branch_id: number | null;
  branch_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_by: number | null;
  updated_by_name: string | null;
  updated_at: string;
  is_past: boolean;
  is_ongoing: boolean;
  is_upcoming: boolean;
}

export interface CalendarEventCreateRequest {
  title: string;
  description?: string;
  start: string; // ISO datetime string
  end: string; // ISO datetime string
  assigned_to_id?: number | null;
  hex_color?: string;
  location?: string;
  all_day?: boolean;
  branch_id?: number | null;
}

export interface CalendarEventUpdateRequest {
  title?: string;
  description?: string;
  start?: string;
  end?: string;
  assigned_to_id?: number | null;
  hex_color?: string;
  location?: string;
  all_day?: boolean;
}

export interface CalendarEventListParams {
  start_date?: string;
  end_date?: string;
  assigned_to?: number;
  branch?: number;
  search?: string;
}

/**
 * Convert CalendarEvent to FullCalendar EventInput format
 */
export function toFullCalendarEvent(event: CalendarEvent): EventInput {
  return {
    id: event.id.toString(),
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.all_day,
    backgroundColor: event.hex_color,
    borderColor: event.hex_color,
    extendedProps: {
      description: event.description,
      location: event.location,
      assigned_to: event.assigned_to,
      assigned_to_full_name: event.assigned_to_full_name,
      duration_minutes: event.duration_minutes,
      is_past: event.is_past,
      is_ongoing: event.is_ongoing,
      is_upcoming: event.is_upcoming,
    },
  };
}
