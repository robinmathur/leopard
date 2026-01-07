/**
 * ApplicationTracker - Track applications by stage with dynamic tabs
 * Single page with dropdown to select application type and stage tabs
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Badge,
  CircularProgress,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  Link,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import {
  Visibility,
  PersonAdd as PersonAddIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  listApplicationTypes,
  listStages,
  listCollegeApplications,
  getStageCounts,
} from '@/services/api/collegeApplicationApi';
import type {
  ApplicationType,
  Stage,
  CollegeApplication,
  StageCountsResponse,
} from '@/types/collegeApplication';
import { AssignCollegeApplicationDialog } from '@/components/college/AssignCollegeApplicationDialog';
import { ChangeStageDialog } from '@/components/college/ChangeStageDialog';
import { useAuthStore } from '@/store/authStore';

export const ApplicationTracker: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuthStore();

  const [applicationTypes, setApplicationTypes] = useState<ApplicationType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [tabValue, setTabValue] = useState<number | null>(null); // null means not initialized yet
  const [applications, setApplications] = useState<CollegeApplication[]>([]);
  const [stageCounts, setStageCounts] = useState<StageCountsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCountsLoading, setStatusCountsLoading] = useState(false);

  // Pagination
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  // Dialogs
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    application: CollegeApplication | null;
  }>({ open: false, application: null });

  const [changeStageDialog, setChangeStageDialog] = useState<{
    open: boolean;
    application: CollegeApplication | null;
  }>({ open: false, application: null });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Fetch application types on mount
  useEffect(() => {
    const fetchApplicationTypes = async () => {
      try {
        const response = await listApplicationTypes({ is_active: true });
        setApplicationTypes(response.results);

        // Auto-select first type if available and no URL params
        const typeIdParam = searchParams.get('typeId');
        if (response.results.length > 0 && !typeIdParam) {
          setSelectedTypeId(response.results[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load application types');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchApplicationTypes();
  }, [searchParams]);

  // Initialize from URL parameters
  useEffect(() => {
    if (applicationTypes.length === 0) return;

    const typeIdParam = searchParams.get('typeId');
    if (typeIdParam) {
      const typeId = Number(typeIdParam);
      if (applicationTypes.some(t => t.id === typeId)) {
        setSelectedTypeId(typeId);
      }
    }
  }, [applicationTypes, searchParams]);

  // Fetch stages and counts for application type
  const fetchStagesAndCounts = useCallback(async (typeId: number, signal?: AbortSignal, initialStageId?: number | null, legacyStageIndex?: number | null) => {
    try {
      setStatusCountsLoading(true);
      const [stagesList, counts] = await Promise.all([
        listStages({ application_type_id: typeId }, signal),
        getStageCounts({ application_type_id: typeId }, signal),
      ]);

      if (!signal?.aborted) {
        setStages(stagesList);
        setStageCounts(counts);
        
        // Set tab value from initialStageId if provided
        if (initialStageId !== null && initialStageId !== undefined && stagesList.length > 0) {
          const stageIndex = stagesList.findIndex(s => s.id === initialStageId);
          if (stageIndex >= 0) {
            setTabValue(stageIndex);
          } else {
            setTabValue(0);
          }
        } else if (legacyStageIndex !== null && legacyStageIndex !== undefined) {
          // Handle legacy stageIndex
          if (legacyStageIndex >= 0 && legacyStageIndex < stagesList.length) {
            setTabValue(legacyStageIndex);
            // Update URL to use stageId instead - read current searchParams
            setSearchParams((prev) => {
              const newParams = new URLSearchParams(prev);
              if (typeId) {
                newParams.set('typeId', String(typeId));
              }
              if (stagesList[legacyStageIndex]) {
                newParams.set('stageId', String(stagesList[legacyStageIndex].id));
              }
              newParams.delete('stageIndex');
              return newParams;
            }, { replace: true });
          } else {
            setTabValue(0);
          }
        } else {
          setTabValue(0);
        }
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || signal?.aborted) return;
      console.error('Failed to fetch stages and counts:', err);
    } finally {
      if (!signal?.aborted) {
        setStatusCountsLoading(false);
      }
    }
  }, [setSearchParams]);

  // Fetch applications for current stage
  const fetchApplications = useCallback(async (typeId: number, stageId: number, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const response = await listCollegeApplications({
        application_type_id: typeId,
        stage_id: stageId,
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
  }, [paginationModel]);

  // Load stages when application type changes (not when URL changes)
  useEffect(() => {
    if (!selectedTypeId) return;

    const abortController = new AbortController();
    // Get stageId from URL for initial load - only read once when type changes
    const stageIdParam = searchParams.get('stageId');
    const stageIndexParam = searchParams.get('stageIndex');
    const initialStageId = stageIdParam ? Number(stageIdParam) : null;
    const legacyIndex = stageIndexParam ? Number(stageIndexParam) : null;
    fetchStagesAndCounts(selectedTypeId, abortController.signal, initialStageId, legacyIndex);

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypeId]); // Only depend on selectedTypeId - stages don't change when URL changes


  // Fetch applications when tab/page changes
  useEffect(() => {
    if (!selectedTypeId || stages.length === 0 || tabValue === null) return;

    const abortController = new AbortController();
    const currentStage = stages[tabValue];

    if (currentStage) {
      fetchApplications(selectedTypeId, currentStage.id, abortController.signal);
    }

    return () => {
      abortController.abort();
    };
  }, [selectedTypeId, tabValue, stages, fetchApplications]);

  // Handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPaginationModel({ ...paginationModel, page: 0 }); // Reset to first page
    // Update URL without triggering re-fetch of stages
    const newParams = new URLSearchParams(searchParams);
    if (selectedTypeId) {
      newParams.set('typeId', String(selectedTypeId));
    }
    // Use stageId instead of stageIndex for better reliability
    if (stages[newValue]) {
      newParams.set('stageId', String(stages[newValue].id));
    }
    newParams.delete('stageIndex'); // Remove old parameter
    setSearchParams(newParams, { replace: true });
    // Note: Only applications will be fetched via the useEffect that watches tabValue
  };

  const handleTypeChange = (typeId: number) => {
    setSelectedTypeId(typeId);
    setTabValue(null); // Reset tab value when type changes
    setPaginationModel({ ...paginationModel, page: 0 }); // Reset pagination
    const newParams = new URLSearchParams(searchParams);
    newParams.set('typeId', String(typeId));
    newParams.delete('stageIndex'); // Reset stage when type changes
    newParams.delete('stageId'); // Reset stageId when type changes
    setSearchParams(newParams, { replace: true });
  };

  const handleView = (application: CollegeApplication) => {
    navigate(`/college-applications/${application.id}`, {
      state: { from: '/application-manager/tracker' }
    });
  };

  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}`, {
      state: { from: '/application-manager/tracker' }
    });
  };


  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStageCount = (stageId: number): number => {
    if (!stageCounts) return 0;
    const stageData = stageCounts.by_stage.find((s) => s.stage_id === stageId);
    return stageData?.count || 0;
  };

  // DataGrid column definitions (same as ApplicationsList but without stage_name)
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
          {/* Assign is non-protected - available to all users */}
          <Tooltip title="Assign">
            <IconButton
              size="small"
              onClick={() => setAssignDialog({ open: true, application: params.row })}
              color="primary"
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Change Stage requires permission */}
          {hasPermission('change_collegeapplication') && (
            <Tooltip title="Change Stage">
              <IconButton
                size="small"
                onClick={() => setChangeStageDialog({ open: true, application: params.row })}
                color="info"
              >
                <ArrowForwardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  // Loading or error states
  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (applicationTypes.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No active application types found. Create an application type to start tracking applications.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: { xs: 'auto', md: 'calc(100vh - 100px)' },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Application Tracker
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track and manage applications by type and stage
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Application Type Selector */}
      <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Application Type</InputLabel>
          <Select
            value={selectedTypeId || ''}
            onChange={(e) => handleTypeChange(e.target.value as number)}
            label="Application Type"
          >
            {applicationTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.title} ({type.stages_count} Stages)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {selectedTypeId && statusCountsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : selectedTypeId && !statusCountsLoading && stages.length === 0 ? (
        <Alert severity="warning" sx={{ flexShrink: 0 }}>
          No stages defined for this application type. Add stages to start tracking.
        </Alert>
      ) : selectedTypeId && stages.length > 0 && tabValue !== null ? (
        <Paper sx={{ px: 2, pt: 0.5, pb: 2, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Stage Selection - Wrapping into rows */}
          <Box
            sx={{
              px: 0,
              py: 0.5,
              borderBottom: 1,
              borderColor: 'divider',
              flexShrink: 0,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            {stages.map((stage, index) => {
              const count = getStageCount(stage.id);
              const isSelected = tabValue === index;
              return (
                <Chip
                  key={index}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                      <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                        {stage.stage_name}
                      </Typography>
                      {stage.is_final_stage && (
                        <Chip label="Final" size="small" color="success" sx={{ height: 18 }} />
                      )}
                      {statusCountsLoading ? (
                        <CircularProgress size={14} />
                      ) : count > 0 ? (
                        <Badge
                          badgeContent={count}
                          max={999}
                          sx={{
                            '& .MuiBadge-badge': {
                              position: 'relative',
                              transform: 'none',
                              fontSize: '0.7rem',
                              minWidth: '18px',
                              height: '18px',
                              bgcolor: isSelected ? '#fff' : 'primary.main',
                              color: isSelected ? 'primary.main' : '#fff',
                              fontWeight: 600,
                            },
                          }}
                        />
                      ) : null}
                    </Box>
                  }
                  onClick={() => handleTabChange({} as React.SyntheticEvent, index)}
                  color={isSelected ? 'primary' : 'default'}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    py: 1,
                    height: 'auto',
                    '&:hover': {
                      bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                    },
                  }}
                />
              );
            })}
          </Box>

          {/* DataGrid Content */}
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', pt: 2 }}>
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
          </Box>
        </Paper>
      ) : null}

      {/* Assign Dialog */}
      <AssignCollegeApplicationDialog
        open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, application: null })}
        application={assignDialog.application}
        onSuccess={() => {
          const abortController = new AbortController();
          if (selectedTypeId && tabValue !== null && stages[tabValue]) {
            fetchApplications(selectedTypeId, stages[tabValue].id, abortController.signal);
            fetchStagesAndCounts(selectedTypeId, abortController.signal);
          }
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
          const abortController = new AbortController();
          if (selectedTypeId && tabValue !== null && stages[tabValue]) {
            fetchApplications(selectedTypeId, stages[tabValue].id, abortController.signal);
            fetchStagesAndCounts(selectedTypeId, abortController.signal);
          }
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
