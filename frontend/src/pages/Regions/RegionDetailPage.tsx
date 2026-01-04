/**
 * RegionDetailPage
 * Full region detail view page with edit and delete functionality
 */
import { useEffect, useState } from 'react';
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
import { useRegionStore } from '@/store/regionStore';
import { RegionForm } from '@/components/regions/RegionForm';
import type { RegionCreateRequest, RegionUpdateRequest } from '@/types/region';
import type { ApiError } from '@/services/api/httpClient';
import { Protect } from '@/components/protected/Protect';
import { RegionOverview, RegionOverviewSkeleton } from '@/components/regions/RegionOverview';

export const RegionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string })?.from || '/org-management/regions';
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Region store
  const { 
    selectedRegion: region, 
    loading, 
    error, 
    fetchRegionById, 
    updateRegion, 
    deleteRegion, 
    clearError, 
    cancelFetchRegionById 
  } = useRegionStore();

  // Fetch region on mount
  useEffect(() => {
    if (id) {
      fetchRegionById(parseInt(id, 10));
    }
    return () => {
      cancelFetchRegionById();
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
  };

  const handleCloseEditDialog = () => {
    if (!formLoading) {
      setEditDialogOpen(false);
      setFieldErrors({});
    }
  };

  const handleSaveRegion = async (data: RegionCreateRequest | RegionUpdateRequest) => {
    if (!region) return;

    setFormLoading(true);
    setFieldErrors({});

    try {
      const result = await updateRegion(region.id, data as RegionUpdateRequest);
      if (result) {
        setEditDialogOpen(false);
        setSnackbar({
          open: true,
          message: `Region "${result.name}" updated successfully`,
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
          message: apiError.message || 'Failed to update region',
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
    if (!region) return;

    setFormLoading(true);
    const success = await deleteRegion(region.id);
    
    if (success) {
      setSnackbar({
        open: true,
        message: `Region "${region.name}" deleted successfully`,
        severity: 'success',
      });
      // Navigate back to regions list after a short delay to show success message
      setTimeout(() => {
        navigate(fromPath);
      }, 1500);
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to delete region',
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
  if (loading && !region) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }} size="small">
            Back to Regions
          </Button>
        </Box>
        <RegionOverviewSkeleton />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} size="small">
            Back to Regions
          </Button>
        </Box>
        <Alert severity="error">{error.message || 'Failed to load region'}</Alert>
      </Box>
    );
  }

  // Not found state
  if (!region) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} size="small">
            Back to Regions
          </Button>
        </Box>
        <Alert severity="warning">Region not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }} size="small">
            Back to Regions
          </Button>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h4" fontWeight={600}>
              {region.name}
            </Typography>
            {region.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {region.description}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Protect permission="change_region">
            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit} size="small">
              Edit Region
            </Button>
          </Protect>
          <Protect permission="delete_region">
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              size="small"
            >
              Delete Region
            </Button>
          </Protect>
        </Box>
      </Box>

      {/* Region Overview */}
      <RegionOverview region={region} loading={loading} />

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={formLoading ? undefined : handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Region
          <IconButton
            onClick={handleCloseEditDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <RegionForm
            mode="edit"
            initialData={region}
            onSave={handleSaveRegion}
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
        <DialogTitle>Delete Region?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete region &quot;{region.name}&quot;?
            {region.branch_count != null && region.branch_count > 0 && (
              <Box component="span" sx={{ display: 'block', mt: 1, color: 'error.main' }}>
                Warning: This region has {region.branch_count} branch(es) assigned. 
                You must reassign or delete these branches first.
              </Box>
            )}
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
            disabled={formLoading || (region.branch_count != null && region.branch_count > 0)}
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

export default RegionDetailPage;

