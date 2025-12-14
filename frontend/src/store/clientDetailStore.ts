/**
 * Client Detail Store
 * Zustand store for client detail page state management with lazy loading
 */
import { create } from 'zustand';

/**
 * Tracks which sections have been loaded
 */
interface LoadedSections {
  overview: boolean;
  notes: boolean;
  timeline: boolean;
  documents: boolean;
  applications: boolean;
  tasks: boolean;
  reminders: boolean;
}

/**
 * Section-specific loading states
 */
interface SectionLoadingStates {
  notes: boolean;
  timeline: boolean;
  documents: boolean;
  applications: boolean;
  tasks: boolean;
  reminders: boolean;
}

/**
 * Section-specific error states
 */
interface SectionErrors {
  notes: string | null;
  timeline: string | null;
  documents: string | null;
  applications: string | null;
  tasks: string | null;
  reminders: string | null;
}

/**
 * Cached data for sections
 */
interface SectionCache {
  notes: unknown;
  timeline: unknown;
  documents: unknown;
  applications: unknown;
  tasks: unknown;
  reminders: unknown;
}

interface ClientDetailStore {
  // Current tab
  currentTab: string;
  
  // Loaded sections tracking
  loadedSections: LoadedSections;
  
  // Loading states for each section
  sectionLoading: SectionLoadingStates;
  
  // Error states for each section
  sectionErrors: SectionErrors;
  
  // Cached data for sections
  sectionCache: SectionCache;
  
  // Actions
  setCurrentTab: (tab: string) => void;
  markSectionLoaded: (section: keyof LoadedSections) => void;
  setSectionLoading: (section: keyof SectionLoadingStates, loading: boolean) => void;
  setSectionError: (section: keyof SectionErrors, error: string | null) => void;
  setSectionCache: (section: keyof SectionCache, data: unknown) => void;
  clearSectionCache: (section: keyof SectionCache) => void;
  resetStore: () => void;
}

const initialLoadedSections: LoadedSections = {
  overview: false,
  notes: false,
  timeline: false,
  documents: false,
  applications: false,
  tasks: false,
  reminders: false,
};

const initialSectionLoading: SectionLoadingStates = {
  notes: false,
  timeline: false,
  documents: false,
  applications: false,
  tasks: false,
  reminders: false,
};

const initialSectionErrors: SectionErrors = {
  notes: null,
  timeline: null,
  documents: null,
  applications: null,
  tasks: null,
  reminders: null,
};

const initialSectionCache: SectionCache = {
  notes: null,
  timeline: null,
  documents: null,
  applications: null,
  tasks: null,
  reminders: null,
};

export const useClientDetailStore = create<ClientDetailStore>((set) => ({
  // Initial state
  currentTab: 'overview',
  loadedSections: initialLoadedSections,
  sectionLoading: initialSectionLoading,
  sectionErrors: initialSectionErrors,
  sectionCache: initialSectionCache,

  /**
   * Set the current active tab
   */
  setCurrentTab: (tab: string) => {
    set({ currentTab: tab });
  },

  /**
   * Mark a section as loaded
   */
  markSectionLoaded: (section: keyof LoadedSections) => {
    set((state) => ({
      loadedSections: {
        ...state.loadedSections,
        [section]: true,
      },
    }));
  },

  /**
   * Set loading state for a section
   */
  setSectionLoading: (section: keyof SectionLoadingStates, loading: boolean) => {
    set((state) => ({
      sectionLoading: {
        ...state.sectionLoading,
        [section]: loading,
      },
    }));
  },

  /**
   * Set error for a section
   */
  setSectionError: (section: keyof SectionErrors, error: string | null) => {
    set((state) => ({
      sectionErrors: {
        ...state.sectionErrors,
        [section]: error,
      },
    }));
  },

  /**
   * Cache data for a section
   */
  setSectionCache: (section: keyof SectionCache, data: unknown) => {
    set((state) => ({
      sectionCache: {
        ...state.sectionCache,
        [section]: data,
      },
    }));
  },

  /**
   * Clear cached data for a section
   */
  clearSectionCache: (section: keyof SectionCache) => {
    set((state) => ({
      sectionCache: {
        ...state.sectionCache,
        [section]: null,
      },
      loadedSections: {
        ...state.loadedSections,
        [section]: false,
      },
    }));
  },

  /**
   * Reset the entire store to initial state
   */
  resetStore: () => {
    set({
      currentTab: 'overview',
      loadedSections: initialLoadedSections,
      sectionLoading: initialSectionLoading,
      sectionErrors: initialSectionErrors,
      sectionCache: initialSectionCache,
    });
  },
}));

export default useClientDetailStore;
