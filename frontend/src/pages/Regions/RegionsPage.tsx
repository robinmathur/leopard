/**
 * RegionsPage
 * Main page for region management - shows all regions
 * Supports add mode via /regions/add route
 * Features simple search functionality
 */
import { useEffect, useState, useRef } from 'react';
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
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Protect } from '@/components/protected/Protect';
import { RegionTable } from '@/components/regions/RegionTable';
import { RegionForm } from '@/components/regions/RegionForm';
import { useRegionStore } from '@/store/regionStore';
import { Region, RegionCreateRequest, RegionUpdateRequest } from '@/types/region';
import { ApiError } from '@/services/api/httpClient';

type DialogMode = 'add' | null;

export const RegionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Dialog states
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Region store
  const {
    regions,
    loading,
    error,
    pagination,
    fetchRegions,
    addRegion,
    clearError,
    cancelFetchRegions,
  } = useRegionStore();

  // Check if we're in add mode (from /regions/add route)
  const isAddMode = location.pathname === '/org-management/regions/add';

  // Track if initial fetch has been done to prevent double calls
  const initialFetchDone = useRef(false);

  // Fetch regions on mount only (not when filters change)
  useEffect(() => {
    fetchRegions();
    initialFetchDone.current = true;

    // Cancel any in-flight requests on unmount to prevent memory leaks
    return () => {
      cancelFetchRegions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Open add dialog if navigated to /regions/add
  useEffect(() => {
    if (isAddMode) {
      setDialogMode('add');
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

  // Search with debounce
  const prevSearchTerm = useRef(searchTerm);
  useEffect(() => {
    // Skip if searchTerm hasn't actually changed
    if (prevSearchTerm.current === searchTerm) {
      return;
    }
    prevSearchTerm.current = searchTerm;

    const timer = setTimeout(() => {
      fetchRegions({ page: 1, search: searchTerm.trim() || undefined });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchRegions]);

  const handlePageChange = (page: number) => {
    fetchRegions({ 
      page, 
      search: searchTerm.trim() || undefined 
    });
  };

  const handlePageSizeChange = (pageSize: number) => {
    fetchRegions({ 
      page: 1, 
      page_size: pageSize,
      search: searchTerm.trim() || undefined 
    });
  };

  // --- Add Region ---
  const handleAddRegion = () => {
    navigate('/org-management/regions/add');
  };

  // --- View Region ---
  const handleView = (region: Region) => {
    navigate(`/org-management/regions/${region.id}`, { state: { from: '/org-management/regions' } });
  };

  // --- Form Dialog Actions ---
  const handleCloseDialog = () => {
    setDialogMode(null);
    setFieldErrors({});
    // Navigate back to regions if we were in add mode
    if (isAddMode) {
      navigate('/org-management/regions');
    }
  };

  const handleSaveRegion = async (data: RegionCreateRequest | RegionUpdateRequest) => {
    setFormLoading(true);
    setFieldErrors({});

    try {
      if (dialogMode === 'add') {
        // In add mode, data should be RegionCreateRequest
        const result = await addRegion(data as RegionCreateRequest);
        if (result) {
          handleCloseDialog();
          setSnackbar({
            open: true,
            message: `Region "${result.name}" added successfully`,
            severity: 'success',
          });
          // Refresh list after adding
          fetchRegions({ search: searchTerm.trim() || undefined });
        }
      }
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
      } else {
        setSnackbar({
          open: true,
          message: apiError.message || 'Failed to save region',
          severity: 'error',
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Regions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage regions and their associated branches
          </Typography>
        </Box>
        <Protect permission="add_region">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={handleAddRegion}
          >
            Add Region
          </Button>
        </Protect>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search regions by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <RegionTable
          regions={regions}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onView={handleView}
        />
      </Paper>

      {/* Add Region Dialog */}
      <Dialog
        open={dialogMode === 'add'}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Region
          <IconButton
            onClick={handleCloseDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <RegionForm
            mode="add"
            onSave={handleSaveRegion}
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

export default RegionsPage;

