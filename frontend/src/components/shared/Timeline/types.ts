/**
 * Shared Timeline Component Types
 * Reusable types for Timeline components across different entities
 */
import { ClientActivity } from '@/services/api/timelineApi';
import NoteIcon from '@mui/icons-material/Note';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonIcon from '@mui/icons-material/Person';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PassportIcon from '@mui/icons-material/CardTravel';
import LanguageIcon from '@mui/icons-material/Language';
import SchoolIcon from '@mui/icons-material/School';
import FlightIcon from '@mui/icons-material/Flight';
import BusinessIcon from '@mui/icons-material/Business';
import TaskIcon from '@mui/icons-material/Task';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SvgIconComponent } from '@mui/icons-material';

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
 * Uses Material-UI icons for modern, consistent design
 */
export const ACTIVITY_TYPE_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  icon: SvgIconComponent;
}> = {
  NOTE_ADDED: { label: 'Note Added', color: '#1976d2', icon: NoteIcon },
  NOTE_EDITED: { label: 'Note Edited', color: '#1976d2', icon: EditIcon },
  NOTE_DELETED: { label: 'Note Deleted', color: '#d32f2f', icon: DeleteIcon },
  STAGE_CHANGED: { label: 'Stage Changed', color: '#9c27b0', icon: SwapHorizIcon },
  ASSIGNED: { label: 'Assigned', color: '#2e7d32', icon: PersonIcon },
  PROFILE_PICTURE_UPLOADED: { label: 'Profile Picture Uploaded', color: '#0288d1', icon: PhotoCameraIcon },
  PASSPORT_UPDATED: { label: 'Passport Updated', color: '#ed6c02', icon: PassportIcon },
  PROFICIENCY_ADDED: { label: 'Language Proficiency Added', color: '#0288d1', icon: LanguageIcon },
  QUALIFICATION_ADDED: { label: 'Qualification Added', color: '#0288d1', icon: SchoolIcon },
  VISA_APPLICATION_CREATED: { label: 'Visa Application Created', color: '#ed6c02', icon: FlightIcon },
  COLLEGE_APPLICATION_CREATED: { label: 'College Application Created', color: '#9c27b0', icon: BusinessIcon },
  TASK_CREATED: { label: 'Task Created', color: '#ed6c02', icon: TaskIcon },
  TASK_COMPLETED: { label: 'Task Completed', color: '#2e7d32', icon: CheckCircleIcon },
};
