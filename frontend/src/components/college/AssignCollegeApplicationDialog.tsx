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
  Box,
  CircularProgress,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import type { User } from '@/types/user';
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
  const [loading, setLoading] = useState(false);

  // Reset selected user when dialog opens or application changes
  useEffect(() => {
    if (open && application) {
      setSelectedUser(null);
    }
  }, [open, application]);

  const handleConfirm = async () => {
    if (!application) return;

    try {
      setLoading(true);
      await updateCollegeApplication(application.id, {
        assigned_to_id: selectedUser?.id || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to assign college application:', err);
      // You might want to show an error message here
    } finally {
      setLoading(false);
    }
  };

  if (!application) return null;

  const applicationName = `${application.client_name} - ${application.institute_name}`;

  // Check if application currently has an assigned user
  const hasAssignedUser = !!(application.assigned_to && application.assigned_to_name);
  
  // Determine button state and text
  const isUnassigning = !selectedUser && hasAssignedUser;
  const isAssigning = selectedUser !== null;
  const canConfirm = isAssigning || isUnassigning; // Can only confirm if assigning or unassigning

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Assign College Application</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Assign <strong>{applicationName}</strong> to:
        </Typography>

        <Box sx={{ mb: 2 }}>
          <UserAutocomplete
            value={selectedUser}
            onChange={setSelectedUser}
            label="Select User"
            placeholder="Search for a user..."
            disabled={loading}
            size="small"
            excludeUserIds={application.assigned_to ? [application.assigned_to] : []}
          />
        </Box>

        {hasAssignedUser && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Currently assigned to: <strong>{application.assigned_to_name}</strong>
          </Typography>
        )}

        {!hasAssignedUser && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            No user currently assigned.
          </Typography>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 2 }}
        >
          {selectedUser
            ? `Application will be assigned to ${selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name}`.trim()}.`
            : hasAssignedUser
            ? 'Leave empty to unassign the application.'
            : 'Please select a user to assign.'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={loading || !canConfirm}
          startIcon={loading ? <CircularProgress size={16} /> : <PersonAddIcon />}
        >
          {loading 
            ? (isUnassigning ? 'Unassigning...' : 'Assigning...') 
            : isUnassigning 
            ? 'Unassign' 
            : isAssigning 
            ? 'Assign' 
            : 'Select User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
