/**
 * Note API Client
 * Handles all note-related API operations
 */
import httpClient from './httpClient';

export interface Note {
  id: number;
  client: number;
  author: number;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NoteCreateRequest {
  client: number;
  content: string;
}

export interface NoteUpdateRequest {
  content: string;
}

export interface NoteListParams {
  client?: number;
  author?: number;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * List notes with optional filters
 */
export const listNotes = async (params?: NoteListParams, signal?: AbortSignal): Promise<PaginatedResponse<Note>> => {
  const response = await httpClient.get<PaginatedResponse<Note>>('/v1/notes/', { params, signal });
  return response.data;
};

/**
 * Get a specific note by ID
 */
export const getNote = async (id: number): Promise<Note> => {
  const response = await httpClient.get<Note>(`/v1/notes/${id}/`);
  return response.data;
};

/**
 * Create a new note
 */
export const createNote = async (data: NoteCreateRequest): Promise<Note> => {
  const response = await httpClient.post<Note>('/v1/notes/', data);
  return response.data;
};

/**
 * Update a note (partial update)
 */
export const updateNote = async (id: number, data: NoteUpdateRequest): Promise<Note> => {
  const response = await httpClient.patch<Note>(`/v1/notes/${id}/`, data);
  return response.data;
};

/**
 * Delete a note
 */
export const deleteNote = async (id: number): Promise<void> => {
  await httpClient.delete(`/v1/notes/${id}/`);
};

export default {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
};
