/**
 * Shared TaskList Component Types
 * Reusable types for TaskList components across different entities
 */
import { Task, TaskStatus, TaskPriority } from '@/services/api/taskApi';

export type { Task, TaskStatus, TaskPriority };

export interface TaskListProps {
  /** List of tasks to display */
  tasks: Task[];

  /** Whether tasks are loading */
  isLoading?: boolean;

  /** Error message if any */
  error?: string | null;

  /** Callback when task is clicked */
  onTaskClick?: (task: Task) => void;

  /** Callback when task status changes */
  onStatusChange?: (taskId: number, status: TaskStatus) => void;

  /** Callback when task is edited */
  onTaskEdit?: (task: Task) => void;

  /** Callback when task is deleted */
  onTaskDelete?: (taskId: number) => void;

  /** Callback for quick assign/reassign (userId can be 0 or null to unassign) */
  onQuickAssign?: (taskId: number, userId: number | null) => void;

  /** Whether to show status filter */
  showFilters?: boolean;

  /** Active status filter */
  activeStatusFilter?: TaskStatus | 'all';

  /** Callback when filter changes */
  onFilterChange?: (status: TaskStatus | 'all') => void;

  /** Use expandable task items (for entity views) */
  useExpandableItems?: boolean;

  /** Callback when task is updated (for refreshing task data) */
  onTaskUpdate?: (task: Task) => void;

  /** Selected task ID for highlighting */
  selectedTaskId?: number | null;
}

export interface TaskItemProps {
  /** Task data */
  task: Task;

  /** Callback when task is clicked */
  onClick?: (task: Task) => void;

  /** Callback when status changes */
  onStatusChange?: (taskId: number, status: TaskStatus) => void;

  /** Callback when task is edited */
  onEdit?: (task: Task) => void;

  /** Callback when task is deleted */
  onDelete?: (taskId: number) => void;

  /** Callback for quick assign/reassign (userId can be 0 or null to unassign) */
  onQuickAssign?: (taskId: number, userId: number | null) => void;

  /** Callback when task is updated (for refreshing task data) */
  onTaskUpdate?: (task: Task) => void;

  /** Whether this task is selected */
  isSelected?: boolean;
}

/**
 * Status color mapping
 */
export const STATUS_COLORS: Record<TaskStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  PENDING: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'default',
  OVERDUE: 'error',
};

/**
 * Priority color mapping
 */
export const PRIORITY_COLORS: Record<TaskPriority, 'default' | 'info' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};
