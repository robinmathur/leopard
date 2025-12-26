/**
 * GroupsPage
 * Main page for group management - shows all groups
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Protect } from '@/components/protected/Protect';
import { GroupTable } from '@/components/groups/GroupTable';
import { GroupForm } from '@/components/groups/GroupForm';
import { DeleteConfirmDialog } from '@/components/groups/DeleteConfirmDialog';
import { PermissionAssignmentDialog } from '@/components/groups/PermissionAssignmentDialog';
import { groupApi } from '@/services/api/groupApi';
import type { Group, GroupCreateRequest, GroupUpdateRequest } from '@/types/user';
import type { ApiError } from '@/services/api/httpClient';

type DialogMode = 'add' | 'edit' | null;

export const GroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 0,
    pageSize: 25,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Dialog states
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Fetch groups
  const fetchGroups = useCallback(async (page = 0, pageSize = 25) => {
    setLoading(true);
    try {
      const response = await groupApi.list({
        page: page + 1,
        page_size: pageSize,
      });
      setGroups(response.results);
      setPagination({
        count: response.count,
        page,
        pageSize,
      });
    } catch (error) {
      const apiError = error as ApiError;
      setSnackbar({
        open: true,
        message: apiError.message || 'Failed to fetch groups',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handlePageChange = (page: number) => {
    fetchGroups(page, pagination.pageSize);
  };

  const handlePageSizeChange = (pageSize: number) => {
    fetchGroups(0, pageSize);
  };

  // --- Add Group ---
  const handleAddGroup = () => {
    setDialogMode('add');
    setSelectedGroup(null);
    setFieldErrors({});
  };

  // --- Edit Group ---
  const handleEdit = (group: Group) => {
    setDialogMode('edit');
    setSelectedGroup(group);
    setFieldErrors({});
  };

  // --- Delete Group ---
  const handleDelete = (group: Group) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedGroup) return;

    setFormLoading(true);
    try {
      await groupApi.delete(selectedGroup.id);
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      setSnackbar({
        open: true,
        message: `Group "${selectedGroup.name}" deleted successfully`,
        severity: 'success',
      });
      fetchGroups(pagination.page, pagination.pageSize);
    } catch (error) {
      const apiError = error as ApiError;
      setSnackbar({
        open: true,
        message: apiError.message || 'Failed to delete group',
        severity: 'error',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedGroup(null);
  };

  // --- Assign Permissions ---
  const handleAssignPermissions = (group: Group) => {
    setSelectedGroup(group);
    setPermissionDialogOpen(true);
  };

  const handleConfirmPermissionAssignment = async (permissionIds: number[]) => {
    if (!selectedGroup) return;

    setFormLoading(true);
    try {
      await groupApi.assignPermissions(selectedGroup.id, { permission_ids: permissionIds });
      setPermissionDialogOpen(false);
      setSelectedGroup(null);
      setSnackbar({
        open: true,
        message: `Permissions assigned to "${selectedGroup.name}" successfully`,
        severity: 'success',
      });
      fetchGroups(pagination.page, pagination.pageSize);
    } catch (error) {
      const apiError = error as ApiError;
      setSnackbar({
        open: true,
        message: apiError.message || 'Failed to assign permissions',
        severity: 'error',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelPermissionAssignment = () => {
    setPermissionDialogOpen(false);
    setSelectedGroup(null);
  };

  // --- Form Dialog Actions ---
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedGroup(null);
    setFieldErrors({});
  };

  const handleSaveGroup = useCallback(
    async (data: GroupCreateRequest | GroupUpdateRequest) => {
      setFormLoading(true);
      setFieldErrors({});

      try {
        if (dialogMode === 'add') {
          const result = await groupApi.create(data as GroupCreateRequest);
          handleCloseDialog();
          setSnackbar({
            open: true,
            message: `Group "${result.name}" added successfully`,
            severity: 'success',
          });
          fetchGroups(pagination.page, pagination.pageSize);
        } else if (dialogMode === 'edit' && selectedGroup) {
          const result = await groupApi.update(selectedGroup.id, data as GroupUpdateRequest);
          handleCloseDialog();
          setSnackbar({
            open: true,
            message: `Group "${result.name}" updated successfully`,
            severity: 'success',
          });
          fetchGroups(pagination.page, pagination.pageSize);
        }
      } catch (err) {
        const apiError = err as ApiError;
        if (apiError.fieldErrors) {
          setFieldErrors(apiError.fieldErrors);
        } else {
          setSnackbar({
            open: true,
            message: apiError.message || 'Failed to save group',
            severity: 'error',
          });
        }
      } finally {
        setFormLoading(false);
      }
    },
    [dialogMode, selectedGroup, fetchGroups, pagination]
  );

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Group Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage user groups and roles
          </Typography>
        </Box>
        <Protect permission="add_user">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={handleAddGroup}
          >
            Add Group
          </Button>
        </Protect>
      </Box>

      <Paper sx={{ p: 2 }}>
        <GroupTable
          groups={groups}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAssignPermissions={handleAssignPermissions}
        />
      </Paper>

      {/* Add/Edit Group Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {dialogMode === 'add' ? 'Add New Group' : 'Edit Group'}
          <IconButton
            onClick={handleCloseDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <GroupForm
            mode={dialogMode || 'add'}
            initialData={selectedGroup || undefined}
            onSave={handleSaveGroup}
            onCancel={handleCloseDialog}
            loading={formLoading}
            fieldErrors={fieldErrors}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        group={selectedGroup}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={formLoading}
      />

      {/* Permission Assignment Dialog */}
      <PermissionAssignmentDialog
        open={permissionDialogOpen}
        group={selectedGroup}
        onConfirm={handleConfirmPermissionAssignment}
        onCancel={handleCancelPermissionAssignment}
        loading={formLoading}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
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

export default GroupsPage;

