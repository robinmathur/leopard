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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Link,
  Menu,
  MenuItem,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import { 
  Visibility, 
  Edit, 
  Delete, 
  Add,
  MoreVert,
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

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
  page: number;
  pageSize: number;
  totalCount: number;
  currentStatus: VisaApplicationStatus;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (application: VisaApplication) => void;
  onEdit: (application: VisaApplication) => void;
  onDelete: (application: VisaApplication) => void;
  onStatusChange: (application: VisaApplication, newStatus: VisaApplicationStatus) => void;
  onClientClick: (clientId: number) => void;
}

const VisaApplicationTable = ({
  applications,
  loading,
  page,
  pageSize,
  totalCount,
  currentStatus,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onClientClick,
}: VisaApplicationTableProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedApp, setSelectedApp] = useState<VisaApplication | null>(null);

  const handleStatusMenuOpen = (event: React.MouseEvent<HTMLElement>, app: VisaApplication) => {
    setAnchorEl(event.currentTarget);
    setSelectedApp(app);
  };

  const handleStatusMenuClose = () => {
    setAnchorEl(null);
    setSelectedApp(null);
  };

  const handleStatusChange = (newStatus: VisaApplicationStatus) => {
    if (selectedApp) {
      onStatusChange(selectedApp, newStatus);
    }
    handleStatusMenuClose();
  };

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

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Visa Type</TableCell>
              <TableCell>Immigration Fee</TableCell>
              <TableCell>Service Fee</TableCell>
              <TableCell>Date Applied</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
                      onClick={() => onClientClick(app.client)}
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
                      <Typography variant="caption" color="text.secondary">
                        {app.visa_category_name}
                      </Typography>
                    )}
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
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => onView(app)} color="primary">
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {statusTransitions.length > 0 && (
                      <Tooltip title="Change Status">
                        <IconButton size="small" onClick={(e) => handleStatusMenuOpen(e, app)}>
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
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
          page={page - 1}
          onPageChange={(_, newPage) => onPageChange(newPage + 1)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(event) => onPageSizeChange(parseInt(event.target.value, 10))}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      )}

      {/* Status Change Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleStatusMenuClose}
      >
        {statusTransitions.map((transition) => (
          <MenuItem key={transition.value} onClick={() => handleStatusChange(transition.value)}>
            {transition.label}
          </MenuItem>
        ))}
      </Menu>
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<VisaApplicationStatusCounts | null>(null);
  const [statusCountsLoading, setStatusCountsLoading] = useState(false);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<VisaApplication | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
        page,
        page_size: pageSize,
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
  }, [page, pageSize]);

  // Fetch on mount and when tab/page changes
  useEffect(() => {
    const abortController = new AbortController();
    fetchApplications(TABS[tabValue].status, abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [tabValue, page, pageSize, fetchApplications]);

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
    setPage(1); // Reset to first page when switching tabs
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  const handleView = (application: VisaApplication) => {
    // Navigate to client detail page with visa applications tab and visa application ID
    navigate(`/clients/${application.client}?tab=visa-applications&visaApplicationId=${application.id}`, {
      state: { from: '/visa-manager/tracker' }
    });
  };

  const handleEdit = (application: VisaApplication) => {
    setSelectedApplication(application);
    setEditDialogOpen(true);
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
        message: 'Visa application deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setSelectedApplication(null);
      // Refresh the list and counts
      fetchApplications(TABS[tabValue].status);
      fetchStatusCounts();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete visa application',
        severity: 'error',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async (application: VisaApplication, newStatus: VisaApplicationStatus) => {
    try {
      await updateVisaApplication(application.id, { status: newStatus });
      setSnackbar({
        open: true,
        message: `Status updated to ${VISA_STATUS_LABELS[newStatus]}`,
        severity: 'success',
      });
      // Refresh the list and counts
      fetchApplications(TABS[tabValue].status);
      fetchStatusCounts();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to update status',
        severity: 'error',
      });
    }
  };

  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}`, { 
      state: { from: '/visa-manager/tracker' } 
    });
  };

  const handleFormSave = async (data: any) => {
    try {
      setFormLoading(true);
      if (selectedApplication) {
        await updateVisaApplication(selectedApplication.id, data);
        setSnackbar({
          open: true,
          message: 'Visa application updated successfully',
          severity: 'success',
        });
        setEditDialogOpen(false);
      } else {
        // This would be for add functionality but not implemented yet
        setSnackbar({
          open: true,
          message: 'Add functionality - navigate to Visa Applications page',
          severity: 'info',
        });
      }
      setSelectedApplication(null);
      // Refresh the list and counts
      fetchApplications(TABS[tabValue].status);
      fetchStatusCounts();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to save visa application',
        severity: 'error',
      });
    } finally {
      setFormLoading(false);
    }
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
        <Button
          variant="contained"
          startIcon={<Add />}
          size="small"
          onClick={handleAddClick}
        >
          Add Visa Application
        </Button>
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

        {TABS.map((_tab, index) => (
          <TabPanel key={index} value={tabValue} index={index}>
            <Box sx={{ p: 2 }}>
              <VisaApplicationTable
                applications={applications}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                currentStatus={TABS[tabValue].status}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onClientClick={handleClientClick}
              />
            </Box>
          </TabPanel>
        ))}
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !formLoading && setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Visa Application</DialogTitle>
        <DialogContent>
          <VisaApplicationForm
            mode="edit"
            initialData={selectedApplication || undefined}
            onSave={handleFormSave}
            onCancel={() => {
              setEditDialogOpen(false);
              setSelectedApplication(null);
            }}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <VisaApplicationDeleteDialog
        open={deleteDialogOpen}
        application={selectedApplication}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedApplication(null);
        }}
        loading={deleteLoading}
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
