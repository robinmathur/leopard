/**
 * VisaTracker
 * Page for tracking visa applications with tabbed navigation by status
 * Shows tabs: To Be Applied, Visa Applied, Case Opened, Granted, Rejected, Withdrawn
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Badge,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Link,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
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
} from '@mui/icons-material';
import { 
  listVisaApplications, 
  updateVisaApplication,
  deleteVisaApplication,
  VisaApplication, 
  VisaApplicationStatus 
} from '@/services/api/visaApplicationApi';
import { getVisaApplicationStatusCounts } from '@/services/api/visaTypeApi';
import { VISA_STATUS_LABELS, VisaApplicationStatusCounts } from '@/types/visaType';
import { VisaApplicationForm } from '@/components/visa/VisaApplicationForm';
import { VisaApplicationDeleteDialog } from '@/components/visa/VisaApplicationDeleteDialog';
import { AssignVisaApplicationDialog } from '@/components/visa/AssignVisaApplicationDialog';
import { ChangeVisaStatusDialog } from '@/components/visa/ChangeVisaStatusDialog';
import { useAuthStore } from '@/store/authStore';
import { formatVirtualId } from '@/utils/virtualId';


// Tab configuration with status filters
const TABS: { label: string; status: VisaApplicationStatus }[] = [
  { label: 'To Be Applied', status: 'TO_BE_APPLIED' },
  { label: 'Visa Applied', status: 'VISA_APPLIED' },
  { label: 'Case Opened', status: 'CASE_OPENED' },
  { label: 'Granted', status: 'GRANTED' },
  { label: 'Rejected', status: 'REJECTED' },
  { label: 'Withdrawn', status: 'WITHDRAWN' },
];

// Helper to get count for a tab
const getTabCount = (
  status: VisaApplicationStatus,
  statusCounts: VisaApplicationStatusCounts | null
): number | undefined => {
  if (!statusCounts) return undefined;
  return statusCounts[status];
};

/**
 * Visa Application Table Component
 */
interface VisaApplicationTableProps {
  applications: VisaApplication[];
  loading: boolean;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  totalCount: number;
  currentStatus: VisaApplicationStatus;
  onView: (application: VisaApplication) => void;
  onAssign: (application: VisaApplication) => void;
  onStatusChange: (application: VisaApplication) => void;
  onClientClick: (clientId: number) => void;
}

const VisaApplicationTable = ({
  applications,
  loading,
  paginationModel,
  onPaginationModelChange,
  totalCount,
  currentStatus,
  onView,
  onAssign,
  onStatusChange,
  onClientClick,
}: VisaApplicationTableProps) => {
  const { hasPermission } = useAuthStore();

  // Define status transition options based on current tab
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
    return [];
  };

  const statusTransitions = getStatusTransitions(currentStatus);
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
      field: 'id',
      headerName: 'ID',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Link
          component="button"
          variant="body2"
          fontWeight={500}
          onClick={() => onView(params.row)}
          sx={{
            textDecoration: 'none',
            color: 'primary.main',
            '&:hover': { textDecoration: 'underline' },
            cursor: 'pointer',
          }}
        >
          {formatVirtualId('visa-application', params.row.id)}
        </Link>
      ),
    },
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
          onClick={() => onClientClick(params.row.client)}
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
      width: 200,
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
              onClick={() => onView(params.row)}
              color="primary"
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Assign is non-protected - available to all users */}
          <Tooltip title="Assign">
            <IconButton
              size="small"
              onClick={() => onAssign(params.row)}
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
                  onClick={() => onStatusChange(params.row)}
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
    <Box sx={{ height: 500, width: '100%' }}>
      <DataGrid
        rows={applications}
        columns={columns}
        loading={loading}
        rowCount={totalCount}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        disableColumnMenu
        columnHeaderHeight={35}
        sx={{
          border: 'none',
          // 1. Header Styling: Light background and specific font weight
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid',
            borderColor: 'divider',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'text.primary',
          },
          // 2. Cell Styling
          '& .MuiDataGrid-cell': {
            fontSize: '0.875rem',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
          },
          // 3. Row Hover Effect
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          // 4. Clean up focuses
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
            outline: 'none',
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
          // 5. Footer
          '& .MuiDataGrid-footerContainer': {
            borderTop: 'none',
          },
        }}
      />
    </Box>
  );
};

/**
 * Main VisaTracker Component
 */
export const VisaTracker = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<VisaApplicationStatusCounts | null>(null);
  const [statusCountsLoading, setStatusCountsLoading] = useState(false);

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<VisaApplication | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Fetch status counts with AbortController support
  const fetchStatusCounts = useCallback(async (signal?: AbortSignal) => {
    try {
      setStatusCountsLoading(true);
      const counts = await getVisaApplicationStatusCounts(signal);
      if (!signal?.aborted) {
        setStatusCounts(counts);
      }
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'CanceledError' || signal?.aborted) {
        return;
      }
      console.error('Failed to fetch status counts:', err);
    } finally {
      if (!signal?.aborted) {
        setStatusCountsLoading(false);
      }
    }
  }, []);

  // Fetch applications with current tab's status filter
  const fetchApplications = useCallback(async (status: VisaApplicationStatus, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const response = await listVisaApplications({
        status,
        page: paginationModel.page + 1, // API uses 1-indexed pages
        page_size: paginationModel.pageSize,
      }, signal);
      if (!signal?.aborted) {
        setApplications(response.results);
        setTotalCount(response.count);
      }
    } catch (err: any) {
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
  }, [paginationModel]);

  // Fetch on mount and when tab/page changes
  useEffect(() => {
    const abortController = new AbortController();
    fetchApplications(TABS[tabValue].status, abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [tabValue, fetchApplications]);

  // Fetch status counts on mount
  useEffect(() => {
    const abortController = new AbortController();
    fetchStatusCounts(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [fetchStatusCounts]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPaginationModel({ ...paginationModel, page: 0 }); // Reset to first page when switching tabs
  };

  // Handlers
  const handleView = (application: VisaApplication) => {
    navigate(`/visa-applications/${application.id}`, {
      state: { from: '/visa-manager/tracker' }
    });
  };

  const handleAssign = (application: VisaApplication) => {
    setSelectedApplication(application);
    setAssignDialogOpen(true);
  };

  const handleAssignClose = () => {
    setAssignDialogOpen(false);
    setSelectedApplication(null);
  };

  const handleAssignSuccess = () => {
    fetchApplications(TABS[tabValue].status);
    setSnackbar({
      open: true,
      message: 'Application assigned successfully',
      severity: 'success',
    });
    handleAssignClose();
  };

  const handleStatusChange = (application: VisaApplication) => {
    setSelectedApplication(application);
    setChangeStatusDialogOpen(true);
  };

  const handleStatusDialogClose = () => {
    setChangeStatusDialogOpen(false);
    setSelectedApplication(null);
  };

  const handleStatusChangeSuccess = () => {
    fetchApplications(TABS[tabValue].status);
    fetchStatusCounts();
    setSnackbar({
      open: true,
      message: 'Status updated successfully',
      severity: 'success',
    });
    handleStatusDialogClose();
  };

  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}`, {
      state: { from: '/visa-manager/tracker' }
    });
  };

  const handleAddClick = () => {
    navigate('/visa-manager/applications');
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Visa Tracker
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage visa applications by status
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((tab, index) => {
            const count = getTabCount(tab.status, statusCounts);
            return (
              <Tab
                key={index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.label}
                    {statusCountsLoading ? (
                      <CircularProgress size={14} />
                    ) : count !== undefined ? (
                      <Badge
                        badgeContent={count}
                        color="primary"
                        max={999}
                        sx={{
                          '& .MuiBadge-badge': {
                            position: 'relative',
                            transform: 'none',
                            fontSize: '0.75rem',
                            minWidth: '20px',
                            height: '20px',
                          },
                        }}
                      />
                    ) : null}
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        <Box sx={{ p: 2 }}>
          <VisaApplicationTable
            applications={applications}
            loading={loading}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            totalCount={totalCount}
            currentStatus={TABS[tabValue].status}
            onView={handleView}
            onAssign={handleAssign}
            onStatusChange={handleStatusChange}
            onClientClick={handleClientClick}
          />
        </Box>
      </Paper>

      {/* Assign Dialog */}
      <AssignVisaApplicationDialog
        open={assignDialogOpen}
        onClose={handleAssignClose}
        application={selectedApplication}
        onSuccess={handleAssignSuccess}
      />

      {/* Change Status Dialog */}
      <ChangeVisaStatusDialog
        open={changeStatusDialogOpen}
        onClose={handleStatusDialogClose}
        application={selectedApplication}
        onSuccess={handleStatusChangeSuccess}
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

export default VisaTracker;
