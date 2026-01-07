/**
 * AgentPage
 * Main page for agent management - shows all agents with CRUD operations
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  InputAdornment,
  Link,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { Protect } from '@/components/protected/Protect';
import { usePermission } from '@/auth/hooks/usePermission';
import { AgentForm } from '@/components/agents/AgentForm';
import { useAgentStore } from '@/store/agentStore';
import type { Agent, AgentCreateRequest, AgentUpdateRequest } from '@/types/agent';
import type { ApiError } from '@/services/api/httpClient';
import { AGENT_TYPE_LABELS } from '@/types/agent';
import { formatVirtualId } from '@/utils/virtualId';

type DialogMode = 'add' | 'edit' | null;

export const AgentPage = () => {
  const { hasPermission } = usePermission();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Dialog states
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Pagination
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  // Agent store
  const {
    agents,
    loading,
    error,
    pagination,
    fetchAgents,
    addAgent,
    clearError,
    cancelFetchAgents,
  } = useAgentStore();

  // Fetch agents on mount and cleanup on unmount
  useEffect(() => {
    fetchAgents({ page: paginationModel.page + 1, page_size: paginationModel.pageSize });

    // Cancel any in-flight requests on unmount to prevent memory leaks
    return () => {
      cancelFetchAgents();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize]);

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

  // Search with debounce (skip when searchTerm is empty on mount)
  const prevSearchTerm = useRef(searchTerm);
  useEffect(() => {
    // Skip if searchTerm hasn't actually changed
    if (prevSearchTerm.current === searchTerm) {
      return;
    }
    prevSearchTerm.current = searchTerm;

    const timer = setTimeout(() => {
      setPaginationModel({ page: 0, pageSize: paginationModel.pageSize });
      fetchAgents({
        page: 1,
        page_size: paginationModel.pageSize,
        search: searchTerm.trim() || undefined
      });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => {
    setPaginationModel(newModel);
    fetchAgents({ 
      page: newModel.page + 1,
      page_size: newModel.pageSize,
      search: searchTerm.trim() || undefined 
    });
  };

  // --- Add Agent ---
  const handleAddAgent = () => {
    setDialogMode('add');
    setFieldErrors({});
  };

  // --- View Agent ---
  const handleView = (agentId: number) => {
    navigate(`/agent/${agentId}`, { state: { from: '/agent' } });
  };

  // DataGrid column definitions
  const columns: GridColDef<Agent>[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatVirtualId('agent', params.row.id)}
        </Typography>
      ),
    },
    {
      field: 'agent_name',
      headerName: 'Agent Name',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Link
          component="button"
          variant="body2"
          fontWeight={500}
          onClick={() => handleView(params.row.id)}
          sx={{
            textDecoration: 'none',
            color: 'primary.main',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: 'agent_type',
      headerName: 'Type',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Chip
          label={params.row.agent_type_display || AGENT_TYPE_LABELS[params.value]}
          size="small"
          color={params.value === 'SUPER_AGENT' ? 'primary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'company_name',
      headerName: 'Company',
      width: 200,
      sortable: false,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'designation',
      headerName: 'Designation',
      width: 180,
      sortable: false,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'country',
      headerName: 'Country',
      width: 120,
      sortable: false,
      renderCell: (params) => params.value || '-',
    },
  ];

  // --- Save Agent (Create only - edit is on detail page) ---
  const handleSaveAgent = async (data: AgentCreateRequest | AgentUpdateRequest) => {
    setFormLoading(true);
    setFieldErrors({});

    try {
      if (dialogMode === 'add') {
        const result = await addAgent(data as AgentCreateRequest);
        if (result) {
          setDialogMode(null);
          setSnackbar({
            open: true,
            message: `Agent "${result.agent_name}" added successfully`,
            severity: 'success',
          });
          // Refresh list
          fetchAgents({
            page: paginationModel.page + 1,
            page_size: paginationModel.pageSize,
            search: searchTerm.trim() || undefined
          });
        }
      }
    } catch (error) {
      const apiError = error as ApiError;
      
      // Handle field-specific errors
      if (apiError.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
      } else {
        setSnackbar({
          open: true,
          message: apiError.message || 'Failed to create agent',
          severity: 'error',
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseDialog = () => {
    if (!formLoading) {
      setDialogMode(null);
      setFieldErrors({});
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Show warning if user doesn't have permission
  if (!hasPermission('view_agent')) {
    return (
      <Box>
        <Alert severity="warning">
          You don't have permission to view this page. Contact your administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Agent Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage external agents and referral partners
          </Typography>
        </Box>
        <Protect permission="add_agent">
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={handleAddAgent}>
            Add Agent
          </Button>
        </Protect>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search agents by name, email, or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Paper>

      {/* Agents DataGrid */}
      <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <DataGrid
          rows={agents}
          columns={columns}
          loading={loading}
          rowCount={pagination.count}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={35}
          sx={{
            flex: 1,
            border: 'none',
            // 1. Header Styling: Light background and specific font weight
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'text.primary',
            },
            // 2. Cell Styling
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
            },
            // 3. Row Hover Effect
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
            // 4. Clean up focuses
            '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
              outline: 'none',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            // 5. Footer
            '& .MuiDataGrid-footerContainer': {
              borderTop: 'none',
            },
          }}
        />
      </Paper>

      {/* Add Agent Dialog */}
      <Dialog
        open={dialogMode === 'add'}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Agent
          <IconButton
            onClick={handleCloseDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <AgentForm
            mode="add"
            onSave={handleSaveAgent}
            onCancel={handleCloseDialog}
            loading={formLoading}
            fieldErrors={fieldErrors}
          />
        </DialogContent>
      </Dialog>

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

export default AgentPage;
