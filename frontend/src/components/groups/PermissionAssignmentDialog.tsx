/**
 * PermissionAssignmentDialog Component
 * Dialog for assigning permissions to a group
 */
import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { permissionApi } from '@/services/api/permissionApi';
import { getContentTypeDisplayName } from '@/utils/contentType';
import type { Group, UserPermission } from '@/types/user';

interface PermissionAssignmentDialogProps {
  open: boolean;
  group: Group | null;
  onConfirm: (permissionIds: number[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const PermissionAssignmentDialog = ({
  open,
  group,
  onConfirm,
  onCancel,
  loading = false,
}: PermissionAssignmentDialogProps) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch permissions when dialog opens
  useEffect(() => {
    if (open && group) {
      fetchPermissions();
      // Pre-select existing permissions
      setSelectedPermissionIds(new Set((group.permissions_list || []).map((p) => p.id)));
    } else {
      setSelectedPermissionIds(new Set());
      setSearchTerm('');
    }
  }, [open, group]);

  const fetchPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const response = await permissionApi.list({ page_size: 1000 });
      setPermissions(response.results);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleTogglePermission = (permissionId: number) => {
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
    if (selectedPermissionIds.size === filteredPermissions.length) {
      setSelectedPermissionIds(new Set());
    } else {
      setSelectedPermissionIds(new Set(filteredPermissions.map((p) => p.id)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedPermissionIds));
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

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        Assign Permissions to {group?.name}
      </DialogTitle>
      <DialogContent dividers>
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
            <Typography variant="body2" color="text.secondary">
              {selectedPermissionIds.size} of {filteredPermissions.length} selected
            </Typography>
            <Button size="small" onClick={handleSelectAll}>
              {selectedPermissionIds.size === filteredPermissions.length ? 'Deselect All' : 'Select All'}
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
                  {perms.map((perm) => (
                    <ListItem key={perm.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleTogglePermission(perm.id)}
                        disabled={loading}
                        dense
                      >
                        <Checkbox
                          checked={selectedPermissionIds.has(perm.id)}
                          edge="start"
                          size="small"
                        />
                        <ListItemText
                          primary={perm.name}
                          primaryTypographyProps={{ fontSize: '0.8125rem' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
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
          {loading ? 'Assigning...' : 'Assign Permissions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

