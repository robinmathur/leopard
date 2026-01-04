/**
 * Branch Store
 * Zustand store for branch state management
 */
import { create } from 'zustand';
import { branchApi } from '@/services/api/branchApi';
import {
  Branch,
  BranchCreateRequest,
  BranchUpdateRequest,
  BranchListParams,
} from '@/types/branch';
import { ApiError } from '@/services/api/httpClient';

// Module-level AbortController to track and cancel in-flight fetchBranches requests
let fetchBranchesAbortController: AbortController | null = null;
// Module-level AbortController for fetchBranchById
let fetchBranchByIdAbortController: AbortController | null = null;

interface Pagination {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BranchStore {
  // State
  branches: Branch[];
  selectedBranch: Branch | null;
  loading: boolean;
  error: ApiError | null;
  pagination: Pagination;

  // Actions
  fetchBranches: (params?: BranchListParams) => Promise<void>;
  fetchBranchById: (id: number) => Promise<Branch | null>;
  addBranch: (data: BranchCreateRequest) => Promise<Branch | null>;
  updateBranch: (id: number, data: BranchUpdateRequest) => Promise<Branch | null>;
  deleteBranch: (id: number) => Promise<boolean>;
  restoreBranch: (id: number) => Promise<Branch | null>;
  setSelectedBranch: (branch: Branch | null) => void;
  clearError: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  cancelFetchBranches: () => void;
  cancelFetchBranchById: () => void;
}

export const useBranchStore = create<BranchStore>((set, get) => ({
  // Initial state
  branches: [],
  selectedBranch: null,
  loading: false,
  error: null,
  pagination: {
    count: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  },

  /**
   * Fetch branches with pagination and filtering
   * Automatically cancels any in-flight request to prevent race conditions
   */
  fetchBranches: async (params?: BranchListParams) => {
    // Abort any in-flight request to prevent race conditions
    fetchBranchesAbortController?.abort();
    fetchBranchesAbortController = new AbortController();
    const signal = fetchBranchesAbortController.signal;

    set({ loading: true, error: null });

    try {
      const { pagination } = get();
      const response = await branchApi.list({
        page: params?.page ?? pagination.page,
        page_size: params?.page_size ?? pagination.pageSize,
        ...params,
      }, signal);

      set({
        branches: response.results,
        pagination: {
          count: response.count,
          page: params?.page ?? pagination.page,
          pageSize: params?.page_size ?? pagination.pageSize,
          totalPages: Math.ceil(response.count / (params?.page_size ?? pagination.pageSize)),
        },
        loading: false,
      });
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'CanceledError' || signal.aborted) {
        return;
      }

      const apiError = err as ApiError;
      set({
        error: apiError,
        loading: false,
      });
    }
  },

  /**
   * Fetch a single branch by ID
   */
  fetchBranchById: async (id: number) => {
    // Abort any in-flight request
    fetchBranchByIdAbortController?.abort();
    fetchBranchByIdAbortController = new AbortController();
    const signal = fetchBranchByIdAbortController.signal;

    try {
      const branch = await branchApi.getById(id, signal);
      set({ selectedBranch: branch });
      return branch;
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'CanceledError' || signal.aborted) {
        return null;
      }

      const apiError = err as ApiError;
      set({ error: apiError });
      return null;
    }
  },

  /**
   * Add a new branch
   */
  addBranch: async (data: BranchCreateRequest) => {
    set({ error: null });

    try {
      const branch = await branchApi.create(data);
      
      // Refresh the list
      await get().fetchBranches();
      
      return branch;
    } catch (err) {
      const apiError = err as ApiError;
      set({ error: apiError });
      return null;
    }
  },

  /**
   * Update an existing branch
   */
  updateBranch: async (id: number, data: BranchUpdateRequest) => {
    set({ error: null });

    try {
      const branch = await branchApi.update(id, data);
      
      // Update in local state if branch is in the list
      const { branches } = get();
      const updatedBranches = branches.map((b) => (b.id === id ? branch : b));
      set({ branches: updatedBranches });
      
      // Update selected branch if it's the one being updated
      const { selectedBranch } = get();
      if (selectedBranch?.id === id) {
        set({ selectedBranch: branch });
      }
      
      return branch;
    } catch (err) {
      const apiError = err as ApiError;
      set({ error: apiError });
      return null;
    }
  },

  /**
   * Delete a branch (soft delete)
   */
  deleteBranch: async (id: number) => {
    set({ error: null });

    try {
      await branchApi.delete(id);
      
      // Remove from local state
      const { branches } = get();
      const filteredBranches = branches.filter((b) => b.id !== id);
      set({ branches: filteredBranches });
      
      // Clear selected branch if it's the one being deleted
      const { selectedBranch } = get();
      if (selectedBranch?.id === id) {
        set({ selectedBranch: null });
      }
      
      return true;
    } catch (err) {
      const apiError = err as ApiError;
      set({ error: apiError });
      return false;
    }
  },

  /**
   * Restore a soft-deleted branch
   */
  restoreBranch: async (id: number) => {
    set({ error: null });

    try {
      const branch = await branchApi.restore(id);
      
      // Refresh the list
      await get().fetchBranches();
      
      return branch;
    } catch (err) {
      const apiError = err as ApiError;
      set({ error: apiError });
      return null;
    }
  },

  /**
   * Set the selected branch
   */
  setSelectedBranch: (branch: Branch | null) => {
    set({ selectedBranch: branch });
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set current page
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
   * Set page size
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
   * Cancel in-flight fetchBranches request
   */
  cancelFetchBranches: () => {
    fetchBranchesAbortController?.abort();
    fetchBranchesAbortController = null;
  },

  /**
   * Cancel in-flight fetchBranchById request
   */
  cancelFetchBranchById: () => {
    fetchBranchByIdAbortController?.abort();
    fetchBranchByIdAbortController = null;
  },
}));

