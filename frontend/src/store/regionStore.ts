/**
 * Region Store
 * Zustand store for region state management
 */
import { create } from 'zustand';
import { regionApi } from '@/services/api/regionApi';
import {
  Region,
  RegionCreateRequest,
  RegionUpdateRequest,
  RegionListParams,
} from '@/types/region';
import { ApiError } from '@/services/api/httpClient';

// Module-level AbortController to track and cancel in-flight fetchRegions requests
let fetchRegionsAbortController: AbortController | null = null;
// Module-level AbortController for fetchRegionById
let fetchRegionByIdAbortController: AbortController | null = null;

interface Pagination {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface RegionStore {
  // State
  regions: Region[];
  selectedRegion: Region | null;
  loading: boolean;
  error: ApiError | null;
  pagination: Pagination;

  // Actions
  fetchRegions: (params?: RegionListParams) => Promise<void>;
  fetchRegionById: (id: number) => Promise<Region | null>;
  addRegion: (data: RegionCreateRequest) => Promise<Region | null>;
  updateRegion: (id: number, data: RegionUpdateRequest) => Promise<Region | null>;
  deleteRegion: (id: number) => Promise<boolean>;
  setSelectedRegion: (region: Region | null) => void;
  clearError: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  cancelFetchRegions: () => void;
  cancelFetchRegionById: () => void;
}

export const useRegionStore = create<RegionStore>((set, get) => ({
  // Initial state
  regions: [],
  selectedRegion: null,
  loading: false,
  error: null,
  pagination: {
    count: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  },

  /**
   * Fetch regions with pagination and filtering
   * Automatically cancels any in-flight request to prevent race conditions
   */
  fetchRegions: async (params?: RegionListParams) => {
    // Abort any in-flight request to prevent race conditions
    fetchRegionsAbortController?.abort();
    fetchRegionsAbortController = new AbortController();
    const signal = fetchRegionsAbortController.signal;

    set({ loading: true, error: null });

    try {
      const { pagination } = get();
      const response = await regionApi.list({
        page: params?.page ?? pagination.page,
        page_size: params?.page_size ?? pagination.pageSize,
        ...params,
      }, signal);

      set({
        regions: response.results,
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
   * Fetch a single region by ID
   */
  fetchRegionById: async (id: number) => {
    // Abort any in-flight request
    fetchRegionByIdAbortController?.abort();
    fetchRegionByIdAbortController = new AbortController();
    const signal = fetchRegionByIdAbortController.signal;

    try {
      const region = await regionApi.getById(id, signal);
      set({ selectedRegion: region });
      return region;
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
   * Add a new region
   */
  addRegion: async (data: RegionCreateRequest) => {
    set({ error: null });

    try {
      const region = await regionApi.create(data);
      
      // Refresh the list
      await get().fetchRegions();
      
      return region;
    } catch (err) {
      const apiError = err as ApiError;
      set({ error: apiError });
      return null;
    }
  },

  /**
   * Update an existing region
   */
  updateRegion: async (id: number, data: RegionUpdateRequest) => {
    set({ error: null });

    try {
      const region = await regionApi.update(id, data);
      
      // Update in local state if region is in the list
      const { regions } = get();
      const updatedRegions = regions.map((r) => (r.id === id ? region : r));
      set({ regions: updatedRegions });
      
      // Update selected region if it's the one being updated
      const { selectedRegion } = get();
      if (selectedRegion?.id === id) {
        set({ selectedRegion: region });
      }
      
      return region;
    } catch (err) {
      const apiError = err as ApiError;
      set({ error: apiError });
      return null;
    }
  },

  /**
   * Delete a region
   */
  deleteRegion: async (id: number) => {
    set({ error: null });

    try {
      await regionApi.delete(id);
      
      // Remove from local state
      const { regions } = get();
      const filteredRegions = regions.filter((r) => r.id !== id);
      set({ regions: filteredRegions });
      
      // Clear selected region if it's the one being deleted
      const { selectedRegion } = get();
      if (selectedRegion?.id === id) {
        set({ selectedRegion: null });
      }
      
      return true;
    } catch (err) {
      const apiError = err as ApiError;
      set({ error: apiError });
      return false;
    }
  },

  /**
   * Set the selected region
   */
  setSelectedRegion: (region: Region | null) => {
    set({ selectedRegion: region });
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
   * Cancel in-flight fetchRegions request
   */
  cancelFetchRegions: () => {
    fetchRegionsAbortController?.abort();
    fetchRegionsAbortController = null;
  },

  /**
   * Cancel in-flight fetchRegionById request
   */
  cancelFetchRegionById: () => {
    fetchRegionByIdAbortController?.abort();
    fetchRegionByIdAbortController = null;
  },
}));

