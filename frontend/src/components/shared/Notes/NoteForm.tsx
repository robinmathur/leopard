/**
 * NoteForm Component
 * Reusable form for creating and editing notes
 */
import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { NoteFormProps } from './types';

export const NoteForm = ({
  initialValue = '',
  isEdit = false,
  isSubmitting = false,
  submitLabel = 'Add Note',
  cancelLabel = 'Cancel',
  onSubmit,
  onCancel,
  maxLength = 10000,
}: NoteFormProps) => {
  const [content, setContent] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!content.trim()) {
      setError('Note content cannot be empty');
      return;
    }

    if (content.length > maxLength) {
      setError(`Note content cannot exceed ${maxLength} characters`);
      return;
    }

    try {
      await onSubmit(content.trim());
      if (!isEdit) {
        setContent(''); // Clear form after add
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to save note');
    }
  };

  const handleCancel = () => {
    setContent(initialValue);
    setError(null);
    onCancel?.();
  };

  const remainingChars = maxLength - content.length;
  const isNearLimit = remainingChars < 500;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <TextField
        fullWidth
        multiline
        rows={4}
        placeholder="Write a note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isSubmitting}
        error={Boolean(error) || remainingChars < 0}
        helperText={
          error || (isNearLimit && `${remainingChars} characters remaining`)
        }
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || !content.trim() || remainingChars < 0}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </Box>

      {!isEdit && content.length > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'block' }}
        >
          {content.length} / {maxLength} characters
        </Typography>
      )}
    </Box>
  );
};

export default NoteForm;
