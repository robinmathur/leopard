/**
 * AssignVisaApplicationDialog - Dialog for assigning a visa application to a user
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import type { User } from '@/types/user';
import { updateVisaApplication } from '@/services/api/visaApplicationApi';
import type { VisaApplication } from '@/types/visaType';

interface AssignVisaApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  application: VisaApplication | null;
  onSuccess: () => void;
}

export const AssignVisaApplicationDialog: React.FC<AssignVisaApplicationDialogProps> = ({
  open,
  onClose,
  application,
  onSuccess,
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set currently assigned user from application data (no API call needed)
  useEffect(() => {
    if (open && application) {
      if (application.assigned_to && application.assigned_to_name) {
        // Create a minimal User object from application data
        // UserAutocomplete will load the full list of assignable users
        setSelectedUser({
          id: application.assigned_to,
          full_name: application.assigned_to_name,
          email: '', // Not needed for initial selection
          username: '',
        } as User);
      } else {
        setSelectedUser(null);
      }
    } else {
      setSelectedUser(null);
    }
  }, [open, application]);

  const handleAssign = async () => {
    if (!application) return;

    try {
      setLoading(true);
      setError(null);
      await updateVisaApplication(application.id, {
        assigned_to_id: selectedUser?.id || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign application');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSelectedUser(null);
      onClose();
    }
  };

  if (!application) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Application</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Assigning: <strong>{application.client_name}</strong> - {application.visa_type_name}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <UserAutocomplete
          value={selectedUser}
          onChange={setSelectedUser}
          label="Assign To"
          placeholder="Search by name, email, or username..."
          disabled={loading}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleAssign} variant="contained" disabled={loading || !selectedUser}>
          {loading ? 'Assigning...' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
