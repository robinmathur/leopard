/**
 * ClientVisaApplications Component
 * Displays visa applications for a client
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Skeleton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  Collapse,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getVisaApplications, createVisaApplication, VisaApplication, VisaApplicationStatus, deleteVisaApplication, updateVisaApplication, getVisaApplication } from '@/services/api/visaApplicationApi';
import {Protect} from "@/components/protected/Protect.tsx";
import { VisaApplicationForm } from '@/components/visa/VisaApplicationForm';

export interface ClientVisaApplicationsProps {
  /** Client ID */
  clientId: number;
  /** Optional: Pre-selected visa application ID (from URL params) */
  selectedApplicationId?: number;
  /** Callback when application is updated */
  onApplicationUpdate?: () => void;
  /** Callback when detail view is closed (to update URL) */
  onDetailClose?: () => void;
  /** Callback when a card is clicked (to update URL) */
  onCardClick?: (applicationId: number) => void;
}

/**
 * Status color mapping
 */
const STATUS_COLORS: Record<VisaApplicationStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  TO_BE_APPLIED: 'default',
  VISA_APPLIED: 'info',
  CASE_OPENED: 'warning',
  GRANTED: 'success',
  REJECTED: 'error',
  WITHDRAWN: 'default',
};

/**
 * Status labels
 */
const STATUS_LABELS: Record<VisaApplicationStatus, string> = {
  TO_BE_APPLIED: 'To Be Applied',
  VISA_APPLIED: 'Visa Applied',
  CASE_OPENED: 'Case Opened',
  GRANTED: 'Granted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

/**
 * Format date for display
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString; }};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2">{value || '-'}</Typography>
  </Box>
);

/**
 * Expanded detail row component
 */
const ExpandedDetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
      {label}
    </Typography>
    <Typography variant="body1">{value || '-'}</Typography>
  </Box>
);

/**
 * Loading skeleton
 */
const VisaApplicationsSkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }}/>
      </Box>
    ))}
  </Box>
);

/**
 * Visa application card
 */
interface VisaApplicationCardProps {
  application: VisaApplication;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onEdit?: (application: VisaApplication) => void;
  onDelete?: (applicationId: number) => void;
  onUpdate?: () => void;
}

const VisaApplicationCard = ({ 
  application, 
  isExpanded = false,
  onExpand,
  onCollapse,
  onEdit,
  onDelete,
  onUpdate,
}: VisaApplicationCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const handleHeaderClick = () => {
    if (isExpanded) {
      onCollapse?.();
    } else {
      onExpand?.();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCollapse?.();
  };

  const handleSaveApplication = async (data: any) => {
    try {
      setFormLoading(true);
      await updateVisaApplication(application.id, data);
      
      // Refresh application data
      const updated = await getVisaApplication(application.id);
      
      setEditDialogOpen(false);
      onUpdate?.();
    } catch (err: any) {
      console.error('Failed to update visa application:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setFormLoading(true);
      await deleteVisaApplication(application.id);
      setDeleteDialogOpen(false);
      onDelete?.(application.id);
      onUpdate?.();
    } catch (err: any) {
      console.error('Failed to delete visa application:', err);
      alert('Failed to delete visa application. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Pass the current location as 'from' state for proper back navigation
    const fromPath = location.pathname;
    navigate(`/visa-applications/${application.id}`, {
      state: { from: fromPath }
    });
  };

  return (
    <>
      <Paper
        variant="outlined"
        onClick={handleHeaderClick}
        sx={{
          p: 2,
          mb: 2,
          border: isExpanded ? 2 : 1,
          borderColor: isExpanded ? 'primary.main' : 'divider',
          bgcolor: isExpanded ? 'action.selected' : 'background.paper',
          '&:hover': {
            boxShadow: 2,
            cursor: 'pointer',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {/* Header Section */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1 }}>
            <FlightTakeoffIcon color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {application.visa_type_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {application.visa_category_name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={STATUS_LABELS[application.status]}
              color={STATUS_COLORS[application.status]}
              size="small"
            />
            {isExpanded ? (
              <IconButton
                size="small"
                onClick={handleCollapseClick}
                sx={{ ml: 1 }}
                aria-label="Collapse"
              >
                <ExpandLessIcon />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                onClick={(e) => e.stopPropagation()}
                sx={{ ml: 1 }}
                aria-label="Expand"
              >
                <ExpandMoreIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Summary Section - Always Visible */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {application.date_applied && (
            <Grid size={{ xs: 6, sm: 4 }}>
              <DetailRow label="Date Applied" value={formatDate(application.date_applied)} />
            </Grid>
          )}
          {application.date_granted && (
            <Grid size={{ xs: 6, sm: 4 }}>
              <DetailRow label="Date Granted" value={formatDate(application.date_granted)} />
            </Grid>
          )}
          {application.date_rejected && (
            <Grid size={{ xs: 6, sm: 4 }}>
              <DetailRow label="Date Rejected" value={formatDate(application.date_rejected)} />
            </Grid>
          )}
          {application.expiry_date && (
            <Grid size={{ xs: 6, sm: 4 }}>
              <DetailRow label="Expiry Date" value={formatDate(application.expiry_date)} />
            </Grid>
          )}
          {application.assigned_to_name && (
            <Grid size={{ xs: 6, sm: 4 }}>
              <DetailRow label="Assigned To" value={application.assigned_to_name} />
            </Grid>
          )}
          {application.transaction_reference_no && (
            <Grid size={{ xs: 12 }}>
              <DetailRow label="Reference Number" value={application.transaction_reference_no} />
            </Grid>
          )}
        </Grid>

        {/* Expanded Section */}
        <Collapse in={isExpanded}>
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            {/* Action Buttons in Header */}
            <Box 
              sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={handleViewDetails}
              >
                View Details
              </Button>
              <Protect permission="change_visaapplication">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={handleEditClick}
                >
                  Edit
                </Button>
              </Protect>
              <Protect permission="delete_visaapplication">
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteClick}
                >
                  Delete
                </Button>
              </Protect>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Additional Details */}
            <Grid container spacing={3}>
              {/* Financial Information */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Financial Information
                </Typography>
                <ExpandedDetailRow 
                  label="Immigration Fee" 
                  value={`${parseFloat(application.immigration_fee || '0').toLocaleString('en-US', { style: 'currency', currency: application.immigration_fee_currency || 'USD' })}`} 
                />
                <ExpandedDetailRow 
                  label="Service Fee" 
                  value={`${parseFloat(application.service_fee || '0').toLocaleString('en-US', { style: 'currency', currency: application.service_fee_currency || 'USD' })}`} 
                />
              </Grid>

              {/* Metadata */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Metadata
                </Typography>
                <ExpandedDetailRow label="Created At" value={formatDate(application.created_at)} />
                <ExpandedDetailRow label="Last Updated" value={formatDate(application.updated_at)} />
                {application.created_by_name && (
                  <ExpandedDetailRow label="Created By" value={application.created_by_name} />
                )}
              </Grid>

              {/* Notes */}
              {application.notes && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Notes
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {application.notes}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '90vh',
            },
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Edit Visa Application</Typography>
            <IconButton onClick={() => setEditDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <VisaApplicationForm
            mode="edit"
            initialData={application}
            onSave={handleSaveApplication}
            onCancel={() => setEditDialogOpen(false)}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this visa application? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={formLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={formLoading}
          >
            {formLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * ClientVisaApplications Component
 */
export const ClientVisaApplications = ({
  clientId,
  selectedApplicationId: initialSelectedId,
  onApplicationUpdate,
  onDetailClose,
  onCardClick
}: ClientVisaApplicationsProps) => {
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedApplicationId, setExpandedApplicationId] = useState<number | undefined>(initialSelectedId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch visa application data
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getVisaApplications(clientId, abortController.signal);
        if (isMounted) {
          // Sort by created_at (most recent first)
          const sorted = data.sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setApplications(sorted); }}catch (err) {
        if ((err as Error).name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError((err as Error).message || 'Failed to load visa applications'); }}finally {
        if (isMounted) {
          setIsLoading(false); }}};

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [clientId]);

  // Update expanded application when prop changes (from URL params)
  useEffect(() => {
    if (initialSelectedId !== undefined) {
      setExpandedApplicationId(initialSelectedId);
    }
  }, [initialSelectedId]);

  const handleCardExpand = (applicationId: number) => {
    // Only one card can be expanded at a time
    setExpandedApplicationId(applicationId);
    if (onCardClick) {
      onCardClick(applicationId);
    }
  };

  const handleCardCollapse = () => {
    setExpandedApplicationId(undefined);
    if (onDetailClose) {
      onDetailClose();
    }
  };

  const handleApplicationDelete = (applicationId: number) => {
    // Remove from list and collapse if it was expanded
    setApplications(applications.filter(app => app.id !== applicationId));
    if (expandedApplicationId === applicationId) {
      setExpandedApplicationId(undefined);
      if (onDetailClose) {
        onDetailClose();
      }
    }
    handleApplicationUpdate();
  };

  const handleApplicationUpdate = () => {
    // Refresh the applications list
    const fetchData = async () => {
      try {
        const data = await getVisaApplications(clientId);
        const sorted = data.sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setApplications(sorted);
      } catch (err) {
        console.error('Failed to refresh applications:', err); }};
    fetchData();

    if (onApplicationUpdate) {
      onApplicationUpdate(); }};

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleCreateApplication = async (data: any) => {
    try {
      setFormLoading(true);
      // Ensure client_id is set
      const applicationData = { ...data, client_id: clientId };
      await createVisaApplication(applicationData);

      // Refresh the applications list
      handleApplicationUpdate();

      // Close the dialog
      setCreateDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to create visa application:', err);
      throw err; // Let the form handle the error
    } finally {
      setFormLoading(false); }};

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visa Applications
        </Typography>
        <VisaApplicationsSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visa Applications
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Visa Applications</Typography>
        <Protect permission="add_client">
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            New Visa Application
          </Button>
        </Protect>
      </Box>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary', }}>
          <Typography variant="body1" gutterBottom>
            No visa applications yet
          </Typography>
          <Protect permission={'add_client'}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a visa application for this client
            </Typography>
          </Protect>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {applications.length} visa application
            {applications.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {applications.map((application) => (
            <VisaApplicationCard 
              key={application.id} 
              application={application}
              isExpanded={expandedApplicationId === application.id}
              onExpand={() => handleCardExpand(application.id)}
              onCollapse={handleCardCollapse}
              onDelete={handleApplicationDelete}
              onUpdate={handleApplicationUpdate}
            />
          ))}
        </>
      )}

      {/* Create Visa Application Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '90vh',
            },
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">New Visa Application</Typography>
            <IconButton onClick={handleCloseCreateDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <VisaApplicationForm
            mode="add"
            initialData={{ client: clientId } as any}
            onSave={handleCreateApplication}
            onCancel={handleCloseCreateDialog}
            loading={formLoading}
            clientLocked={true}
          />
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default ClientVisaApplications;
