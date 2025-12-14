/**
 * VisaApplicationDeleteDialog Component
 * Confirmation dialog for deleting a visa application
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
import { VisaApplication } from '@/services/api/visaApplicationApi';

interface VisaApplicationDeleteDialogProps {
  open: boolean;
  application: VisaApplication | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const VisaApplicationDeleteDialog = ({
  open,
  application,
  onConfirm,
  onCancel,
  loading = false,
}: VisaApplicationDeleteDialogProps) => {
  if (!application) return null;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="warning" />
        Delete Visa Application
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete the visa application for{' '}
          <strong>{application.client_name}</strong>?
        </DialogContentText>
        <DialogContentText sx={{ mt: 1 }}>
          <strong>Visa Type:</strong> {application.visa_type_name}
        </DialogContentText>
        <DialogContentText sx={{ mt: 1, color: 'text.secondary' }}>
          This action cannot be undone. The visa application will be permanently removed
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

export default VisaApplicationDeleteDialog;
