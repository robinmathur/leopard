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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  TablePagination,
  CircularProgress,
} from '@mui/material';
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
    fetchAgents();

    // Cancel any in-flight requests on unmount to prevent memory leaks
    return () => {
      cancelFetchAgents();
    };
  }, [fetchAgents]);

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
      fetchAgents({ page: 1, search: searchTerm.trim() || undefined });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchAgents]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    fetchAgents({ 
      page: newPage + 1, 
      search: searchTerm.trim() || undefined 
    });
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPageSize = parseInt(event.target.value, 10);
    fetchAgents({ 
      page: 1, 
      page_size: newPageSize,
      search: searchTerm.trim() || undefined 
    });
  };

  // --- Add Agent ---
  const handleAddAgent = () => {
    setDialogMode('add');
    setFieldErrors({});
  };

  // --- View Agent ---
  const handleView = (agent: Agent) => {
    navigate(`/agent/${agent.id}`, { state: { from: '/agent' } });
  };

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
          fetchAgents({ search: searchTerm.trim() || undefined });
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

      {/* Agents Table */}
      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Agent Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Country</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? 'No agents found matching your search' : 'No agents found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => (
                  <TableRow key={agent.id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                        onClick={() => handleView(agent)}
                      >
                        {agent.agent_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={agent.agent_type_display || AGENT_TYPE_LABELS[agent.agent_type]}
                        size="small"
                        color={agent.agent_type === 'SUPER_AGENT' ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{agent.email || '-'}</TableCell>
                    <TableCell>{agent.phone_number || '-'}</TableCell>
                    <TableCell>{agent.country || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!loading && agents.length > 0 && (
          <TablePagination
            component="div"
            count={pagination.count}
            page={pagination.page - 1}
            onPageChange={handlePageChange}
            rowsPerPage={pagination.pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
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
