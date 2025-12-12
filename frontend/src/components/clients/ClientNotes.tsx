/**
 * ClientNotes Component
 * Client-specific notes component using shared Notes
 */
import { useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import { Notes } from '@/components/shared/Notes';
import { useNoteStore } from '@/store/noteStore';
import { usePermission } from '@/auth/hooks/usePermission';

export interface ClientNotesProps {
  /** Client ID */
  clientId: number;
}

/**
 * ClientNotes Component
 * Displays and manages notes for a specific client
 */
export const ClientNotes = ({ clientId }: ClientNotesProps) => {
  const {
    notes,
    isLoading,
    error,
    fetchNotes,
    addNote,
    editNote,
    removeNote,
  } = useNoteStore();
  
  const { hasPermission } = usePermission();

  // Check permissions
  const canAddNote = hasPermission('add_note');
  const canEditNote = hasPermission('change_note');
  const canDeleteNote = hasPermission('delete_note');

  // Fetch notes when component mounts or clientId changes
  useEffect(() => {
    fetchNotes(clientId);
  }, [clientId, fetchNotes]);

  // Handle adding a note
  const handleAddNote = async (content: string) => {
    await addNote({ client: clientId, content });
  };

  // Handle editing a note
  const handleEditNote = async (id: number, content: string) => {
    await editNote(id, { content });
  };

  // Handle deleting a note
  const handleDeleteNote = async (id: number) => {
    await removeNote(id);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Notes
        entityId={clientId}
        isLoading={isLoading}
        error={error?.message || null}
        notes={notes}
        canAdd={canAddNote}
        canEdit={canEditNote}
        canDelete={canDeleteNote}
        onAdd={canAddNote ? handleAddNote : undefined}
        onEdit={canEditNote ? handleEditNote : undefined}
        onDelete={canDeleteNote ? handleDeleteNote : undefined}
      />
    </Paper>
  );
};

export default ClientNotes;
