/**
 * ApplicationsList - Comprehensive view of all college applications
 * Uses MUI DataGrid with search, filters, and quick actions
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Link,
  Alert,
  Snackbar,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
} from '@mui/x-data-grid';
import {
  Visibility,
  PersonAdd as PersonAddIcon,
  ArrowForward as ArrowForwardIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  listCollegeApplications,
  listApplicationTypes,
  listStages,
} from '@/services/api/collegeApplicationApi';
import { userApi } from '@/services/api/userApi';
import type {
  CollegeApplication,
  ApplicationType,
  Stage,
} from '@/types/collegeApplication';
import type { User } from '@/types/user';
import { AssignCollegeApplicationDialog } from '@/components/college/AssignCollegeApplicationDialog';
import { ChangeStageDialog } from '@/components/college/ChangeStageDialog';
import { useAuthStore } from '@/store/authStore';

interface SearchFilters {
  client_name?: string;
  application_type_id?: number;
  stage_id?: number;
  assigned_to?: number;
  created_by?: number;
  created_after?: string;
  created_before?: string;
}

export const ApplicationsList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  // Data state
  const [applications, setApplications] = useState<CollegeApplication[]>([]);
  const [applicationTypes, setApplicationTypes] = useState<ApplicationType[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  // Search and filters
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [draftFilters, setDraftFilters] = useState<SearchFilters>({});
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Dialogs
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    application: CollegeApplication | null;
  }>({ open: false, application: null });

  const [changeStageDialog, setChangeStageDialog] = useState<{
    open: boolean;
    application: CollegeApplication | null;
  }>({ open: false, application: null });

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Fetch applications
  const fetchApplications = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const response = await listCollegeApplications({
        ...searchFilters,
        page: paginationModel.page + 1, // API uses 1-indexed pages
        page_size: paginationModel.pageSize,
      }, signal);

      if (!signal?.aborted) {
        setApplications(response.results);
        setTotalCount(response.count);
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || signal?.aborted) return;
      setError(err.message || 'Failed to fetch applications');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [searchFilters, paginationModel]);

  // Fetch filter options (types, stages, users)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [typesResponse, stagesResponse, usersResponse] = await Promise.all([
          listApplicationTypes({ is_active: true }),
          listStages({}),
          userApi.getAllActiveUsers(),
        ]);

        setApplicationTypes(typesResponse.results);
        setStages(stagesResponse);
        setUsers(usersResponse);
      } catch (err: any) {
        console.error('Failed to load filter options:', err);
      }
    };

    fetchFilterOptions();
  }, []);

  // Fetch applications when filters or pagination change
  useEffect(() => {
    const abortController = new AbortController();
    fetchApplications(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchApplications]);

  // Debounce simple search
  useEffect(() => {
    if (searchFilters.client_name === '' || (searchFilters.client_name && searchFilters.client_name.length >= 2)) {
      const timer = setTimeout(() => {
        // Triggers refetch via fetchApplications dependency
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchFilters.client_name]);

  // Handlers
  const handleView = (application: CollegeApplication) => {
    navigate(`/clients/${application.client}?tab=applications&collegeApplicationId=${application.id}`, {
      state: { from: '/application-manager/applications' }
    });
  };

  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}`, {
      state: { from: '/application-manager/applications' }
    });
  };

  const handleApplyFilters = () => {
    setSearchFilters(draftFilters);
    setPaginationModel({ ...paginationModel, page: 0 }); // Reset to first page
  };

  const handleClearFilters = () => {
    setDraftFilters({});
    setSearchFilters({});
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // DataGrid column definitions
  const columns: GridColDef<CollegeApplication>[] = [
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
      field: 'application_type_title',
      headerName: 'Type',
      width: 150,
      sortable: false,
    },
    {
      field: 'stage_name',
      headerName: 'Stage',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.row.is_final_stage ? 'success' : 'primary'}
        />
      ),
    },
    {
      field: 'institute_name',
      headerName: 'Institute',
      width: 200,
      sortable: false,
    },
    {
      field: 'course_name',
      headerName: 'Course',
      width: 200,
      sortable: false,
    },
    {
      field: 'intake_date',
      headerName: 'Intake Date',
      width: 130,
      sortable: false,
      valueFormatter: (value) => new Date(value).toLocaleDateString(),
    },
    {
      field: 'location_display',
      headerName: 'Location',
      width: 150,
      sortable: false,
    },
    {
      field: 'total_tuition_fee',
      headerName: 'Tuition Fee',
      width: 130,
      sortable: false,
      valueFormatter: (value) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(parseFloat(value)),
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
          {hasPermission('change_collegeapplication') && (
            <>
              <Tooltip title="Assign">
                <IconButton
                  size="small"
                  onClick={() => setAssignDialog({ open: true, application: params.row })}
                  color="primary"
                >
                  <PersonAddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Change Stage">
                <IconButton
                  size="small"
                  onClick={() => setChangeStageDialog({ open: true, application: params.row })}
                  color="info"
                >
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        height: { xs: 'auto', md: 'calc(100vh - 100px)' },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header - Fixed */}
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Applications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage all college applications
        </Typography>
      </Box>

      {/* Search Section - Fixed */}
      <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: showAdvancedSearch ? 2 : 0 }}>
          <TextField
            size="small"
            placeholder="Search by client name (min 2 characters)..."
            value={searchFilters.client_name || ''}
            onChange={(e) => setSearchFilters(prev => ({ ...prev, client_name: e.target.value }))}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          <Button
            variant="outlined"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          >
            {showAdvancedSearch ? 'Hide' : 'Show'} Advanced Search
          </Button>
        </Box>

        {/* Advanced Filters */}
        {showAdvancedSearch && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Application Type</InputLabel>
              <Select
                value={draftFilters.application_type_id || ''}
                onChange={(e) => setDraftFilters(prev => ({ ...prev, application_type_id: e.target.value as number }))}
                label="Application Type"
              >
                <MenuItem value="">All Types</MenuItem>
                {applicationTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Stage</InputLabel>
              <Select
                value={draftFilters.stage_id || ''}
                onChange={(e) => setDraftFilters(prev => ({ ...prev, stage_id: e.target.value as number }))}
                label="Stage"
              >
                <MenuItem value="">All Stages</MenuItem>
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={stage.id}>
                    {stage.stage_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              size="small"
              options={users}
              getOptionLabel={(option) => option.full_name}
              renderInput={(params) => <TextField {...params} label="Assigned To" />}
              value={users.find(u => u.id === draftFilters.assigned_to) || null}
              onChange={(_, value) => setDraftFilters(prev => ({ ...prev, assigned_to: value?.id }))}
              sx={{ minWidth: 200 }}
            />

            <Autocomplete
              size="small"
              options={users}
              getOptionLabel={(option) => option.full_name}
              renderInput={(params) => <TextField {...params} label="Created By" />}
              value={users.find(u => u.id === draftFilters.created_by) || null}
              onChange={(_, value) => setDraftFilters(prev => ({ ...prev, created_by: value?.id }))}
              sx={{ minWidth: 200 }}
            />

            <TextField
              size="small"
              label="Created After"
              type="date"
              value={draftFilters.created_after || ''}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, created_after: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />

            <TextField
              size="small"
              label="Created Before"
              type="date"
              value={draftFilters.created_before || ''}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, created_before: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button variant="contained" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
              <Button onClick={handleClearFilters}>
                Clear
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* DataGrid - Scrollable */}
      <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
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
          // disableColumnFilter
          // disableColumnSelector
          // disableDensitySelector
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
              fontWeight: 600, // Matching the bold headers in Visa Manager
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

      {/* Assign Dialog */}
      <AssignCollegeApplicationDialog
        open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, application: null })}
        application={assignDialog.application}
        onSuccess={() => {
          fetchApplications();
          setSnackbar({
            open: true,
            message: 'Application assigned successfully',
            severity: 'success',
          });
        }}
      />

      {/* Change Stage Dialog */}
      <ChangeStageDialog
        open={changeStageDialog.open}
        onClose={() => setChangeStageDialog({ open: false, application: null })}
        application={changeStageDialog.application}
        onSuccess={() => {
          fetchApplications();
          setSnackbar({
            open: true,
            message: 'Stage changed successfully',
            severity: 'success',
          });
        }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
