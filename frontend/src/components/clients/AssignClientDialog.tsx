/**
 * AssignClientDialog Component
 * Dialog for assigning a client to a user
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Client } from '@/types/client';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import { User } from '@/types/user';
import { useState, useEffect } from 'react';

interface AssignClientDialogProps {
  open: boolean;
  client: Client | null;
  onConfirm: (userId: number | null) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const AssignClientDialog = ({
  open,
  client,
  onConfirm,
  onCancel,
  loading = false,
}: AssignClientDialogProps) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Reset selected user when dialog opens or client changes
  useEffect(() => {
    if (open && client) {
      // If client already has an assigned user, we could pre-select it here
      // For now, we'll start with null (unassign) or allow selection
      setSelectedUser(null);
    }
  }, [open, client]);

  const handleConfirm = () => {
    onConfirm(selectedUser?.id || null);
  };

  if (!client) return null;

  const clientName = [client.first_name, client.middle_name, client.last_name]
    .filter(Boolean)
    .join(' ');

  // Check if client currently has an assigned user
  const hasAssignedUser = !!(client.assigned_to && client.assigned_to_name);
  
  // Determine button state and text
  const isUnassigning = !selectedUser && hasAssignedUser;
  const isAssigning = selectedUser !== null;
  const canConfirm = isAssigning || isUnassigning; // Can only confirm if assigning or unassigning

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Assign Client</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Assign <strong>{clientName}</strong> to:
        </Typography>

        <Box sx={{ mb: 2 }}>
          <UserAutocomplete
            value={selectedUser}
            onChange={setSelectedUser}
            label="Select User"
            placeholder="Search for a user..."
            disabled={loading}
            size="medium"
          />
        </Box>

        {hasAssignedUser && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Currently assigned to: <strong>{client.assigned_to_name}</strong>
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
            ? `Client will be assigned to ${selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name}`.trim()}.`
            : hasAssignedUser
            ? 'Leave empty to unassign the client.'
            : 'Please select a user to assign.'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading}>
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

export default AssignClientDialog;

