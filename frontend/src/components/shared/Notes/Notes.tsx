/**
 * Notes Component
 * Reusable notes component for any entity
 */
import {
  Box,
  Typography,
  Button,
  Alert,
  Skeleton,
  Collapse,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import { NotesProps } from './types';
import { NoteForm } from './NoteForm';
import { NoteItem } from './NoteItem';

/**
 * Loading skeleton for notes
 */
const NotesSkeleton = () => (
  <Box>
    {[...Array(3)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="text" width={200} height={24} />
        <Skeleton variant="text" width={100} height={20} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Notes Component
 */
export const Notes = ({
  entityId,
  isLoading = false,
  error = null,
  showAddForm: showAddFormProp = false,
  onAdd,
  onEdit,
  onDelete,
  notes,
  canAdd = false,
  canEdit = false,
  canDelete = false,
}: NotesProps) => {
  const [showAddForm, setShowAddForm] = useState(showAddFormProp);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (content: string) => {
    if (!onAdd) return;

    setIsSubmitting(true);
    try {
      await onAdd(content);
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id: number, content: string) => {
    if (!onEdit) return;
    await onEdit(id, content);
  };

  const handleDelete = async (id: number) => {
    if (!onDelete) return;
    await onDelete(id);
  };

  // Loading state
  if (isLoading) {
    return <NotesSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Add Note Button */}
      {canAdd && onAdd && !showAddForm && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddForm(true)}
            size="small"
          >
            Add Note
          </Button>
        </Box>
      )}

      {/* Add Note Form */}
      {canAdd && onAdd && (
        <Collapse in={showAddForm}>
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Add New Note
            </Typography>
            <NoteForm
              isSubmitting={isSubmitting}
              submitLabel="Add Note"
              onSubmit={handleAdd}
              onCancel={() => setShowAddForm(false)}
            />
          </Box>
        </Collapse>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            No notes yet. {canAdd && 'Add the first note to get started.'}
          </Typography>
        </Box>
      ) : (
        <>
          <Divider sx={{ mb: 2 }} />
          <Box>
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={onEdit ? handleEdit : undefined}
                onDelete={onDelete ? handleDelete : undefined}
              />
            ))}
          </Box>
        </>
      )}

      {/* Notes Count */}
      {notes.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </Typography>
      )}
    </Box>
  );
};

export default Notes;
