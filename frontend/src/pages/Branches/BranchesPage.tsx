/**
 * BranchesPage
 * Main page for branch management - shows all branches
 * Supports add mode via /branches/add route
 * Features simple search functionality
 */
import { useEffect, useState, useCallback, useRef } from 'react';
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
import { BranchTable } from '@/components/branches/BranchTable';
import { BranchForm } from '@/components/branches/BranchForm';
import { useBranchStore } from '@/store/branchStore';
import { Branch, BranchCreateRequest, BranchUpdateRequest } from '@/types/branch';
import { ApiError } from '@/services/api/httpClient';
import { regionApi } from '@/services/api/regionApi';

type DialogMode = 'add' | null;

export const BranchesPage = () => {
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

  // Branch store
  const {
    branches,
    loading,
    error,
    pagination,
    fetchBranches,
    addBranch,
    clearError,
    cancelFetchBranches,
  } = useBranchStore();

  // Regions for dropdown (fetched lazily when dialog opens)
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([]);
  const regionsFetched = useRef(false);

  // Check if we're in add mode (from /branches/add route)
  const isAddMode = location.pathname === '/org-management/branches/add';

  // Track if initial fetch has been done to prevent double calls
  const initialFetchDone = useRef(false);

  // Fetch branches on mount only (not when filters change)
  useEffect(() => {
    fetchBranches();
    initialFetchDone.current = true;

    // Cancel any in-flight requests on unmount to prevent memory leaks
    return () => {
      cancelFetchBranches();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Fetch regions for dropdown (called lazily when dialog opens)
  const fetchRegionsForDropdown = useCallback(async () => {
    if (regionsFetched.current) return;
    
    try {
      const response = await regionApi.list();
      setRegions(response.results.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })));
      regionsFetched.current = true;
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    }
  }, []);

  // Open add dialog if navigated to /branches/add
  useEffect(() => {
    if (isAddMode) {
      setDialogMode('add');
      setFieldErrors({});
      fetchRegionsForDropdown(); // Fetch regions when dialog opens
    }
  }, [isAddMode, fetchRegionsForDropdown]);

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
      fetchBranches({ page: 1, search: searchTerm.trim() || undefined });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchBranches]);

  const handlePageChange = (page: number) => {
    fetchBranches({ 
      page, 
      search: searchTerm.trim() || undefined 
    });
  };

  const handlePageSizeChange = (pageSize: number) => {
    fetchBranches({ 
      page: 1, 
      page_size: pageSize,
      search: searchTerm.trim() || undefined 
    });
  };

  // --- Add Branch ---
  const handleAddBranch = () => {
    navigate('/org-management/branches/add');
  };

  // --- View Branch ---
  const handleView = (branch: Branch) => {
    navigate(`/org-management/branches/${branch.id}`, { state: { from: '/org-management/branches' } });
  };

  // --- Form Dialog Actions ---
  const handleCloseDialog = useCallback(() => {
    setDialogMode(null);
    setFieldErrors({});
    // Navigate back to branches if we were in add mode
    if (location.pathname === '/org-management/branches/add') {
      navigate('/org-management/branches');
    }
  }, [navigate, location.pathname]);

  const handleSaveBranch = useCallback(
    async (data: BranchCreateRequest | BranchUpdateRequest) => {
      setFormLoading(true);
      setFieldErrors({});

      try {
        if (dialogMode === 'add') {
          // In add mode, data should be BranchCreateRequest
          const result = await addBranch(data as BranchCreateRequest);
          if (result) {
            setDialogMode(null);
            setFieldErrors({});
            if (location.pathname === '/org-management/branches/add') {
              navigate('/org-management/branches');
            }
            setSnackbar({
              open: true,
              message: `Branch "${result.name}" added successfully`,
              severity: 'success',
            });
            // Refresh list after adding
            fetchBranches({ search: searchTerm.trim() || undefined });
          }
        }
      } catch (err) {
        const apiError = err as ApiError;
        if (apiError.fieldErrors) {
          setFieldErrors(apiError.fieldErrors);
        } else {
          setSnackbar({
            open: true,
            message: apiError.message || 'Failed to save branch',
            severity: 'error',
          });
        }
      } finally {
        setFormLoading(false);
      }
    },
    [dialogMode, addBranch, fetchBranches, searchTerm, navigate, location.pathname]
  );

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Branches
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage branch offices with search and filtering
          </Typography>
        </Box>
        <Protect permission="add_branch">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={handleAddBranch}
          >
            Add Branch
          </Button>
        </Protect>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search branches by name, phone, website, suburb, or state..."
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

      <Paper sx={{ p: 2 }}>
        <BranchTable
          branches={branches}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onView={handleView}
        />
      </Paper>

      {/* Add Branch Dialog */}
      <Dialog
        open={dialogMode === 'add'}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Branch
          <IconButton
            onClick={handleCloseDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <BranchForm
            mode="add"
            onSave={handleSaveBranch}
            onCancel={handleCloseDialog}
            loading={formLoading}
            fieldErrors={fieldErrors}
            regions={regions}
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

export default BranchesPage;
