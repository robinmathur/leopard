/**
 * Note Store
 * Manages note state using Zustand
 */
import { create } from 'zustand';
import {
  Note,
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  NoteCreateRequest,
  NoteUpdateRequest,
} from '@/services/api/noteApi';
import type { ApiError } from '@/services/api/httpClient';

// Module-level AbortController for fetchNotes
let fetchNotesAbortController: AbortController | null = null;

interface NoteStore {
  // State
  notes: Note[];
  isLoading: boolean;
  error: ApiError | null;
  currentPage: number;
  totalCount: number;
  hasMore: boolean;

  // Actions
  fetchNotes: (clientId: number, page?: number) => Promise<void>;
  addNote: (data: NoteCreateRequest) => Promise<Note | null>;
  editNote: (id: number, data: NoteUpdateRequest) => Promise<Note | null>;
  removeNote: (id: number) => Promise<boolean>;
  clearError: () => void;
  resetStore: () => void;
  cancelFetchNotes: () => void;
}

const initialState = {
  notes: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  totalCount: 0,
  hasMore: false,
};

export const useNoteStore = create<NoteStore>((set) => ({
  ...initialState,

  /**
   * Fetch notes for a specific client
   * Automatically cancels any in-flight request
   */
  fetchNotes: async (clientId: number, page = 1) => {
    // Abort any in-flight request
    fetchNotesAbortController?.abort();
    fetchNotesAbortController = new AbortController();
    const signal = fetchNotesAbortController.signal;

    set({ isLoading: true, error: null });

    try {
      const response = await listNotes({ client: clientId, page, page_size: 25 }, signal);
      
      set({
        notes: response.results,
        currentPage: page,
        totalCount: response.count,
        hasMore: response.next !== null,
        isLoading: false,
      });
    } catch (error) {
      // Ignore abort errors
      if ((error as Error).name === 'CanceledError' || signal.aborted) {
        return;
      }
      set({
        error: error as ApiError,
        isLoading: false,
      });
    }
  },

  /**
   * Create a new note
   */
  addNote: async (data: NoteCreateRequest) => {
    set({ isLoading: true, error: null });

    try {
      const newNote = await createNote(data);
      
      // Add to beginning of list (newest first)
      set((state) => ({
        notes: [newNote, ...state.notes],
        totalCount: state.totalCount + 1,
        isLoading: false,
      }));

      return newNote;
    } catch (error) {
      set({
        error: error as ApiError,
        isLoading: false,
      });
      return null;
    }
  },

  /**
   * Update an existing note
   */
  editNote: async (id: number, data: NoteUpdateRequest) => {
    set({ isLoading: true, error: null });

    try {
      const updatedNote = await updateNote(id, data);
      
      // Update note in list
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? updatedNote : note
        ),
        isLoading: false,
      }));

      return updatedNote;
    } catch (error) {
      set({
        error: error as ApiError,
        isLoading: false,
      });
      return null;
    }
  },

  /**
   * Delete a note
   */
  removeNote: async (id: number) => {
    set({ isLoading: true, error: null });

    try {
      await deleteNote(id);
      
      // Remove from list
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        totalCount: state.totalCount - 1,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      set({
        error: error as ApiError,
        isLoading: false,
      });
      return false;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset store to initial state
   */
  resetStore: () => {
    set(initialState);
  },

  /**
   * Cancel any in-flight fetchNotes request
   */
  cancelFetchNotes: () => {
    fetchNotesAbortController?.abort();
    fetchNotesAbortController = null;
  },
}));

export default useNoteStore;
