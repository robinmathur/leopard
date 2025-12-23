/**
 * UserDetailPage
 * Basic user information page for viewing user details
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { Protect } from '@/components/protected/Protect';
import { userApi } from '@/services/api/userApi';
import type { User } from '@/types/user';
import type { ApiError } from '@/services/api/httpClient';

/**
 * Format date for display
 */
const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) {
        setError('User ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const userData = await userApi.getById(parseInt(id, 10));
        setUser(userData);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !user) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/user-management/users')}
          sx={{ mb: 2 }}
        >
          Back to Users
        </Button>
        <Alert severity="error">{error || 'User not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/user-management/users')}
          size="small"
        >
          Back to Users
        </Button>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            User Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View user details and information
          </Typography>
          </Box>
        </Box>
        <Protect permission="delete_user">
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            size="small"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete User
          </Button>
        </Protect>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Username
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {user.username}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Full Name
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {user.full_name}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Email
            </Typography>
            <Typography variant="body1">
              {user.email}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Status
            </Typography>
            <Chip
              label={user.is_active ? 'Active' : 'Inactive'}
              size="small"
              color={user.is_active ? 'success' : 'default'}
            />
          </Grid>

          {/* Group Information */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Group & Permissions
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Primary Group
            </Typography>
            {user.primary_group ? (
              <Chip label={user.primary_group} size="small" color="primary" />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No group assigned
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              All Groups
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {user.groups_list && user.groups_list.length > 0 ? (
                user.groups_list.map((group) => (
                  <Chip key={group} label={group} size="small" />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No groups assigned
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Organization Information */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Organization
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Tenant
            </Typography>
            <Typography variant="body1">
              {user.tenant_name || '-'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Branches
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {user.branches_data && user.branches_data.length > 0 ? (
                user.branches_data.map((branch) => (
                  <Chip key={branch.id} label={branch.name} size="small" />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No branches assigned
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Regions
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {user.regions_data && user.regions_data.length > 0 ? (
                user.regions_data.map((region) => (
                  <Chip key={region.id} label={region.name} size="small" />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No regions assigned
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Account Information */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Account Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Date Joined
            </Typography>
            <Typography variant="body1">
              {formatDate(user.date_joined)}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Last Login
            </Typography>
            <Typography variant="body1">
              {formatDate(user.last_login)}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Staff Status
            </Typography>
            <Chip
              label={user.is_staff ? 'Staff' : 'Regular User'}
              size="small"
              color={user.is_staff ? 'primary' : 'default'}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Superuser Status
            </Typography>
            <Chip
              label={user.is_superuser ? 'Superuser' : 'Regular User'}
              size="small"
              color={user.is_superuser ? 'warning' : 'default'}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{user?.username}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} size="small">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!user) return;
              setDeleting(true);
              try {
                await userApi.delete(user.id);
                setSnackbar({
                  open: true,
                  message: `User "${user.username}" deleted successfully`,
                  severity: 'success',
                });
                // Navigate to users page after a short delay
                setTimeout(() => {
                  navigate('/users');
                }, 1000);
              } catch (err) {
                const apiError = err as ApiError;
                setSnackbar({
                  open: true,
                  message: apiError.message || 'Failed to delete user',
                  severity: 'error',
                });
                setDeleting(false);
              }
            }}
            color="error"
            variant="contained"
            disabled={deleting}
            size="small"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserDetailPage;

