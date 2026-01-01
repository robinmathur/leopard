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
  Autocomplete,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { userApi, type User } from '@/services/api/userApi';
import { updateCollegeApplication } from '@/services/api/collegeApplicationApi';
import type { CollegeApplication } from '@/types/collegeApplication';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers();
      // Pre-select currently assigned user if any
      if (application?.assigned_to) {
        const currentUser = users.find(u => u.id === application.assigned_to);
        if (currentUser) {
          setSelectedUser(currentUser);
        }
      } else {
        setSelectedUser(null);
      }
    }
  }, [open, application]);

  const fetchUsers = async () => {
    try {
      setFetchingUsers(true);
      setError(null);
      const activeUsers = await userApi.getAllActiveUsers();
      setUsers(activeUsers);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleAssign = async () => {
    if (!application) return;

    try {
      setLoading(true);
      setError(null);
      await updateCollegeApplication(application.id, {
        assigned_to: selectedUser?.id || null,
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

        <Autocomplete
          options={users}
          getOptionLabel={(option) => option.full_name}
          value={selectedUser}
          onChange={(_, value) => setSelectedUser(value)}
          loading={fetchingUsers}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Assign To"
              placeholder="Select user..."
              required
            />
          )}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleAssign} variant="contained" disabled={loading || fetchingUsers}>
          {loading ? 'Assigning...' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
