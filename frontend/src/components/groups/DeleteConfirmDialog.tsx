/**
 * DeleteConfirmDialog Component
 * Confirmation dialog for deleting a group
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import type { Group } from '@/types/user';

interface DeleteConfirmDialogProps {
  open: boolean;
  group: Group | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const DeleteConfirmDialog = ({
  open,
  group,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Group</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete group <strong>{group?.name}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This will remove the group from all users. This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading} size="small">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={loading}
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

