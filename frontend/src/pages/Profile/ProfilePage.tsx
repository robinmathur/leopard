/**
 * ProfilePage
 * User profile page for viewing current user's own profile
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Grid,
  Avatar,
} from '@mui/material';
import { useAuthStore } from '@/store/authStore';
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

export const ProfilePage = () => {
  const { user: currentUser } = useAuthStore();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser?.id) {
        setError('User not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Fetch user profile using the current user's ID
        const userData = await userApi.getById(parseInt(currentUser.id, 10));
        setUser(userData);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser?.id]);

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
        <Alert severity="error">{error || 'Profile not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: 'primary.main',
            fontSize: '1.5rem',
          }}
        >
          {user.first_name?.charAt(0) || user.username.charAt(0)}
          {user.last_name?.charAt(0) || ''}
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            {user.full_name || user.username}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            {(user.primary_group_display || user.primary_group) && (
              <Chip
                label={user.primary_group_display || user.primary_group}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={user.is_active ? 'Active' : 'Inactive'}
              size="small"
              color={user.is_active ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Username
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {user.username}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Full Name
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {user.full_name}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Email
            </Typography>
            <Typography variant="body1">
              {user.email}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
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
          <Grid sx={{ mt: 2 }} size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Group & Permissions
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Primary Group
            </Typography>
            {user.primary_group_display || user.primary_group ? (
              <Chip label={user.primary_group_display || user.primary_group} size="small" color="primary" />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No group assigned
              </Typography>
            )}
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              All Groups
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {user.groups_list && user.groups_list.length > 0 ? (
                user.groups_list.map((group, index) => (
                  <Chip 
                    key={group} 
                    label={user.groups_list_display?.[index] || group} 
                    size="small" 
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No groups assigned
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Organization Information */}
          <Grid sx={{ mt: 2 }} size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Organization
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {user.tenant_name && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Tenant
              </Typography>
              <Typography variant="body1">
                {user.tenant_name}
              </Typography>
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6 }}>
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

          <Grid size={{ xs: 12, sm: 6 }}>
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
          <Grid sx={{ mt: 2 }} size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Account Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Date Joined
            </Typography>
            <Typography variant="body1">
              {formatDate(user.date_joined)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Last Login
            </Typography>
            <Typography variant="body1">
              {formatDate(user.last_login)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ProfilePage;

