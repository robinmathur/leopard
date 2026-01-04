/**
 * ChangeVisaStatusDialog - Dialog for changing the status of a visa application
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import { updateVisaApplication } from '@/services/api/visaApplicationApi';
import type { VisaApplication, VisaApplicationStatus } from '@/services/api/visaApplicationApi';
import { VISA_STATUS_LABELS } from '@/types/visaType';

interface ChangeVisaStatusDialogProps {
  open: boolean;
  onClose: () => void;
  application: VisaApplication | null;
  onSuccess: () => void;
}

// Define status transition options based on current status
const getStatusTransitions = (status: VisaApplicationStatus): { label: string; value: VisaApplicationStatus }[] => {
  if (status === 'TO_BE_APPLIED') {
    return [
      { label: 'Move to Visa Applied', value: 'VISA_APPLIED' },
      { label: 'Move to Withdrawn', value: 'WITHDRAWN' },
    ];
  } else if (status === 'VISA_APPLIED') {
    return [
      { label: 'Move to Case Opened', value: 'CASE_OPENED' },
      { label: 'Move to Granted', value: 'GRANTED' },
      { label: 'Move to Rejected', value: 'REJECTED' },
    ];
  } else if (status === 'CASE_OPENED') {
    return [
      { label: 'Move to Granted', value: 'GRANTED' },
      { label: 'Move to Rejected', value: 'REJECTED' },
    ];
  }
  return []; // Terminal states: GRANTED, REJECTED, WITHDRAWN
};

export const ChangeVisaStatusDialog: React.FC<ChangeVisaStatusDialogProps> = ({
  open,
  onClose,
  application,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<VisaApplicationStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset selected status when dialog opens
  useEffect(() => {
    if (open && application) {
      setSelectedStatus('');
      setError(null);
    }
  }, [open, application]);

  const handleChangeStatus = async () => {
    if (!selectedStatus || !application) return;

    try {
      setLoading(true);
      setError(null);
      await updateVisaApplication(application.id, {
        status: selectedStatus,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change status');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSelectedStatus('');
      onClose();
    }
  };

  if (!application) return null;

  const availableTransitions = getStatusTransitions(application.status);
  const canSubmit = selectedStatus && !loading;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change Visa Status</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Application: <strong>{application.client_name}</strong> - {application.visa_type_name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Current Status: <Chip label={VISA_STATUS_LABELS[application.status]} size="small" color="primary" />
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {availableTransitions.length === 0 ? (
          <Alert severity="info">
            No status transitions available from {VISA_STATUS_LABELS[application.status]}.
          </Alert>
        ) : (
          <FormControl fullWidth disabled={loading}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as VisaApplicationStatus)}
              label="New Status"
            >
              {availableTransitions.map((transition) => (
                <MenuItem key={transition.value} value={transition.value}>
                  {transition.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleChangeStatus}
          variant="contained"
          disabled={!canSubmit || availableTransitions.length === 0}
        >
          {loading ? 'Changing...' : 'Change Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
