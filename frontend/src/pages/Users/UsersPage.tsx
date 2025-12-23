/**
 * UsersPage
 * Main page for user management - shows all users
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
import { UserTable } from '@/components/users/UserTable';
import { UserForm } from '@/components/users/UserForm';
import { PermissionAssignmentDialog } from '@/components/users/PermissionAssignmentDialog';
import { userApi } from '@/services/api/userApi';
import type { User, UserCreateRequest, UserUpdateRequest } from '@/types/user';
import type { ApiError } from '@/services/api/httpClient';

type DialogMode = 'add' | 'edit' | null;

export const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Fetch users
  const fetchUsers = useCallback(async (page = 0, pageSize = 25) => {
    setLoading(true);
    try {
      const response = await userApi.list({
        page: page + 1,
        page_size: pageSize,
      });
      setUsers(response.results);
      setPagination({
        count: response.count,
        page,
        pageSize,
      });
    } catch (error) {
      const apiError = error as ApiError;
      setSnackbar({
        open: true,
        message: apiError.message || 'Failed to fetch users',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePageChange = (page: number) => {
    fetchUsers(page, pagination.pageSize);
  };

  const handlePageSizeChange = (pageSize: number) => {
    fetchUsers(0, pageSize);
  };

  // --- Add User ---
  const handleAddUser = () => {
    setDialogMode('add');
    setSelectedUser(null);
    setFieldErrors({});
  };

  // --- Edit User ---
  const handleEdit = (user: User) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setFieldErrors({});
  };


  // --- Assign Permissions ---
  const handleAssignPermissions = (user: User) => {
    setSelectedUser(user);
    setPermissionDialogOpen(true);
  };

  const handleConfirmPermissionAssignment = async (permissionIds: number[]) => {
    if (!selectedUser) return;

    setFormLoading(true);
    try {
      await userApi.assignPermissions(selectedUser.id, { permission_ids: permissionIds });
      setPermissionDialogOpen(false);
      setSelectedUser(null);
      setSnackbar({
        open: true,
        message: `Permissions assigned to "${selectedUser.username}" successfully`,
        severity: 'success',
      });
      fetchUsers(pagination.page, pagination.pageSize);
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
    setSelectedUser(null);
  };

  // --- Form Dialog Actions ---
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedUser(null);
    setFieldErrors({});
  };

  const handleSaveUser = useCallback(
    async (data: UserCreateRequest | UserUpdateRequest) => {
      setFormLoading(true);
      setFieldErrors({});

      try {
        if (dialogMode === 'add') {
          const result = await userApi.create(data as UserCreateRequest);
          handleCloseDialog();
          setSnackbar({
            open: true,
            message: `User "${result.username}" added successfully`,
            severity: 'success',
          });
          fetchUsers(pagination.page, pagination.pageSize);
        } else if (dialogMode === 'edit' && selectedUser) {
          const result = await userApi.update(selectedUser.id, data as UserUpdateRequest);
          handleCloseDialog();
          setSnackbar({
            open: true,
            message: `User "${result.username}" updated successfully`,
            severity: 'success',
          });
          fetchUsers(pagination.page, pagination.pageSize);
        }
      } catch (err) {
        const apiError = err as ApiError;
        if (apiError.fieldErrors) {
          setFieldErrors(apiError.fieldErrors);
        } else {
          setSnackbar({
            open: true,
            message: apiError.message || 'Failed to save user',
            severity: 'error',
          });
        }
      } finally {
        setFormLoading(false);
      }
    },
    [dialogMode, selectedUser, fetchUsers, pagination]
  );

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage system users and their access
          </Typography>
        </Box>
        <Protect permission="add_user">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={handleAddUser}
          >
            Add User
          </Button>
        </Protect>
      </Box>

      <Paper sx={{ p: 2 }}>
        <UserTable
          users={users}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onEdit={handleEdit}
          onAssignPermissions={handleAssignPermissions}
        />
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {dialogMode === 'add' ? 'Add New User' : 'Edit User'}
          <IconButton
            onClick={handleCloseDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <UserForm
            mode={dialogMode || 'add'}
            initialData={selectedUser || undefined}
            onSave={handleSaveUser}
            onCancel={handleCloseDialog}
            loading={formLoading}
            fieldErrors={fieldErrors}
          />
        </DialogContent>
      </Dialog>

      {/* Permission Assignment Dialog */}
      <PermissionAssignmentDialog
        open={permissionDialogOpen}
        user={selectedUser}
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

export default UsersPage;

