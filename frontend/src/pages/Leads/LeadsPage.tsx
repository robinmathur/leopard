/**
 * LeadsPage
 * Page for managing clients by stage with tabbed navigation
 * Shows tabs: All, Lead, Follow Up, Client, Close
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Badge,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Protect } from '@/components/protected/Protect';
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientForm } from '@/components/clients/ClientForm';
import { MoveStageDialog } from '@/components/clients/MoveStageDialog';
import { AssignClientDialog } from '@/components/clients/AssignClientDialog';
import { useClientStore } from '@/store/clientStore';
import { Client, ClientCreateRequest, ClientUpdateRequest, ClientStage, STAGE_LABELS } from '@/types/client';
import { ApiError } from '@/services/api/httpClient';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

// Tab configuration with stage filters
const TABS: { label: string; stage?: ClientStage }[] = [
  // { label: 'All' },
  { label: 'Lead', stage: 'LEAD' },
  { label: 'Follow Up', stage: 'FOLLOW_UP' },
  { label: 'Client', stage: 'CLIENT' },
  { label: 'Close', stage: 'CLOSE' },
];

// Helper to get count for a tab
const getTabCount = (
  stage: ClientStage | undefined,
  stageCounts: { LEAD: number; FOLLOW_UP: number; CLIENT: number; CLOSE: number; TOTAL: number } | null
): number | undefined => {
  if (!stageCounts || !stage) return undefined;
  return stageCounts[stage];
};

type DialogMode = 'add' | null;

export const LeadsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Dialog states
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Client store
  const {
    clients,
    loading,
    error,
    pagination,
    stageCounts,
    stageCountsLoading,
    fetchClients,
    fetchStageCounts,
    addClient,
    updateClient,
    moveToStage,
    setPage,
    setPageSize,
    clearError,
    cancelFetchClients,
    cancelFetchStageCounts,
  } = useClientStore();

  // Fetch clients with current tab's stage filter
  const fetchWithStageFilter = useCallback((stage?: ClientStage) => {
    const params: { stage?: ClientStage } = {};
    if (stage) {
      params.stage = stage;
    }
    fetchClients(params);
  }, [fetchClients]);

  // Fetch clients on mount with default tab filter and cleanup on unmount
  useEffect(() => {
    fetchWithStageFilter(TABS[tabValue].stage);
    fetchStageCounts();

    // Cancel any in-flight requests on unmount to prevent memory leaks
    return () => {
      cancelFetchClients();
      cancelFetchStageCounts();
    };
  }, []);

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Reset to page 1 when switching tabs
    setPage(1);
    fetchWithStageFilter(TABS[newValue].stage);
  };

  const handlePageChange = (page: number) => {
    setPage(page);
    fetchWithStageFilter(TABS[tabValue].stage);
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPageSize(pageSize);
    fetchWithStageFilter(TABS[tabValue].stage);
  };

  // --- Add Client ---
  const handleAddClient = () => {
    setDialogMode('add');
    setSelectedClient(null);
    setFieldErrors({});
  };

  // --- Assign Client ---
  const handleAssign = (client: Client) => {
    setSelectedClient(client);
    setAssignDialogOpen(true);
  };

  const handleConfirmAssign = async (userId: number | null) => {
    if (!selectedClient) return;

    setFormLoading(true);
    const updateData: ClientUpdateRequest = {
      assigned_to_id: userId === null ? null : userId,
    };
    const result = await updateClient(selectedClient.id, updateData);
    setFormLoading(false);

    if (result) {
      setAssignDialogOpen(false);
      setSnackbar({
        open: true,
        message: userId
          ? `Client "${selectedClient.first_name}" assigned successfully`
          : `Client "${selectedClient.first_name}" unassigned successfully`,
        severity: 'success',
      });
      setSelectedClient(null);
      // Refresh current tab
      fetchWithStageFilter(TABS[tabValue].stage);
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to assign client',
        severity: 'error',
      });
    }
  };

  const handleCancelAssign = () => {
    setAssignDialogOpen(false);
    setSelectedClient(null);
  };

  // --- Move Client Stage ---
  const handleMove = (client: Client) => {
    setSelectedClient(client);
    setMoveDialogOpen(true);
  };

  const handleConfirmMove = async (targetStage: ClientStage) => {
    if (!selectedClient) return;

    setFormLoading(true);
    const result = await moveToStage(selectedClient.id, targetStage);
    setFormLoading(false);

    if (result) {
      setMoveDialogOpen(false);
      setSnackbar({
        open: true,
        message: `Client "${selectedClient.first_name}" moved to ${STAGE_LABELS[result.stage]}`,
        severity: 'success',
      });
      setSelectedClient(null);
      // Refresh current tab and stage counts
      fetchWithStageFilter(TABS[tabValue].stage);
      fetchStageCounts();
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
            // Refresh current tab and stage counts
            fetchWithStageFilter(TABS[tabValue].stage);
            fetchStageCounts();
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
    [dialogMode, addClient, tabValue, fetchWithStageFilter, fetchStageCounts]
  );

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Leads Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage clients through different stages
          </Typography>
        </Box>
        <Protect permission="add_client">
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

      <Paper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((tab, index) => {
            const count = getTabCount(tab.stage, stageCounts);
            return (
              <Tab
                key={index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.label}
                    {stageCountsLoading ? (
                      <CircularProgress size={14} />
                    ) : count !== undefined ? (
                      <Badge
                        badgeContent={count}
                        color="primary"
                        max={999}
                        sx={{
                          '& .MuiBadge-badge': {
                            position: 'relative',
                            transform: 'none',
                            fontSize: '0.75rem',
                            minWidth: '20px',
                            height: '20px',
                          },
                        }}
                      />
                    ) : null}
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        {TABS.map((_tab, index) => (
          <TabPanel key={index} value={tabValue} index={index}>
            <Box sx={{ p: 2 }}>
              <ClientTable
                clients={clients}
                loading={loading}
                pagination={pagination}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onMove={handleMove}
                onAssign={handleAssign}
              />
            </Box>
          </TabPanel>
        ))}
      </Paper>

      {/* Add Client Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Client
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

      {/* Assign Client Dialog */}
      <AssignClientDialog
        open={assignDialogOpen}
        client={selectedClient}
        onConfirm={handleConfirmAssign}
        onCancel={handleCancelAssign}
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

export default LeadsPage;
