/**
 * AgentDetailPage
 * Full agent detail view page with edit and delete functionality
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useAgentStore } from '@/store/agentStore';
import { AgentForm } from '@/components/agents/AgentForm';
import type { AgentCreateRequest, AgentUpdateRequest } from '@/types/agent';
import type { ApiError } from '@/services/api/httpClient';
import { Protect } from '@/components/protected/Protect';
import { AgentOverview, AgentOverviewSkeleton } from '@/components/agents/AgentOverview';
import { AGENT_TYPE_LABELS } from '@/types/agent';

export const AgentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string })?.from || '/agent';
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Agent store
  const { selectedAgent: agent, loading, error, fetchAgentById, updateAgent, deleteAgent, clearError, cancelFetchAgentById } = useAgentStore();

  // Fetch agent on mount
  useEffect(() => {
    if (id) {
      fetchAgentById(parseInt(id, 10));
    }
    return () => {
      cancelFetchAgentById();
      clearError();
    };
  }, [id, fetchAgentById]);

  const handleBack = () => {
    navigate(fromPath);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
    setFieldErrors({});
  };

  const handleCloseEditDialog = () => {
    if (!formLoading) {
      setEditDialogOpen(false);
      setFieldErrors({});
    }
  };

  const handleSaveAgent = async (data: AgentCreateRequest | AgentUpdateRequest) => {
    if (!agent) return;

    setFormLoading(true);
    setFieldErrors({});

    try {
      const result = await updateAgent(agent.id, data as AgentUpdateRequest);
      if (result) {
        setEditDialogOpen(false);
        setSnackbar({
          open: true,
          message: `Agent "${result.agent_name}" updated successfully`,
          severity: 'success',
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      
      // Handle field-specific errors
      if (apiError.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
      } else {
        setSnackbar({
          open: true,
          message: apiError.message || 'Failed to update agent',
          severity: 'error',
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!agent) return;

    setFormLoading(true);
    const success = await deleteAgent(agent.id);
    
    if (success) {
      setSnackbar({
        open: true,
        message: `Agent "${agent.agent_name}" deleted successfully`,
        severity: 'success',
      });
      // Navigate back to agents list after a short delay to show success message
      setTimeout(() => {
        navigate(fromPath);
      }, 1500);
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to delete agent',
        severity: 'error',
      });
      setDeleteDialogOpen(false);
      setFormLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Loading state
  if (loading && !agent) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }} size="small">
            Back to Agents
          </Button>
        </Box>
        <AgentOverviewSkeleton />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} size="small">
            Back to Agents
          </Button>
        </Box>
        <Alert severity="error">{error.message || 'Failed to load agent'}</Alert>
      </Box>
    );
  }

  // Not found state
  if (!agent) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} size="small">
            Back to Agents
          </Button>
        </Box>
        <Alert severity="warning">Agent not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }} size="small">
            Back to Agents
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              {agent.agent_name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                label={agent.agent_type_display || AGENT_TYPE_LABELS[agent.agent_type]}
                size="small"
                color={agent.agent_type === 'SUPER_AGENT' ? 'primary' : 'default'}
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Protect permission="change_agent">
            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit} size="small">
              Edit Agent
            </Button>
          </Protect>
          <Protect permission="delete_agent">
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              size="small"
            >
              Delete Agent
            </Button>
          </Protect>
        </Box>
      </Box>

      {/* Agent Overview */}
      <AgentOverview agent={agent} loading={loading} />

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={formLoading ? undefined : handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Agent
          <IconButton
            onClick={handleCloseEditDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <AgentForm
            mode="edit"
            initialData={agent}
            onSave={handleSaveAgent}
            onCancel={handleCloseEditDialog}
            loading={formLoading}
            fieldErrors={fieldErrors}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={formLoading ? undefined : handleCancelDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Agent?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete agent &quot;{agent.agent_name}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={formLoading} size="small">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={formLoading}
            size="small"
            startIcon={formLoading ? <CircularProgress size={16} /> : null}
          >
            {formLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
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

export default AgentDetailPage;
