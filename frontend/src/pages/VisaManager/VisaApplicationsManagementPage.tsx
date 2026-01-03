/**
 * VisaApplicationsManagementPage
 * Comprehensive page for managing visa applications with CRUD operations
 * Features simple and advanced search functionality
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  Grid,
  Collapse,
  MenuItem,
  Alert,
  Snackbar,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  Link,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
} from '@mui/x-data-grid';
import {
  Visibility,
  Search,
  ExpandMore,
  ExpandLess,
  FilterList,
  Clear,
  PersonAdd as PersonAddIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  listVisaApplications,
  createVisaApplication,
  updateVisaApplication,
  deleteVisaApplication,
  VisaApplication,
  VisaApplicationStatus,
} from '@/services/api/visaApplicationApi';
import { getVisaTypes } from '@/services/api/visaTypeApi';
import { User } from '@/services/api/userApi';
import { VISA_STATUS_LABELS, VisaType } from '@/types/visaType';
import { VisaApplicationForm } from '@/components/visa/VisaApplicationForm';
import { VisaApplicationDeleteDialog } from '@/components/visa/VisaApplicationDeleteDialog';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import { AssignVisaApplicationDialog } from '@/components/visa/AssignVisaApplicationDialog';
import { ChangeVisaStatusDialog } from '@/components/visa/ChangeVisaStatusDialog';
import { useAuthStore } from '@/store/authStore';

/**
 * Search Filters Interface
 */
interface SearchFilters {
  client_name: string;
  status: VisaApplicationStatus | '';
  visa_type_id: number | '';
  assigned_to_id: number | '';
  created_by_id: number | '';
  date_applied_from: string;
  date_applied_to: string;
}

/**
 * Main VisaApplicationsManagementPage Component
 */
export const VisaApplicationsManagementPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  // Data state
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // User selection state for advanced search
  const [assignedToUser, setAssignedToUser] = useState<User | null>(null);
  const [createdByUser, setCreatedByUser] = useState<User | null>(null);

  // Dialog state
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<VisaApplication | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedApplicationForAssign, setSelectedApplicationForAssign] = useState<VisaApplication | null>(null);

  // Status change dialog state
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [selectedApplicationForStatus, setSelectedApplicationForStatus] = useState<VisaApplication | null>(null);

  // Pagination
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [totalCount, setTotalCount] = useState(0);

  // Search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    client_name: '',
    status: '',
    visa_type_id: '',
    assigned_to_id: '',
    created_by_id: '',
    date_applied_from: '',
    date_applied_to: '',
  });
  // Draft filters for advanced search (not applied until user clicks Apply)
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState<Omit<SearchFilters, 'client_name'>>({
    status: '',
    visa_type_id: '',
    assigned_to_id: '',
    created_by_id: '',
    date_applied_from: '',
    date_applied_to: '',
  });
  // Track if advanced filters are actually applied (not just opened)
  const [advancedFiltersApplied, setAdvancedFiltersApplied] = useState(false);
  // Ref to prevent reload when just closing advanced search without changes
  const isRestoringFilters = useRef(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Fetch visa types on mount (users and clients are loaded on-demand)
  useEffect(() => {
    const abortController = new AbortController();

    const fetchDropdownData = async () => {
      try {
        const typesResponse = await getVisaTypes({ page_size: 1000 }, abortController.signal);
        if (!abortController.signal.aborted) {
          setVisaTypes(typesResponse.results); }}catch (err: any) {
        // Ignore abort errors
        if (err.name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        console.error('Failed to fetch dropdown data:', err); }};

    fetchDropdownData();

    return () => {
      abortController.abort();
    };
  }, []);

  // Fetch applications with AbortController support
  const fetchApplications = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: paginationModel.page + 1, // API uses 1-indexed pages
        page_size: paginationModel.pageSize,
      };

      // Add search filters - only add client_name if it's empty or has 2+ characters
      if (searchFilters.client_name && searchFilters.client_name.length >= 2) {
        params.client_name = searchFilters.client_name;
      }
      if (searchFilters.status) params.status = searchFilters.status;
      if (searchFilters.visa_type_id) params.visa_type_id = searchFilters.visa_type_id;
      if (searchFilters.assigned_to_id) params.assigned_to_id = searchFilters.assigned_to_id;
      if (searchFilters.created_by_id) params.created_by_id = searchFilters.created_by_id;
      if (searchFilters.date_applied_from) params.date_applied_from = searchFilters.date_applied_from;
      if (searchFilters.date_applied_to) params.date_applied_to = searchFilters.date_applied_to;

      const response = await listVisaApplications(params, signal);
      if (!signal?.aborted) {
        setApplications(response.results);
        setTotalCount(response.count); }}catch (err: any) {
      // Ignore abort errors
      if (err.name === 'CanceledError' || signal?.aborted) {
        return;
      }
      setError(err.message || 'Failed to fetch visa applications');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [paginationModel, searchFilters]);

  // AbortController ref for cancelling in-flight requests
  const fetchAbortControllerRef = useRef<AbortController | null>(null);

  // Debounced search effect - only trigger on client_name changes or when advanced filters are applied
  useEffect(() => {
    // Skip if we're just restoring filters (no actual change)
    if (isRestoringFilters.current) {
      isRestoringFilters.current = false;
      return;
    }

    // Only search if client_name is empty or has 2+ characters
    // Advanced filters are handled separately via handleApplyAdvancedSearch
    if (searchFilters.client_name === '' || searchFilters.client_name.length >= 2) {
      const debounceTimer = setTimeout(() => {
        // Cancel any in-flight request
        fetchAbortControllerRef.current?.abort();
        fetchAbortControllerRef.current = new AbortController();
        fetchApplications(fetchAbortControllerRef.current.signal);
      }, 500); // 500ms debounce

      return () => {
        clearTimeout(debounceTimer);
        fetchAbortControllerRef.current?.abort();
      }; }}, [searchFilters.client_name, fetchApplications]);

  // Reset advanced filters applied flag when filters are cleared manually
  useEffect(() => {
    const hasAdvancedFilters = 
      searchFilters.status !== '' ||
      searchFilters.visa_type_id !== '' ||
      searchFilters.assigned_to_id !== '' ||
      searchFilters.created_by_id !== '' ||
      searchFilters.date_applied_from !== '' ||
      searchFilters.date_applied_to !== '';
    
    if (!hasAdvancedFilters) {
      setAdvancedFiltersApplied(false); }}, [searchFilters]);

  // Search handlers
  const handleSimpleSearchChange = (value: string) => {
    setSearchFilters((prev) => ({ ...prev, client_name: value }));
  };


  const handleAdvancedFilterChange = (field: keyof Omit<SearchFilters, 'client_name'>, value: any) => {
    // Convert string to number for ID fields
    let processedValue = value;
    if (field === 'visa_type_id' || field === 'assigned_to_id' || field === 'created_by_id') {
      processedValue = value === '' ? '' : Number(value);
    }
    // Update draft filters only (not active filters) - no automatic search
    setDraftAdvancedFilters((prev) => ({ ...prev, [field]: processedValue }));
  };

  const handleApplyAdvancedSearch = () => {
    // Apply draft filters to active filters
    setSearchFilters((prev) => ({
      ...prev,
      ...draftAdvancedFilters,
    }));
    setPaginationModel({ ...paginationModel, page: 0 });
    setAdvancedFiltersApplied(true);
    // fetchApplications will be triggered by useEffect when searchFilters change
  };

  const handleClearSearch = () => {
    setSearchFilters({
      client_name: '',
      status: '',
      visa_type_id: '',
      assigned_to_id: '',
      created_by_id: '',
      date_applied_from: '',
      date_applied_to: '',
    });
    setDraftAdvancedFilters({
      status: '',
      visa_type_id: '',
      assigned_to_id: '',
      created_by_id: '',
      date_applied_from: '',
      date_applied_to: '',
    });
    setAssignedToUser(null);
    setCreatedByUser(null);
    setAdvancedFiltersApplied(false);
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  const toggleAdvancedSearch = () => {
    const newShowState = !showAdvancedSearch;
    
    if (newShowState) {
      // Opening advanced search - initialize draft filters with current active filters
      setDraftAdvancedFilters({
        status: searchFilters.status,
        visa_type_id: searchFilters.visa_type_id,
        assigned_to_id: searchFilters.assigned_to_id,
        created_by_id: searchFilters.created_by_id,
        date_applied_from: searchFilters.date_applied_from,
        date_applied_to: searchFilters.date_applied_to,
      });
      // Restore user selections if they exist (would need to fetch users, but for now clear)
      if (searchFilters.assigned_to_id) {
        setAssignedToUser(null);
      }
      if (searchFilters.created_by_id) {
        setCreatedByUser(null);
      }
      setShowAdvancedSearch(true);
    } else {
      // Closing advanced search
      if (advancedFiltersApplied) {
        // User had applied advanced filters, so clear them and reload
        setSearchFilters((prev) => ({
          ...prev,
          status: '',
          visa_type_id: '',
          assigned_to_id: '',
          created_by_id: '',
          date_applied_from: '',
          date_applied_to: '',
        }));
        setDraftAdvancedFilters({
          status: '',
          visa_type_id: '',
          assigned_to_id: '',
          created_by_id: '',
          date_applied_from: '',
          date_applied_to: '',
        });
        setAssignedToUser(null);
        setCreatedByUser(null);
        setAdvancedFiltersApplied(false);
        setPaginationModel({ ...paginationModel, page: 0 });
        // fetchApplications will be triggered by useEffect when searchFilters change
      } else {
        // User just opened and closed without applying - no changes needed
        // Draft filters are discarded, active filters remain unchanged
        setShowAdvancedSearch(false);
        // No reload needed - filters haven't changed
      }
    }
  };

  // View handler
  const handleView = (application: VisaApplication) => {
    // Navigate to client detail page with visa applications tab and visa application ID
    navigate(`/clients/${application.client}?tab=visa-applications&visaApplicationId=${application.id}`, {
      state: { from: '/visa-manager/applications' }});
  };

  const handleConfirmDelete = async () => {
    if (!selectedApplication) return;

    try {
      setDeleteLoading(true);
      await deleteVisaApplication(selectedApplication.id);
      setSnackbar({
        open: true,
        message: 'Application deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setSelectedApplication(null);
      fetchApplications();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete application',
        severity: 'error',
      });
    } finally {
      setDeleteLoading(false); }};

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedApplication(null);
  };

  // Status transition function (from Visa Tracker)
  const getStatusTransitions = (status: VisaApplicationStatus): { label: string; value: VisaApplicationStatus }[] => {
    if (status === 'TO_BE_APPLIED') {
      return [
        { label: 'Move to Visa Applied', value: 'VISA_APPLIED' },
        { label: 'Move to Withdrawn', value: 'WITHDRAWN' },
      ];
    } else if (status === 'VISA_APPLIED') {
      return [
        { label: 'Move to Case Opened', value: 'CASE_OPENED' },
        { label: 'Move to Granted', value: 'GRANTED' },
        { label: 'Move to Rejected', value: 'REJECTED' },
      ];
    } else if (status === 'CASE_OPENED') {
      return [
        { label: 'Move to Granted', value: 'GRANTED' },
        { label: 'Move to Rejected', value: 'REJECTED' },
      ];
    }
    return []; // Terminal states: GRANTED, REJECTED, WITHDRAWN
  };

  // Assign handlers
  const handleAssignClick = (app: VisaApplication) => {
    setSelectedApplicationForAssign(app);
    setAssignDialogOpen(true);
  };

  const handleAssignClose = () => {
    setAssignDialogOpen(false);
    setSelectedApplicationForAssign(null);
  };

  const handleAssignSuccess = () => {
    fetchApplications(); // Refresh the list
    setSnackbar({
      open: true,
      message: 'Application assigned successfully',
      severity: 'success',
    });
    handleAssignClose();
  };

  // Status change handlers
  const handleStatusChangeClick = (app: VisaApplication) => {
    setSelectedApplicationForStatus(app);
    setChangeStatusDialogOpen(true);
  };

  const handleStatusDialogClose = () => {
    setChangeStatusDialogOpen(false);
    setSelectedApplicationForStatus(null);
  };

  const handleStatusChangeSuccess = () => {
    fetchApplications(); // Refresh the list
    setSnackbar({
      open: true,
      message: 'Status updated successfully',
      severity: 'success',
    });
    handleStatusDialogClose();
  };

  const handleAddApplication = () => {
    setSelectedApplication(null);
    setDialogMode('add');
  };

  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedApplication(null);
  };

  const handleSaveApplication = async (data: any) => {
    try {
      setFormLoading(true);

      if (dialogMode === 'add') {
        await createVisaApplication(data);
        setSnackbar({
          open: true,
          message: 'Application created successfully',
          severity: 'success',
        });
      } else if (dialogMode === 'edit' && selectedApplication) {
        await updateVisaApplication(selectedApplication.id, data);
        setSnackbar({
          open: true,
          message: 'Application updated successfully',
          severity: 'success',
        });
      }

      handleCloseDialog();
      fetchApplications();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to save application',
        severity: 'error',
      });
    } finally {
      setFormLoading(false); }};

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleClientClick = (clientId: number) => {
    // Navigate to client detail page with state for back navigation
    navigate(`/clients/${clientId}`, { 
      state: { from: '/visa-manager/applications' }});
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
      TO_BE_APPLIED: 'info',
      VISA_APPLIED: 'warning',
      CASE_OPENED: 'secondary',
      GRANTED: 'success',
      REJECTED: 'error',
      WITHDRAWN: 'default',
    };
    return colors[status] || 'default';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string, currency: string) => {
    const value = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  // DataGrid column definitions
  const columns: GridColDef<VisaApplication>[] = [
    {
      field: 'client_name',
      headerName: 'Client',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Link
          component="button"
          variant="body2"
          fontWeight={500}
          onClick={() => handleClientClick(params.row.client)}
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
      field: 'visa_type_name',
      headerName: 'Visa Type',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">{params.value}</Typography>
          {params.row.visa_category_name && (
            <Typography variant="caption" color="text.secondary" display="block">
              {params.row.visa_category_name}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Chip
          label={VISA_STATUS_LABELS[params.value]}
          size="small"
          color={getStatusColor(params.value)}
        />
      ),
    },
    {
      field: 'immigration_fee',
      headerName: 'Immigration Fee',
      width: 140,
      sortable: false,
      valueFormatter: (value, row) => formatCurrency(value, row.immigration_fee_currency),
    },
    {
      field: 'service_fee',
      headerName: 'Service Fee',
      width: 130,
      sortable: false,
      valueFormatter: (value, row) => formatCurrency(value, row.service_fee_currency),
    },
    {
      field: 'date_applied',
      headerName: 'Date Applied',
      width: 120,
      sortable: false,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'assigned_to_name',
      headerName: 'Assigned To',
      width: 150,
      sortable: false,
      renderCell: (params) => params.value || (
        <Typography variant="caption" color="text.secondary">
          Unassigned
        </Typography>
      ),
    },
    {
      field: 'created_by_name',
      headerName: 'Applied By',
      width: 150,
      sortable: false,
      renderCell: (params) => params.value || (
        <Typography variant="caption" color="text.secondary">
          -
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => handleView(params.row)}
              color="primary"
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Assign is non-protected - available to all users */}
          <Tooltip title="Assign">
            <IconButton
              size="small"
              onClick={() => handleAssignClick(params.row)}
              color="primary"
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Change Status requires permission and transitions must be available */}
          {hasPermission('change_visaapplication') && (
            <Tooltip title={getStatusTransitions(params.row.status).length > 0 ? "Change Status" : "No transitions available"}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleStatusChangeClick(params.row)}
                  color="info"
                  disabled={getStatusTransitions(params.row.status).length === 0}
                >
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Visa Applications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all visa applications with advanced search and filtering
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search Section */}
      <Paper sx={{ p: 2, mb: 2 }}>
        {/* Simple Search */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            placeholder="Search by client name (min 2 characters)..."
            value={searchFilters.client_name}
            onChange={(e) => handleSimpleSearchChange(e.target.value)}
            size="small"
            fullWidth
            helperText={
              searchFilters.client_name.length > 0 && searchFilters.client_name.length < 2
                ? 'Type at least 2 characters to search'
                : ''
            }
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            endIcon={showAdvancedSearch ? <ExpandLess /> : <ExpandMore />}
            onClick={toggleAdvancedSearch}
            sx={{ minWidth: 180 }}>
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

        {/* Advanced Search */}
        <Collapse in={showAdvancedSearch} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
              Advanced Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  select
                  label="Status"
                  value={draftAdvancedFilters.status}
                  onChange={(e) => handleAdvancedFilterChange('status', e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {Object.entries(VISA_STATUS_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  select
                  label="Visa Type"
                  value={draftAdvancedFilters.visa_type_id === '' ? '' : draftAdvancedFilters.visa_type_id}
                  onChange={(e) => handleAdvancedFilterChange('visa_type_id', e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">All Visa Types</MenuItem>
                  {visaTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name} {type.code ? `(${type.code})` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <UserAutocomplete
                  value={createdByUser}
                  onChange={(user) => {
                    setCreatedByUser(user);
                    handleAdvancedFilterChange('created_by_id', user?.id || '');
                  }}
                  label="Applied By"
                  placeholder="Search user..."
                  size="small"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  type="date"
                  label="Date Applied From"
                  value={draftAdvancedFilters.date_applied_from}
                  onChange={(e) => handleAdvancedFilterChange('date_applied_from', e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  type="date"
                  label="Date Applied To"
                  value={draftAdvancedFilters.date_applied_to}
                  onChange={(e) => handleAdvancedFilterChange('date_applied_to', e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
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

      {/* Results DataGrid */}
      <Paper sx={{ p: 2, height: 600, display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={applications}
          columns={columns}
          loading={loading}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={35}
          sx={{
            flex: 1,
            border: 'none',
            // 1. Header Styling: Light background and specific font weight
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f8f9fa', // Light gray background
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600, // Matching the bold headers
              fontSize: '0.875rem',
              color: 'text.primary',
            },
            // 2. Cell Styling: Remove vertical lines and adjust font
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
            },
            // 3. Row Hover Effect
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)', // Standard MUI hover
            },
            // 4. Clean up focuses
            '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
              outline: 'none',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            // 5. Footer matching the standard TablePagination
            '& .MuiDataGrid-footerContainer': {
              borderTop: 'none',
            },
          }}
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'add' ? 'Add Visa Application' : 'Edit Visa Application'}
        </DialogTitle>
        <DialogContent dividers>
          <VisaApplicationForm
            mode={dialogMode || 'add'}
            initialData={selectedApplication || undefined}
            onSave={handleSaveApplication}
            onCancel={handleCloseDialog}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <VisaApplicationDeleteDialog
        open={deleteDialogOpen}
        application={selectedApplication}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={deleteLoading}
      />

      {/* Change Status Dialog */}
      <ChangeVisaStatusDialog
        open={changeStatusDialogOpen}
        onClose={handleStatusDialogClose}
        application={selectedApplicationForStatus}
        onSuccess={handleStatusChangeSuccess}
      />

      {/* Assign Dialog */}
      <AssignVisaApplicationDialog
        open={assignDialogOpen}
        onClose={handleAssignClose}
        application={selectedApplicationForAssign}
        onSuccess={handleAssignSuccess}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VisaApplicationsManagementPage;
