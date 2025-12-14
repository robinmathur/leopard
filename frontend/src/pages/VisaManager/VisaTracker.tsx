/**
 * VisaTracker
 * Page for tracking visa applications with tabbed navigation by status
 * Shows tabs: To Be Applied, Visa Applied, Case Opened, Granted, Rejected, Withdrawn
 */
import { useEffect, useState, useCallback } from 'react';
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
} from '@mui/material';
import { Visibility, Edit } from '@mui/icons-material';
import { listVisaApplications, VisaApplication, VisaApplicationStatus } from '@/services/api/visaApplicationApi';
import { getVisaApplicationStatusCounts } from '@/services/api/visaTypeApi';
import { VISA_STATUS_LABELS, VisaApplicationStatusCounts } from '@/types/visaType';

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
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (application: VisaApplication) => void;
  onEdit: (application: VisaApplication) => void;
}

const VisaApplicationTable = ({
  applications,
  loading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
}: VisaApplicationTableProps) => {
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
              <TableCell>Status</TableCell>
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
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No applications found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {app.client_name}
                    </Typography>
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
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => onView(app)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(app)}>
                        <Edit fontSize="small" />
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
          page={page - 1}
          onPageChange={(_, newPage) => onPageChange(newPage + 1)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(event) => onPageSizeChange(parseInt(event.target.value, 10))}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      )}
    </Box>
  );
};

/**
 * Main VisaTracker Component
 */
export const VisaTracker = () => {
  const [tabValue, setTabValue] = useState(0);
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<VisaApplicationStatusCounts | null>(null);
  const [statusCountsLoading, setStatusCountsLoading] = useState(false);

  // Fetch status counts
  const fetchStatusCounts = useCallback(async () => {
    try {
      setStatusCountsLoading(true);
      const counts = await getVisaApplicationStatusCounts();
      setStatusCounts(counts);
    } catch (err: any) {
      console.error('Failed to fetch status counts:', err);
    } finally {
      setStatusCountsLoading(false);
    }
  }, []);

  // Fetch applications with current tab's status filter
  const fetchApplications = useCallback(async (status: VisaApplicationStatus) => {
    try {
      setLoading(true);
      setError(null);
      const response = await listVisaApplications({
        status,
        page,
        page_size: pageSize,
      });
      setApplications(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visa applications');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Fetch on mount and when tab/page changes
  useEffect(() => {
    fetchApplications(TABS[tabValue].status);
  }, [tabValue, page, pageSize, fetchApplications]);

  // Fetch status counts on mount
  useEffect(() => {
    fetchStatusCounts();
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
    // TODO: Navigate to application detail page or open modal
    console.log('View application:', application);
  };

  const handleEdit = (application: VisaApplication) => {
    // TODO: Open edit modal
    console.log('Edit application:', application);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Visa Tracker
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track and manage visa applications by status
        </Typography>
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
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onView={handleView}
                onEdit={handleEdit}
              />
            </Box>
          </TabPanel>
        ))}
      </Paper>
    </Box>
  );
};

export default VisaTracker;
