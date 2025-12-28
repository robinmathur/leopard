/**
 * BranchDetailPage
 * Full branch detail view page with edit and delete functionality
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
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
import { useBranchStore } from '@/store/branchStore';
import { BranchForm } from '@/components/branches/BranchForm';
import type { BranchCreateRequest, BranchUpdateRequest } from '@/types/branch';
import type { ApiError } from '@/services/api/httpClient';
import { Protect } from '@/components/protected/Protect';
import { BranchOverview, BranchOverviewSkeleton } from '@/components/branches/BranchOverview';
import { regionApi } from '@/services/api/regionApi';

export const BranchDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string })?.from || '/org-management/branches';
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Branch store
  const { 
    selectedBranch: branch, 
    loading, 
    error, 
    fetchBranchById, 
    updateBranch, 
    deleteBranch, 
    clearError, 
    cancelFetchBranchById 
  } = useBranchStore();

  // Regions for dropdown (fetched lazily when edit dialog opens)
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([]);
  const regionsFetched = useRef(false);

  // Fetch regions for dropdown (called lazily when edit dialog opens)
  const fetchRegionsForDropdown = useCallback(async () => {
    if (regionsFetched.current) return;
    
    try {
      const response = await regionApi.list();
      setRegions(response.results.map((r) => ({ id: r.id, name: r.name })));
      regionsFetched.current = true;
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    }
  }, []);

  // Fetch branch on mount
  useEffect(() => {
    if (id) {
      fetchBranchById(parseInt(id, 10));
    }
    return () => {
      cancelFetchBranchById();
      clearError();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBack = () => {
    navigate(fromPath);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
    setFieldErrors({});
    fetchRegionsForDropdown(); // Fetch regions when edit dialog opens
  };

  const handleCloseEditDialog = () => {
    if (!formLoading) {
      setEditDialogOpen(false);
      setFieldErrors({});
    }
  };

  const handleSaveBranch = async (data: BranchCreateRequest | BranchUpdateRequest) => {
    if (!branch) return;

    setFormLoading(true);
    setFieldErrors({});

    try {
      const result = await updateBranch(branch.id, data as BranchUpdateRequest);
      if (result) {
        setEditDialogOpen(false);
        setSnackbar({
          open: true,
          message: `Branch "${result.name}" updated successfully`,
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
          message: apiError.message || 'Failed to update branch',
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
    if (!branch) return;

    setFormLoading(true);
    const success = await deleteBranch(branch.id);
    
    if (success) {
      setSnackbar({
        open: true,
        message: `Branch "${branch.name}" deleted successfully`,
        severity: 'success',
      });
      // Navigate back to branches list after a short delay to show success message
      setTimeout(() => {
        navigate(fromPath);
      }, 1500);
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to delete branch',
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
  if (loading && !branch) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }} size="small">
            Back to Branches
          </Button>
        </Box>
        <BranchOverviewSkeleton />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} size="small">
            Back to Branches
          </Button>
        </Box>
        <Alert severity="error">{error.message || 'Failed to load branch'}</Alert>
      </Box>
    );
  }

  // Not found state
  if (!branch) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} size="small">
            Back to Branches
          </Button>
        </Box>
        <Alert severity="warning">Branch not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }} size="small">
            Back to Branches
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              {branch.name}
            </Typography>
            {branch.region_name && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {branch.region_name}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Protect permission="change_branch">
            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit} size="small">
              Edit Branch
            </Button>
          </Protect>
          <Protect permission="delete_branch">
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              size="small"
            >
              Delete Branch
            </Button>
          </Protect>
        </Box>
      </Box>

      {/* Branch Overview */}
      <BranchOverview branch={branch} loading={loading} />

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={formLoading ? undefined : handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Branch
          <IconButton
            onClick={handleCloseEditDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <BranchForm
            mode="edit"
            initialData={branch}
            onSave={handleSaveBranch}
            onCancel={handleCloseEditDialog}
            loading={formLoading}
            fieldErrors={fieldErrors}
            regions={regions}
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
        <DialogTitle>Delete Branch?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete branch &quot;{branch.name}&quot;? This action cannot be undone.
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

export default BranchDetailPage;

