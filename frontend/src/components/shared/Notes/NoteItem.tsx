/**
 * NoteItem Component
 * Displays a single note with edit/delete actions
 */
import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { NoteItemProps } from './types';
import { NoteForm } from './NoteForm';

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
};

export const NoteItem = ({
  note,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}: NoteItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleEdit = async (content: string) => {
    if (!onEdit) return;
    
    setIsSubmitting(true);
    try {
      await onEdit(note.id, content);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsSubmitting(true);
    try {
      await onDelete(note.id);
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUpdated = note.updated_at !== note.created_at;

  return (
    <>
      <Paper
        sx={{
          p: 2,
          mb: 2,
          position: 'relative',
          '&:hover .note-actions': {
            opacity: 1,
          },
        }}
      >
        {/* Note Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>
              {note.author_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(note.created_at)}
              {isUpdated && ' (edited)'}
            </Typography>
          </Box>
          
          {/* Actions */}
          {(canEdit || canDelete) && !isEditing && (
            <Box
              className="note-actions"
              sx={{
                display: 'flex',
                gap: 0.5,
                opacity: { xs: 1, sm: 0 },
                transition: 'opacity 0.2s',
              }}
            >
              {canEdit && onEdit && (
                <Tooltip title="Edit note">
                  <IconButton
                    size="small"
                    onClick={() => setIsEditing(true)}
                    disabled={isSubmitting}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {canDelete && onDelete && (
                <Tooltip title="Delete note">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isSubmitting}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        {/* Note Content */}
        {isEditing ? (
          <Box sx={{ mt: 2 }}>
            <NoteForm
              initialValue={note.content}
              isEdit
              isSubmitting={isSubmitting}
              submitLabel="Save Changes"
              onSubmit={handleEdit}
              onCancel={() => setIsEditing(false)}
            />
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {note.content}
          </Typography>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isSubmitting && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Note?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this note? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NoteItem;
