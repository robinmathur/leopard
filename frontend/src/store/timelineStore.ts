/**
 * Timeline Store
 * Manages timeline/activity state using Zustand
 */
import { create } from 'zustand';
import { ClientActivity, getTimeline, TimelineListParams } from '@/services/api/timelineApi';
import type { ApiError } from '@/services/api/httpClient';

interface TimelineStore {
  // State
  activities: ClientActivity[];
  isLoading: boolean;
  error: ApiError | null;
  currentPage: number;
  totalCount: number;
  hasMore: boolean;
  activeFilter: string | null;

  // Actions
  fetchTimeline: (clientId: number, params?: TimelineListParams) => Promise<void>;
  setFilter: (activityType: string | null) => void;
  loadMore: (clientId: number) => Promise<void>;
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  activities: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  totalCount: 0,
  hasMore: false,
  activeFilter: null,
};

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  ...initialState,

  /**
   * Fetch timeline activities for a specific client
   */
  fetchTimeline: async (clientId: number, params?: TimelineListParams) => {
    set({ isLoading: true, error: null });

    try {
      const page = params?.page ?? get().currentPage;
      const response = await getTimeline(clientId, {
        ...params,
        page,
        page_size: 25,
      });

      set({
        activities: response.results,
        currentPage: page,
        totalCount: response.count,
        hasMore: response.next !== null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error as ApiError,
        isLoading: false,
      });
    }
  },

  /**
   * Load more activities (pagination)
   */
  loadMore: async (clientId: number) => {
    const { currentPage, isLoading, hasMore, activeFilter } = get();
    
    if (isLoading || !hasMore) return;

    const nextPage = currentPage + 1;
    set({ isLoading: true, error: null });

    try {
      const response = await getTimeline(clientId, {
        page: nextPage,
        page_size: 25,
        activity_type: activeFilter || undefined,
      });

      set((state) => ({
        activities: [...state.activities, ...response.results],
        currentPage: nextPage,
        totalCount: response.count,
        hasMore: response.next !== null,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error as ApiError,
        isLoading: false,
      });
    }
  },

  /**
   * Set activity type filter and refresh
   */
  setFilter: (activityType: string | null) => {
    set({
      activeFilter: activityType,
      currentPage: 1,
    });
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
}));

export default useTimelineStore;
