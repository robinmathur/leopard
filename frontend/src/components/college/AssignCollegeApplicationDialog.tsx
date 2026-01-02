/**
 * AssignCollegeApplicationDialog - Dialog for assigning a college application to a user
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
import { updateCollegeApplication } from '@/services/api/collegeApplicationApi';
import type { CollegeApplication } from '@/types/collegeApplication';
import { userApi } from '@/services/api/userApi';

interface AssignCollegeApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  application: CollegeApplication | null;
  onSuccess: () => void;
}

export const AssignCollegeApplicationDialog: React.FC<AssignCollegeApplicationDialogProps> = ({
  open,
  onClose,
  application,
  onSuccess,
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load currently assigned user when dialog opens
  useEffect(() => {
    const loadAssignedUser = async () => {
      if (open && application?.assigned_to) {
        try {
          // Fetch the currently assigned user
          const users = await userApi.getAllActiveUsers();
          const assignedUser = users.find(u => u.id === application.assigned_to);
          if (assignedUser) {
            setSelectedUser(assignedUser);
          } else {
            setSelectedUser(null);
          }
        } catch (err) {
          console.error('Failed to load assigned user:', err);
          setSelectedUser(null);
        }
      } else if (open) {
        // No assigned user
        setSelectedUser(null);
      } else {
        // Dialog closed
        setSelectedUser(null);
      }
    };

    loadAssignedUser();
  }, [open, application]);

  const handleAssign = async () => {
    if (!application) return;

    try {
      setLoading(true);
      setError(null);
      await updateCollegeApplication(application.id, {
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
          Assigning: <strong>{application.client_name}</strong> - {application.institute_name}
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
