/**
 * Shared Notes Component Types
 * Reusable types for Notes components across different entities
 */
import { Note } from '@/services/api/noteApi';

export type { Note };

export interface NotesProps {
  /** Entity ID (e.g., client ID) */
  entityId: number;
  
  /** Whether notes are loading */
  isLoading?: boolean;
  
  /** Error message if any */
  error?: string | null;
  
  /** Whether to show add note form */
  showAddForm?: boolean;
  
  /** Callback when adding a note */
  onAdd?: (content: string) => Promise<void>;
  
  /** Callback when editing a note */
  onEdit?: (id: number, content: string) => Promise<void>;
  
  /** Callback when deleting a note */
  onDelete?: (id: number) => Promise<void>;
  
  /** List of notes to display */
  notes: Note[];
  
  /** Whether user can add notes */
  canAdd?: boolean;
  
  /** Whether user can edit notes */
  canEdit?: boolean;
  
  /** Whether user can delete notes */
  canDelete?: boolean;
}

export interface NoteFormProps {
  /** Initial value for edit mode */
  initialValue?: string;
  
  /** Whether form is in edit mode */
  isEdit?: boolean;
  
  /** Whether form is submitting */
  isSubmitting?: boolean;
  
  /** Submit button label */
  submitLabel?: string;
  
  /** Cancel button label */
  cancelLabel?: string;
  
  /** Callback on submit */
  onSubmit: (content: string) => void | Promise<void>;
  
  /** Callback on cancel */
  onCancel?: () => void;
  
  /** Max length for content */
  maxLength?: number;
}

export interface NoteItemProps {
  /** Note data */
  note: Note;
  
  /** Whether user can edit this note */
  canEdit?: boolean;
  
  /** Whether user can delete this note */
  canDelete?: boolean;
  
  /** Callback when editing */
  onEdit?: (id: number, content: string) => void | Promise<void>;
  
  /** Callback when deleting */
  onDelete?: (id: number) => void | Promise<void>;
}
