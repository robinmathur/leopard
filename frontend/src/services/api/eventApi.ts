/**
 * Calendar Event API Service
 */

import { httpClient } from './httpClient';
import type { PaginatedResponse } from '@/types/common';
import type {
  CalendarEvent,
  CalendarEventCreateRequest,
  CalendarEventUpdateRequest,
  CalendarEventListParams,
} from '@/types/event';

export const eventApi = {
  /**
   * List calendar events with filtering
   */
  async list(params?: CalendarEventListParams): Promise<PaginatedResponse<CalendarEvent>> {
    const response = await httpClient.get<PaginatedResponse<CalendarEvent>>('/v1/events/', {
      params,
    });
    return response.data;
  },

  /**
   * Get a single calendar event by ID
   */
  async getById(id: number): Promise<CalendarEvent> {
    const response = await httpClient.get<CalendarEvent>(`/v1/events/${id}/`);
    return response.data;
  },

  /**
   * Create a new calendar event
   */
  async create(data: CalendarEventCreateRequest): Promise<CalendarEvent> {
    const response = await httpClient.post<CalendarEvent>('/v1/events/', data);
    return response.data;
  },

  /**
   * Update an existing calendar event
   */
  async update(id: number, data: CalendarEventUpdateRequest): Promise<CalendarEvent> {
    const response = await httpClient.patch<CalendarEvent>(`/v1/events/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a calendar event (soft delete)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/v1/events/${id}/`);
  },

  /**
   * Get upcoming events
   */
  async getUpcoming(days: number = 7): Promise<PaginatedResponse<CalendarEvent>> {
    const response = await httpClient.get<PaginatedResponse<CalendarEvent>>('/v1/events/upcoming/', {
      params: { days },
    });
    return response.data;
  },

  /**
   * Get today's events
   */
  async getToday(): Promise<PaginatedResponse<CalendarEvent>> {
    const response = await httpClient.get<PaginatedResponse<CalendarEvent>>('/v1/events/today/');
    return response.data;
  },
};
