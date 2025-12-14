/**
 * VisaApplicationsManagementPage
 * Comprehensive page for managing visa applications with CRUD operations
 * Features simple and advanced search functionality
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  Grid,
  Collapse,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  Link,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Search,
  ExpandMore,
  ExpandLess,
  FilterList,
  Clear,
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

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
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

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Fetch visa types on mount (users and clients are loaded on-demand)
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const typesResponse = await getVisaTypes({ page_size: 1000 });
        setVisaTypes(typesResponse.results);
      } catch (err: any) {
        console.error('Failed to fetch dropdown data:', err);
      }
    };

    fetchDropdownData();
  }, []);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: page + 1,
        page_size: pageSize,
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

      const response = await listVisaApplications(params);
      setApplications(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visa applications');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchFilters]);

  // Debounced search effect
  useEffect(() => {
    // Only search if client_name is empty or has 2+ characters
    if (searchFilters.client_name === '' || searchFilters.client_name.length >= 2) {
      const debounceTimer = setTimeout(() => {
        fetchApplications();
      }, 500); // 500ms debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [searchFilters, page, pageSize, fetchApplications]);

  // Search handlers
  const handleSimpleSearchChange = (value: string) => {
    setSearchFilters((prev) => ({ ...prev, client_name: value }));
  };

  const handleSimpleSearchSubmit = () => {
    setPage(0);
    fetchApplications();
  };

  const handleAdvancedFilterChange = (field: keyof SearchFilters, value: any) => {
    // Convert string to number for ID fields
    let processedValue = value;
    if (field === 'visa_type_id' || field === 'assigned_to_id' || field === 'created_by_id') {
      processedValue = value === '' ? '' : Number(value);
    }
    setSearchFilters((prev) => ({ ...prev, [field]: processedValue }));
  };

  const handleApplyAdvancedSearch = () => {
    setPage(0);
    fetchApplications();
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
    setAssignedToUser(null);
    setCreatedByUser(null);
    setPage(0);
  };

  const toggleAdvancedSearch = () => {
    const newShowState = !showAdvancedSearch;
    setShowAdvancedSearch(newShowState);
    
    // Clear advanced filters when minimizing
    if (!newShowState) {
      setSearchFilters((prev) => ({
        ...prev,
        status: '',
        visa_type_id: '',
        assigned_to_id: '',
        created_by_id: '',
        date_applied_from: '',
        date_applied_to: '',
      }));
      setAssignedToUser(null);
      setCreatedByUser(null);
    }
  };

  // Table handlers
  const handlePageChange = (_: any, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleView = (application: VisaApplication) => {
    // TODO: Navigate to detail page or open view modal
    console.log('View application:', application);
    setSnackbar({
      open: true,
      message: 'View functionality coming soon',
      severity: 'info',
    });
  };

  const handleEdit = (application: VisaApplication) => {
    setSelectedApplication(application);
    setDialogMode('edit');
  };

  const handleDelete = (application: VisaApplication) => {
    setSelectedApplication(application);
    setDeleteDialogOpen(true);
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
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedApplication(null);
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
      setFormLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleClientClick = (clientId: number) => {
    // Navigate to client detail page with state for back navigation
    navigate(`/clients/${clientId}`, { 
      state: { from: '/visa-manager/applications' } 
    });
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
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddApplication}
          size="small"
        >
          Add Application
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
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
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSimpleSearchSubmit();
              }
            }}
            size="small"
            fullWidth
            helperText={
              searchFilters.client_name.length > 0 && searchFilters.client_name.length < 2
                ? 'Type at least 2 characters to search'
                : ''
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={handleSimpleSearchSubmit}
            sx={{ minWidth: 100 }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            endIcon={showAdvancedSearch ? <ExpandLess /> : <ExpandMore />}
            onClick={toggleAdvancedSearch}
            sx={{ minWidth: 180 }}
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
                  label="Status"
                  value={searchFilters.status}
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

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  label="Visa Type"
                  value={searchFilters.visa_type_id === '' ? '' : searchFilters.visa_type_id}
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

              <Grid item xs={12} sm={6} md={4}>
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

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  type="date"
                  label="Date Applied From"
                  value={searchFilters.date_applied_from}
                  onChange={(e) => handleAdvancedFilterChange('date_applied_from', e.target.value)}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  type="date"
                  label="Date Applied To"
                  value={searchFilters.date_applied_to}
                  onChange={(e) => handleAdvancedFilterChange('date_applied_to', e.target.value)}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
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

      {/* Results Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Visa Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Immigration Fee</TableCell>
                <TableCell>Service Fee</TableCell>
                <TableCell>Date Applied</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Applied By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No applications found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell>
                      <Link
                        component="button"
                        variant="body2"
                        fontWeight={500}
                        onClick={() => handleClientClick(app.client)}
                        sx={{
                          cursor: 'pointer',
                          textDecoration: 'none',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {app.client_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{app.visa_type_name}</Typography>
                      {app.visa_category_name && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {app.visa_category_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={VISA_STATUS_LABELS[app.status]}
                        size="small"
                        color={getStatusColor(app.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {formatCurrency(app.immigration_fee, app.immigration_fee_currency)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(app.service_fee, app.service_fee_currency)}
                    </TableCell>
                    <TableCell>{formatDate(app.date_applied)}</TableCell>
                    <TableCell>
                      {app.assigned_to_name || (
                        <Typography variant="caption" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.created_by_name || (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleView(app)} color="primary">
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(app)} color="default">
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(app)} color="error">
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && applications.length > 0 && (
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
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

      {/* Snackbar */}
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

export default VisaApplicationsManagementPage;
