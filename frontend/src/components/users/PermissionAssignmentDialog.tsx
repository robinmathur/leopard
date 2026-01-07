/**
 * PermissionAssignmentDialog Component
 * Dialog for assigning permissions to a user
 * 
 * Group permissions are shown as selected but disabled (read-only)
 * User can only add/remove direct permissions
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Box,
  Checkbox,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Paper,
  Divider,
  Chip,
  Alert,
  Tooltip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { permissionApi } from '@/services/api/permissionApi';
import { groupApi } from '@/services/api/groupApi';
import { getContentTypeDisplayName } from '@/utils/contentType';
import type { User, UserPermission, Group } from '@/types/user';

interface PermissionAssignmentDialogProps {
  open: boolean;
  user: User | null;
  onConfirm: (permissionIds: number[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const PermissionAssignmentDialog = ({
  open,
  user,
  onConfirm,
  onCancel,
  loading = false,
}: PermissionAssignmentDialogProps) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set());
  const [groupPermissionIds, setGroupPermissionIds] = useState<Set<number>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all permissions and user's group permissions when dialog opens
  useEffect(() => {
    if (open && user) {
      fetchPermissionsAndGroupData();
    } else {
      setSelectedPermissionIds(new Set());
      setGroupPermissionIds(new Set());
      setSearchTerm('');
    }
  }, [open, user]);

  const fetchPermissionsAndGroupData = async () => {
    if (!user) return;
    
    setLoadingPermissions(true);
    try {
      // Fetch all available permissions
      const permResponse = await permissionApi.list({ page_size: 1000 });
      setPermissions(permResponse.results);

      // Fetch user's group(s) to get their permissions
      const groupPermIds = new Set<number>();
      
      if (user.groups_list && user.groups_list.length > 0) {
        // Fetch all groups to get their permissions
        const groupsResponse = await groupApi.list({ page_size: 100 });
        const userGroups = groupsResponse.results.filter(
          (g: Group) => user.groups_list.includes(g.name)
        );
        
        // Collect all permission IDs from user's groups
        userGroups.forEach((group: Group) => {
          if (group.permissions_list) {
            group.permissions_list.forEach((perm) => {
              groupPermIds.add(perm.id);
            });
          }
        });
      }
      
      setGroupPermissionIds(groupPermIds);
      
      // Pre-select both group permissions and user's direct permissions
      const userDirectPermIds = user.user_permissions_list?.map((p) => p.id) || [];
      setSelectedPermissionIds(new Set([...groupPermIds, ...userDirectPermIds]));
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleTogglePermission = (permissionId: number) => {
    // Don't allow toggling group permissions
    if (groupPermissionIds.has(permissionId)) {
      return;
    }
    
    setSelectedPermissionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    // Get IDs of non-group permissions only
    const nonGroupPermIds = filteredPermissions
      .filter((p) => !groupPermissionIds.has(p.id))
      .map((p) => p.id);
    
    // Check if all non-group permissions are selected
    const allNonGroupSelected = nonGroupPermIds.every((id) => selectedPermissionIds.has(id));
    
    if (allNonGroupSelected) {
      // Deselect all non-group permissions
      setSelectedPermissionIds(new Set(groupPermissionIds));
    } else {
      // Select all (group permissions + all non-group permissions)
      setSelectedPermissionIds(new Set([
        ...groupPermissionIds,
        ...nonGroupPermIds,
      ]));
    }
  };

  const handleConfirm = () => {
    // Only send user-specific permissions (exclude group permissions)
    const userPermissionIds = Array.from(selectedPermissionIds).filter(
      (id) => !groupPermissionIds.has(id)
    );
    onConfirm(userPermissionIds);
  };

  // Filter permissions by search term
  const filteredPermissions = permissions.filter((perm) => {
    const contentType = perm.content_type_display || perm.content_type || '';
    const searchLower = searchTerm.toLowerCase();
    return (
      perm.name.toLowerCase().includes(searchLower) ||
      (perm.codename && perm.codename.toLowerCase().includes(searchLower)) ||
      contentType.toLowerCase().includes(searchLower)
    );
  });

  // Group permissions by content type (use content_type_display if available, otherwise content_type)
  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    const key = perm.content_type_display || perm.content_type || String(perm.id);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(perm);
    return acc;
  }, {} as Record<string, UserPermission[]>);

  // Calculate counts
  const userPermissionCount = useMemo(() => {
    return Array.from(selectedPermissionIds).filter(
      (id) => !groupPermissionIds.has(id)
    ).length;
  }, [selectedPermissionIds, groupPermissionIds]);

  const nonGroupFilteredCount = filteredPermissions.filter(
    (p) => !groupPermissionIds.has(p.id)
  ).length;

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        Assign Permissions to {user?.username}
      </DialogTitle>
      <DialogContent dividers>
        {groupPermissionIds.size > 0 && (
          <Alert severity="info" sx={{ mb: 2 }} icon={<LockIcon fontSize="small" />}>
            <Typography variant="body2">
              Permissions from assigned group(s) are shown as selected and locked.
              You can only add or remove additional user-specific permissions.
            </Typography>
          </Alert>
        )}
        
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {userPermissionCount} user-specific permissions
              </Typography>
              {groupPermissionIds.size > 0 && (
                <Chip 
                  label={`${groupPermissionIds.size} from Group`}
                  size="small" 
                  variant="outlined"
                  icon={<LockIcon sx={{ fontSize: '0.875rem' }} />}
                />
              )}
            </Box>
            <Button size="small" onClick={handleSelectAll} disabled={nonGroupFilteredCount === 0}>
              {nonGroupFilteredCount > 0 && 
               filteredPermissions
                 .filter((p) => !groupPermissionIds.has(p.id))
                 .every((p) => selectedPermissionIds.has(p.id))
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </Box>
        </Box>

        {loadingPermissions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
            {Object.entries(groupedPermissions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([contentType, perms]) => (
              <Box key={contentType}>
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {getContentTypeDisplayName(contentType)}
                  </Typography>
                </Box>
                <List dense>
                  {perms.map((perm) => {
                    const isGroupPermission = groupPermissionIds.has(perm.id);
                    const isSelected = selectedPermissionIds.has(perm.id);
                    
                    return (
                      <ListItem key={perm.id} disablePadding>
                        <Tooltip
                          title={isGroupPermission ? "This permission comes from the user's assigned group and cannot be removed" : ""}
                          placement="left"
                        >
                          <ListItemButton
                            onClick={() => handleTogglePermission(perm.id)}
                            disabled={loading || isGroupPermission}
                            dense
                            sx={{
                              bgcolor: isGroupPermission ? 'action.hover' : 'transparent',
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              edge="start"
                              size="small"
                              disabled={isGroupPermission}
                            />
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <span>{perm.name}</span>
                                  {isGroupPermission && (
                                    <LockIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                                  )}
                                </Box>
                              }
                              primaryTypographyProps={{ fontSize: '0.8125rem' }}
                            />
                          </ListItemButton>
                        </Tooltip>
                      </ListItem>
                    );
                  })}
                </List>
                <Divider />
              </Box>
            ))}
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading} size="small">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading}
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Assigning...' : 'Save Permissions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
