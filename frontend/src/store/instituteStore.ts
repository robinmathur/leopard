/**
 * Institute Store
 * Zustand store for institute state management
 */
import { create } from 'zustand';
import { instituteApi } from '@/services/api/instituteApi';
import {
  Institute,
  InstituteCreateRequest,
  InstituteUpdateRequest,
  InstituteListParams,
} from '@/types/institute';
import { ApiError } from '@/services/api/httpClient';

// Module-level AbortController to track and cancel in-flight fetchInstitutes requests
let fetchInstitutesAbortController: AbortController | null = null;
// Module-level AbortController for fetchInstituteById
let fetchInstituteByIdAbortController: AbortController | null = null;

interface Pagination {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface InstituteStore {
  // State
  institutes: Institute[];
  selectedInstitute: Institute | null;
  loading: boolean;
  error: ApiError | null;
  pagination: Pagination;

  // Actions
  fetchInstitutes: (params?: InstituteListParams) => Promise<void>;
  fetchInstituteById: (id: number) => Promise<Institute | null>;
  addInstitute: (data: InstituteCreateRequest) => Promise<Institute | null>;
  updateInstitute: (id: number, data: InstituteUpdateRequest) => Promise<Institute | null>;
  deleteInstitute: (id: number) => Promise<boolean>;
  setSelectedInstitute: (institute: Institute | null) => void;
  clearError: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  cancelFetchInstitutes: () => void;
  cancelFetchInstituteById: () => void;
}

export const useInstituteStore = create<InstituteStore>((set, get) => ({
  // Initial state
  institutes: [],
  selectedInstitute: null,
  loading: false,
  error: null,
  pagination: {
    count: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  },

  /**
   * Fetch institutes with pagination and filtering
   * Automatically cancels any in-flight request to prevent race conditions
   */
  fetchInstitutes: async (params?: InstituteListParams) => {
    // Abort any in-flight request to prevent race conditions
    fetchInstitutesAbortController?.abort();
    fetchInstitutesAbortController = new AbortController();
    const signal = fetchInstitutesAbortController.signal;

    set({ loading: true, error: null });

    try {
      const { pagination } = get();
      const response = await instituteApi.list(
        {
          page: params?.page ?? pagination.page,
          page_size: params?.page_size ?? pagination.pageSize,
          ...params,
        },
        signal
      );

      set({
        institutes: response.results,
        pagination: {
          count: response.count,
          page: params?.page ?? pagination.page,
          pageSize: params?.page_size ?? pagination.pageSize,
          totalPages: Math.ceil(
            response.count / (params?.page_size ?? pagination.pageSize)
          ),
        },
        loading: false,
      });
    } catch (error) {
      // Ignore abort errors - request was intentionally cancelled
      if ((error as Error).name === 'CanceledError' || signal.aborted) {
        return;
      }

      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
      });
    }
  },

  /**
   * Fetch a single institute by ID
   * Automatically cancels any in-flight request to prevent race conditions
   */
  fetchInstituteById: async (id: number) => {
    // Abort any in-flight request to prevent race conditions
    fetchInstituteByIdAbortController?.abort();
    fetchInstituteByIdAbortController = new AbortController();
    const signal = fetchInstituteByIdAbortController.signal;

    set({ loading: true, error: null });

    try {
      const institute = await instituteApi.getById(id, signal);
      set({
        selectedInstitute: institute,
        loading: false,
      });
      return institute;
    } catch (error) {
      // Ignore abort errors - request was intentionally cancelled
      if ((error as Error).name === 'CanceledError' || signal.aborted) {
        return null;
      }
      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
        selectedInstitute: null,
      });
      return null;
    }
  },

  /**
   * Create a new institute
   */
  addInstitute: async (data: InstituteCreateRequest) => {
    set({ loading: true, error: null });

    try {
      const institute = await instituteApi.create(data);
      const { institutes, pagination } = get();
      set({
        institutes: [institute, ...institutes],
        pagination: {
          ...pagination,
          count: pagination.count + 1,
        },
        loading: false,
      });
      return institute;
    } catch (error) {
      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
      });
      return null;
    }
  },

  /**
   * Update an existing institute
   */
  updateInstitute: async (id: number, data: InstituteUpdateRequest) => {
    set({ loading: true, error: null });

    try {
      const updatedInstitute = await instituteApi.update(id, data);
      const { institutes, selectedInstitute } = get();

      // Update in list
      const updatedInstitutes = institutes.map((inst) =>
        inst.id === id ? updatedInstitute : inst
      );

      // Update selected if it's the same institute
      const updatedSelected =
        selectedInstitute?.id === id ? updatedInstitute : selectedInstitute;

      set({
        institutes: updatedInstitutes,
        selectedInstitute: updatedSelected,
        loading: false,
      });
      return updatedInstitute;
    } catch (error) {
      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
      });
      return null;
    }
  },

  /**
   * Delete an institute (soft delete)
   */
  deleteInstitute: async (id: number) => {
    set({ loading: true, error: null });

    try {
      await instituteApi.delete(id);
      const { institutes, selectedInstitute } = get();

      // Remove from list
      const filteredInstitutes = institutes.filter((inst) => inst.id !== id);

      // Clear selected if it's the deleted institute
      const updatedSelected =
        selectedInstitute?.id === id ? null : selectedInstitute;

      set({
        institutes: filteredInstitutes,
        selectedInstitute: updatedSelected,
        pagination: {
          ...get().pagination,
          count: get().pagination.count - 1,
        },
        loading: false,
      });
      return true;
    } catch (error) {
      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
      });
      return false;
    }
  },

  /**
   * Set the currently selected institute
   */
  setSelectedInstitute: (institute: Institute | null) => {
    set({ selectedInstitute: institute });
  },

  /**
   * Clear the current error
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set the current page
   */
  setPage: (page: number) => {
    set((state) => ({
      pagination: {
        ...state.pagination,
        page,
      },
    }));
  },

  /**
   * Set the page size
   */
  setPageSize: (pageSize: number) => {
    set((state) => ({
      pagination: {
        ...state.pagination,
        pageSize,
        page: 1, // Reset to first page when changing page size
      },
    }));
  },

  /**
   * Cancel any in-flight fetchInstitutes request
   */
  cancelFetchInstitutes: () => {
    fetchInstitutesAbortController?.abort();
    fetchInstitutesAbortController = null;
  },

  /**
   * Cancel any in-flight fetchInstituteById request
   */
  cancelFetchInstituteById: () => {
    fetchInstituteByIdAbortController?.abort();
    fetchInstituteByIdAbortController = null;
  },
}));
