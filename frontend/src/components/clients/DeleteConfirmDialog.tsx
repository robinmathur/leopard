/**
 * DeleteConfirmDialog Component
 * Confirmation dialog for deleting a client
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Client } from '@/types/client';

interface DeleteConfirmDialogProps {
  open: boolean;
  client: Client | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Format client full name
 */
const formatClientName = (client: Client): string => {
  const parts = [client.first_name];
  if (client.middle_name) parts.push(client.middle_name);
  if (client.last_name) parts.push(client.last_name);
  return parts.join(' ');
};

export const DeleteConfirmDialog = ({
  open,
  client,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteConfirmDialogProps) => {
  if (!client) return null;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="warning" />
        Delete Client
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete{' '}
          <strong>{formatClientName(client)}</strong>?
        </DialogContentText>
        <DialogContentText sx={{ mt: 1, color: 'text.secondary' }}>
          This action cannot be undone. The client will be permanently removed
          from the system.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmDialog;
