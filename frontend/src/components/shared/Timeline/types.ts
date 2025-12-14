/**
 * Shared Timeline Component Types
 * Reusable types for Timeline components across different entities
 */
import { ClientActivity } from '@/services/api/timelineApi';

export type { ClientActivity };

export interface TimelineProps {
  /** List of activities to display */
  activities: ClientActivity[];
  
  /** Whether timeline is loading */
  isLoading?: boolean;
  
  /** Error message if any */
  error?: string | null;
  
  /** Whether there are more items to load */
  hasMore?: boolean;
  
  /** Callback to load more items */
  onLoadMore?: () => void;
  
  /** Active filter */
  activeFilter?: string | null;
  
  /** Callback when filter changes */
  onFilterChange?: (activityType: string | null) => void;
  
  /** Whether to show filters */
  showFilters?: boolean;
}

export interface TimelineItemProps {
  /** Activity data */
  activity: ClientActivity;
}

export interface TimelineFiltersProps {
  /** Active filter */
  activeFilter: string | null;
  
  /** Callback when filter changes */
  onFilterChange: (activityType: string | null) => void;
}

/**
 * Activity type display configuration
 */
export const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; color: string; icon?: string }> = {
  NOTE_ADDED: { label: 'Note Added', color: '#1976d2', icon: '📝' },
  NOTE_EDITED: { label: 'Note Edited', color: '#1976d2', icon: '✏️' },
  NOTE_DELETED: { label: 'Note Deleted', color: '#d32f2f', icon: '🗑️' },
  STAGE_CHANGED: { label: 'Stage Changed', color: '#9c27b0', icon: '🔄' },
  ASSIGNED: { label: 'Assigned', color: '#2e7d32', icon: '👤' },
  PROFILE_PICTURE_UPLOADED: { label: 'Profile Picture Uploaded', color: '#0288d1', icon: '📷' },
  PASSPORT_UPDATED: { label: 'Passport Updated', color: '#ed6c02', icon: '🛂' },
  PROFICIENCY_ADDED: { label: 'Language Proficiency Added', color: '#0288d1', icon: '🌐' },
  QUALIFICATION_ADDED: { label: 'Qualification Added', color: '#0288d1', icon: '🎓' },
  VISA_APPLICATION_CREATED: { label: 'Visa Application Created', color: '#2e7d32', icon: '✈️' },
  COLLEGE_APPLICATION_CREATED: { label: 'College Application Created', color: '#2e7d32', icon: '🏫' },
  TASK_CREATED: { label: 'Task Created', color: '#ed6c02', icon: '📋' },
  TASK_COMPLETED: { label: 'Task Completed', color: '#2e7d32', icon: '✅' },
};
