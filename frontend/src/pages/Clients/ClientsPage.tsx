/**
 * ClientsPage
 * Main page for client management - shows all active clients
 * Supports add mode via /clients/add route
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientForm } from '@/components/clients/ClientForm';
import { DeleteConfirmDialog } from '@/components/clients/DeleteConfirmDialog';
import { MoveStageDialog } from '@/components/clients/MoveStageDialog';
import { useClientStore } from '@/store/clientStore';
import { Client, ClientCreateRequest, ClientUpdateRequest, STAGE_LABELS } from '@/types/client';
import { ApiError } from '@/services/api/httpClient';

type DialogMode = 'add' | 'edit' | null;

export const ClientsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Dialog states
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Client store
  const {
    clients,
    loading,
    error,
    pagination,
    fetchClients,
    addClient,
    updateClient,
    deleteClient,
    moveToNextStage,
    setPage,
    setPageSize,
    clearError,
    cancelFetchClients,
  } = useClientStore();

  // Check if we're in add mode (from /clients/add route)
  const isAddMode = location.pathname === '/clients/add';

  // Fetch active clients on mount and cleanup on unmount
  useEffect(() => {
    fetchClients();

    // Cancel any in-flight requests on unmount to prevent memory leaks
    return () => {
      cancelFetchClients();
    };
  }, [fetchClients]);

  // Open add dialog if navigated to /clients/add
  useEffect(() => {
    if (isAddMode) {
      setDialogMode('add');
      setSelectedClient(null);
      setFieldErrors({});
    }
  }, [isAddMode]);

  // Show error in snackbar
  useEffect(() => {
    if (error) {
      setSnackbar({
        open: true,
        message: error.message || 'An error occurred',
        severity: 'error',
      });
      clearError();
    }
  }, [error, clearError]);

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPageSize(pageSize);
  };

  // --- Add Client ---
  const handleAddClient = () => {
    navigate('/clients/add');
  };

  // --- Edit Client ---
  const handleEdit = (client: Client) => {
    setDialogMode('edit');
    setSelectedClient(client);
    setFieldErrors({});
  };

  // --- Delete Client ---
  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;

    setFormLoading(true);
    const success = await deleteClient(selectedClient.id);
    setFormLoading(false);

    if (success) {
      setDeleteDialogOpen(false);
      setSelectedClient(null);
      setSnackbar({
        open: true,
        message: `Client "${selectedClient.first_name}" deleted successfully`,
        severity: 'success',
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to delete client',
        severity: 'error',
      });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedClient(null);
  };

  // --- View Client ---
  const handleView = (client: Client) => {
    navigate(`/clients/${client.id}`);
  };

  // --- Move Client Stage ---
  const handleMove = (client: Client) => {
    setSelectedClient(client);
    setMoveDialogOpen(true);
  };

  const handleConfirmMove = async () => {
    if (!selectedClient) return;

    setFormLoading(true);
    const result = await moveToNextStage(selectedClient.id);
    setFormLoading(false);

    if (result) {
      setMoveDialogOpen(false);
      setSnackbar({
        open: true,
        message: `Client "${selectedClient.first_name}" moved to ${STAGE_LABELS[result.stage]}`,
        severity: 'success',
      });
      setSelectedClient(null);
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to move client stage',
        severity: 'error',
      });
    }
  };

  const handleCancelMove = () => {
    setMoveDialogOpen(false);
    setSelectedClient(null);
  };

  // --- Form Dialog Actions ---
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedClient(null);
    setFieldErrors({});
    // Navigate back to /clients if we were in add mode
    if (isAddMode) {
      navigate('/clients');
    }
  };

  const handleSaveClient = useCallback(
    async (data: ClientCreateRequest | ClientUpdateRequest) => {
      setFormLoading(true);
      setFieldErrors({});

      try {
        if (dialogMode === 'add') {
          const result = await addClient(data as ClientCreateRequest);
          if (result) {
            handleCloseDialog();
            setSnackbar({
              open: true,
              message: `Client "${result.first_name}" added successfully`,
              severity: 'success',
            });
            // Refresh list after adding
            fetchClients({ active: true });
          }
        } else if (dialogMode === 'edit' && selectedClient) {
          const result = await updateClient(selectedClient.id, data as ClientUpdateRequest);
          if (result) {
            handleCloseDialog();
            setSnackbar({
              open: true,
              message: `Client "${result.first_name}" updated successfully`,
              severity: 'success',
            });
          }
        }
      } catch (err) {
        const apiError = err as ApiError;
        if (apiError.fieldErrors) {
          setFieldErrors(apiError.fieldErrors);
        } else {
          setSnackbar({
            open: true,
            message: apiError.message || 'Failed to save client',
            severity: 'error',
          });
        }
      } finally {
        setFormLoading(false);
      }
    },
    [dialogMode, selectedClient, addClient, updateClient, fetchClients, isAddMode, navigate]
  );

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            All Clients
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your active client database
          </Typography>
        </Box>
        <Protect permission="create_client">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={handleAddClient}
          >
            Add Client
          </Button>
        </Protect>
      </Box>

      <Paper sx={{ p: 2 }}>
        <ClientTable
          clients={clients}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          onMove={handleMove}
        />
      </Paper>

      {/* Add/Edit Client Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {dialogMode === 'add' ? 'Add New Client' : 'Edit Client'}
          <IconButton
            onClick={handleCloseDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <ClientForm
            mode={dialogMode || 'add'}
            initialData={selectedClient || undefined}
            onSave={handleSaveClient}
            onCancel={handleCloseDialog}
            loading={formLoading}
            fieldErrors={fieldErrors}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        client={selectedClient}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={formLoading}
      />

      {/* Move Stage Dialog */}
      <MoveStageDialog
        open={moveDialogOpen}
        client={selectedClient}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
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

export default ClientsPage;

