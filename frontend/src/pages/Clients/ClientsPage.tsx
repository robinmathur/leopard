/**
 * ClientsPage
 * Main page for client management - shows all active clients
 * Supports add mode via /clients/add route
 * Features simple and advanced search functionality
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
  Grid,
  Collapse,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Search,
  ExpandMore,
  ExpandLess,
  FilterList,
  Clear,
} from '@mui/icons-material';
import { Protect } from '@/components/protected/Protect';
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientForm } from '@/components/clients/ClientForm';
import { DeleteConfirmDialog } from '@/components/clients/DeleteConfirmDialog';
import { MoveStageDialog } from '@/components/clients/MoveStageDialog';
import { AssignClientDialog } from '@/components/clients/AssignClientDialog';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import { useClientStore } from '@/store/clientStore';
import { Client, ClientCreateRequest, ClientUpdateRequest, ClientStage, STAGE_LABELS } from '@/types/client';
import { ApiError } from '@/services/api/httpClient';
import { User } from '@/services/api/userApi';
import { getVisaCategories } from '@/services/api/visaTypeApi';
import { VisaCategory } from '@/types/visaType';

type DialogMode = 'add' | 'edit' | null;

/**
 * Search Filters Interface
 */
interface SearchFilters {
  search: string;
  stage: ClientStage | '';
  active: boolean | '';
  visa_category: number | '';
  assigned_to_id: number | '';
}

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
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    search: '',
    stage: '',
    active: '',
    visa_category: '',
    assigned_to_id: '',
  });
  // Draft filters for advanced search (not applied until user clicks Apply)
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState<Omit<SearchFilters, 'search'>>({
    stage: '',
    active: '',
    visa_category: '',
    assigned_to_id: '',
  });
  // Track if advanced filters are actually applied (not just opened)
  const [advancedFiltersApplied, setAdvancedFiltersApplied] = useState(false);
  // Ref to prevent reload when just closing advanced search without changes
  const isRestoringFilters = useRef(false);

  // User selection state for advanced search
  const [assignedToUser, setAssignedToUser] = useState<User | null>(null);

  // Visa categories for advanced search
  const [visaCategories, setVisaCategories] = useState<VisaCategory[]>([]);

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
    moveToStage,
    clearError,
    cancelFetchClients,
  } = useClientStore();

  // Check if we're in add mode (from /clients/add route)
  const isAddMode = location.pathname === '/clients/add';

  // Fetch visa categories on mount
  useEffect(() => {
    const abortController = new AbortController();

    const fetchDropdownData = async () => {
      try {
        const categoriesResponse = await getVisaCategories(abortController.signal);
        if (!abortController.signal.aborted) {
          setVisaCategories(categoriesResponse);
        }
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        console.error('Failed to fetch visa categories:', err);
      }
    };

    fetchDropdownData();

    return () => {
      abortController.abort();
    };
  }, []);

  // Track if initial fetch has been done to prevent double calls
  const initialFetchDone = useRef(false);

  // Fetch active clients on mount only (not when filters change)
  useEffect(() => {
    fetchClients();
    initialFetchDone.current = true;

    // Cancel any in-flight requests on unmount to prevent memory leaks
    return () => {
      cancelFetchClients();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

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
    // Build params with search filters and new page
    const params: any = { page };

    // Add search filters
    if (searchFilters.search && searchFilters.search.length >= 2) {
      params.search = searchFilters.search;
    }
    if (searchFilters.stage) {
      params.stage = searchFilters.stage;
    }
    if (searchFilters.active !== '') {
      params.active = searchFilters.active;
    }
    if (searchFilters.visa_category) {
      params.visa_category = searchFilters.visa_category;
    }

    // Update page in store (this updates the state but we'll fetch with params)
    // We need to manually update the store's pagination state
    fetchClients(params);
  };

  const handlePageSizeChange = (pageSize: number) => {
    // Build params with search filters, new page size, and reset to page 1
    const params: any = { page: 1, page_size: pageSize };

    // Add search filters
    if (searchFilters.search && searchFilters.search.length >= 2) {
      params.search = searchFilters.search;
    }
    if (searchFilters.stage) {
      params.stage = searchFilters.stage;
    }
    if (searchFilters.active !== '') {
      params.active = searchFilters.active;
    }
    if (searchFilters.visa_category) {
      params.visa_category = searchFilters.visa_category;
    }

    fetchClients(params);
  };

  // Search handlers
  const handleSimpleSearchChange = (value: string) => {
    setSearchFilters((prev) => ({ ...prev, search: value }));
    // Only reset page if we have a valid search (2+ characters) or clearing search
    // Don't reset page for 1 character (prevents unnecessary API call)
    if (value === '' || value.length >= 2) {
      // Page will be reset in the debounce effect when search is valid
      // For now, just update the search filter state
    }
  };

  const handleAdvancedFilterChange = (field: keyof Omit<SearchFilters, 'search'>, value: any) => {
    // Convert string to number for ID fields
    let processedValue = value;
    if (field === 'visa_category' || field === 'assigned_to_id') {
      processedValue = value === '' ? '' : Number(value);
    }
    // Update draft filters only (not active filters) - no automatic search
    setDraftAdvancedFilters((prev) => ({ ...prev, [field]: processedValue }));
  };

  const handleApplyAdvancedSearch = () => {
    // Build params with draft filters
    const params: any = { page: 1 };
    
    // Add search filter if it exists and is 2+ characters
    if (searchFilters.search && searchFilters.search.length >= 2) {
      params.search = searchFilters.search;
    }
    
    // Add advanced filters from draft
    if (draftAdvancedFilters.stage) {
      params.stage = draftAdvancedFilters.stage;
    }
    if (draftAdvancedFilters.active !== '') {
      params.active = draftAdvancedFilters.active;
    }
    if (draftAdvancedFilters.visa_category) {
      params.visa_category = draftAdvancedFilters.visa_category;
    }
    
    // Apply draft filters to active filters
    setSearchFilters((prev) => ({
      ...prev,
      ...draftAdvancedFilters,
    }));
    setAdvancedFiltersApplied(true);
    
    // Fetch with new filters
    fetchClients(params);
  };

  const handleClearSearch = () => {
    setSearchFilters({
      search: '',
      stage: '',
      active: '',
      visa_category: '',
      assigned_to_id: '',
    });
    setDraftAdvancedFilters({
      stage: '',
      active: '',
      visa_category: '',
      assigned_to_id: '',
    });
    setAssignedToUser(null);
    setAdvancedFiltersApplied(false);
    // Fetch with cleared filters and page reset to 1
    fetchClients({ page: 1 });
  };

  const toggleAdvancedSearch = () => {
    const newShowState = !showAdvancedSearch;

    if (newShowState) {
      // Opening advanced search - initialize draft filters with current active filters
      setDraftAdvancedFilters({
        stage: searchFilters.stage,
        active: searchFilters.active,
        visa_category: searchFilters.visa_category,
        assigned_to_id: searchFilters.assigned_to_id,
      });
      setShowAdvancedSearch(true);
    } else {
      // Closing advanced search
      setShowAdvancedSearch(false);
      
      if (advancedFiltersApplied) {
        // User had applied advanced filters, so clear them and reload
        // Build params with only search filter (if exists) and cleared advanced filters
        const params: any = { page: 1 };
        if (searchFilters.search && searchFilters.search.length >= 2) {
          params.search = searchFilters.search;
        }
        // Advanced filters are cleared (not included in params)
        
        setSearchFilters((prev) => ({
          ...prev,
          stage: '',
          active: '',
          visa_category: '',
          assigned_to_id: '',
        }));
        setDraftAdvancedFilters({
          stage: '',
          active: '',
          visa_category: '',
          assigned_to_id: '',
        });
        setAssignedToUser(null);
        setAdvancedFiltersApplied(false);
        
        // Fetch with cleared advanced filters
        fetchClients(params);
      }
      // If no filters were applied, just close - no changes needed
    }
  };

  // Debounced search effect - only trigger on search changes
  useEffect(() => {
    // Skip initial mount (handled by separate effect)
    if (!initialFetchDone.current) {
      return;
    }

    // Skip if we're just restoring filters (no actual change)
    if (isRestoringFilters.current) {
      isRestoringFilters.current = false;
      return;
    }

    // Explicitly skip if search is exactly 1 character - don't search at all
    if (searchFilters.search.length === 1) {
      return;
    }

    // Only search if search is empty or has 2+ characters
    if (searchFilters.search === '') {
      // Clear search - fetch immediately without debounce
      const params: any = { page: 1 };
      if (searchFilters.stage) params.stage = searchFilters.stage;
      if (searchFilters.active !== '') params.active = searchFilters.active;
      if (searchFilters.visa_category) params.visa_category = searchFilters.visa_category;
      fetchClients(params);
    } else if (searchFilters.search.length >= 2) {
      // Valid search - debounce
      const debounceTimer = setTimeout(() => {
        const params: any = { page: 1 };
        params.search = searchFilters.search;
        if (searchFilters.stage) params.stage = searchFilters.stage;
        if (searchFilters.active !== '') params.active = searchFilters.active;
        if (searchFilters.visa_category) params.visa_category = searchFilters.visa_category;
        fetchClients(params);
      }, 500); // 500ms debounce

      return () => {
        clearTimeout(debounceTimer);
      };
    }
  }, [searchFilters.search, searchFilters.stage, searchFilters.active, searchFilters.visa_category, fetchClients]);

  // Reset advanced filters applied flag when filters are cleared manually
  useEffect(() => {
    const hasAdvancedFilters =
      searchFilters.stage !== '' ||
      searchFilters.active !== '' ||
      searchFilters.visa_category !== '' ||
      searchFilters.assigned_to_id !== '';

    if (!hasAdvancedFilters) {
      setAdvancedFiltersApplied(false);
    }
  }, [searchFilters.stage, searchFilters.active, searchFilters.visa_category, searchFilters.assigned_to_id]);

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

  // --- Assign Client ---
  const handleAssign = (client: Client) => {
    setSelectedClient(client);
    setAssignDialogOpen(true);
  };

  const handleConfirmAssign = async (userId: number | null) => {
    if (!selectedClient) return;

    setFormLoading(true);
    // Explicitly send null to unassign, or the userId to assign
    // Use type assertion to ensure null is included in the payload
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
      // Refresh the client list
      fetchClients();
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
      // Refresh the client list
      fetchClients();
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
            Manage your active client database with advanced search and filtering
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

      {/* Search Section */}
      <Paper sx={{ p: 2, mb: 2 }}>
        {/* Simple Search */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            placeholder="Search by name or email (min 2 characters)..."
            value={searchFilters.search}
            onChange={(e) => handleSimpleSearchChange(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            endIcon={showAdvancedSearch ? <ExpandLess /> : <ExpandMore />}
            onClick={toggleAdvancedSearch}
            sx={{ minWidth: 180 }}
            size="small"
          >
            Advanced Search
          </Button>
          <IconButton
            onClick={handleClearSearch}
            size="small"
            color="default"
            title="Clear all filters"
          >
            <Clear />
          </IconButton>
        </Box>
        {/* Helper text shown below the search row */}
        {searchFilters.search.length > 0 && searchFilters.search.length < 2 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Type at least 2 characters to search
          </Typography>
        )}

        {/* Advanced Search */}
        <Collapse in={showAdvancedSearch} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
              Advanced Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  label="Stage"
                  value={draftAdvancedFilters.stage}
                  onChange={(e) => handleAdvancedFilterChange('stage', e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">All Stages</MenuItem>
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  label="Active Status"
                  value={draftAdvancedFilters.active === '' ? '' : String(draftAdvancedFilters.active)}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleAdvancedFilterChange('active', value === '' ? '' : value === 'true');
                  }}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  label="Visa Category"
                  value={draftAdvancedFilters.visa_category === '' ? '' : draftAdvancedFilters.visa_category}
                  onChange={(e) => handleAdvancedFilterChange('visa_category', e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">All Visa Categories</MenuItem>
                  {visaCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name} {category.code ? `(${category.code})` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <UserAutocomplete
                  value={assignedToUser}
                  onChange={(user) => {
                    setAssignedToUser(user);
                    handleAdvancedFilterChange('assigned_to_id', user?.id || '');
                  }}
                  label="Assigned To"
                  placeholder="Search user..."
                  size="small"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleClearSearch}
                startIcon={<Clear />}
              >
                Clear Filters
              </Button>
              <Button
                variant="contained"
                onClick={handleApplyAdvancedSearch}
                startIcon={<Search />}
              >
                Apply Filters
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <ClientTable
          clients={clients}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMove={handleMove}
          onAssign={handleAssign}
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

      {/* Assign Client Dialog */}
      <AssignClientDialog
        open={assignDialogOpen}
        client={selectedClient}
        onConfirm={handleConfirmAssign}
        onCancel={handleCancelAssign}
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

