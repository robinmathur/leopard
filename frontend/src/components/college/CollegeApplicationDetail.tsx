/**
 * CollegeApplicationDetail Component
 * Displays comprehensive details of a college application with edit functionality
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Skeleton,
  Button,
  Chip,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SchoolIcon from '@mui/icons-material/School';
import {
  getCollegeApplication,
  updateCollegeApplication,
  deleteCollegeApplication,
  CollegeApplication,
} from '@/services/api/collegeApplicationApi';
import { CollegeApplicationForm } from '@/components/college/CollegeApplicationForm';
import { Protect } from '@/components/protected/Protect';

export interface CollegeApplicationDetailProps {
  /** College Application ID */
  collegeApplicationId: number;
  /** Optional: Pre-loaded application data to avoid fetching */
  initialApplication?: CollegeApplication;
  /** Callback when detail view should be closed */
  onClose?: () => void;
  /** Callback when application is updated */
  onUpdate?: () => void;
}

/**
 * Format date for display
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Format currency for display
 */
const formatCurrency = (amount: string): string => {
  if (!amount) return '-';
  try {
    const value = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  } catch {
    return amount;
  }
};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
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
const DetailSkeleton = () => (
  <Box>
    <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 1 }} />
    <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
    <Skeleton variant="text" width="80%" height={40} sx={{ mb: 2 }} />
    <Skeleton variant="text" width="70%" height={40} />
  </Box>
);

/**
 * CollegeApplicationDetail Component
 */
export const CollegeApplicationDetail = ({
  collegeApplicationId,
  initialApplication,
  onClose,
  onUpdate
}: CollegeApplicationDetailProps) => {
  const [application, setApplication] = useState<CollegeApplication | null>(initialApplication || null);
  const [isLoading, setIsLoading] = useState(!initialApplication);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch college application data only if not provided
  useEffect(() => {
    // Skip fetching if we already have initial data
    if (initialApplication) {
      setApplication(initialApplication);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getCollegeApplication(collegeApplicationId);
        if (!abortController.signal.aborted && isMounted) {
          setApplication(data);
        }
      } catch (err) {
        if ((err as Error).name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError((err as Error).message || 'Failed to load college application');
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [collegeApplicationId, initialApplication]);

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
  };

  const handleSaveApplication = async (data: any) => {
    if (!application) return;

    try {
      setFormLoading(true);
      await updateCollegeApplication(application.id, data);

      // Refresh the application data
      const updated = await getCollegeApplication(collegeApplicationId);
      setApplication(updated);

      setEditDialogOpen(false);

      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      console.error('Failed to update college application:', err);
      throw err; // Let the form handle the error
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!application) return;

    try {
      setFormLoading(true);
      await deleteCollegeApplication(application.id);

      // Close dialogs
      setDeleteDialogOpen(false);

      // Notify parent and close detail view
      if (onUpdate) {
        onUpdate();
      }
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to delete college application:', err);
      alert('Failed to delete college application. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">College Application Details</Typography>
        </Box>
        <DetailSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error || !application) {
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">College Application Details</Typography>
          {onClose && (
            <Button startIcon={<ArrowBackIcon />} onClick={onClose} size="small">
              Back to List
            </Button>
          )}
        </Box>
        <Alert severity="error">{error || 'College application not found'}</Alert>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ p: 3, mt: 3 }} elevation={2}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SchoolIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {application.course_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {application.institute_name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={application.stage_name}
              color={application.is_final_stage ? 'success' : 'primary'}
              size="medium"
            />
            {onClose && (
              <IconButton onClick={onClose} size="small" aria-label="Close">
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box>
            {onClose && (
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onClose}>
                Back to List
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Protect permission="change_collegeapplication">
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
              >
                Edit Application
              </Button>
            </Protect>
            <Protect permission="delete_collegeapplication">
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
              >
                Delete Application
              </Button>
            </Protect>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Application Details */}
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Basic Information
            </Typography>
            <DetailRow label="Client" value={application.client_name} />
            <DetailRow label="Application Type" value={application.application_type_title} />
            <DetailRow label="Current Stage" value={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={application.stage_name} color={application.is_final_stage ? 'success' : 'primary'} size="small" />
                {application.is_final_stage && <Typography variant="caption" color="text.secondary">(Final Stage)</Typography>}
              </Box>
            } />
          </Grid>

          {/* Institute & Course Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Institute & Course
            </Typography>
            <DetailRow label="Institute" value={application.institute_name} />
            <DetailRow label="Course" value={application.course_name} />
            <DetailRow label="Location" value={application.location_display} />
          </Grid>

          {/* Important Dates */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Important Dates
            </Typography>
            <DetailRow label="Intake Date" value={formatDate(application.intake_date)} />
            {application.finish_date && (
              <DetailRow label="Finish Date" value={formatDate(application.finish_date)} />
            )}
          </Grid>

          {/* Financial Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Financial Information
            </Typography>
            <DetailRow
              label="Total Tuition Fee"
              value={formatCurrency(application.total_tuition_fee)}
            />
            {application.student_id && (
              <DetailRow label="Student ID" value={application.student_id} />
            )}
          </Grid>

          {/* Agent Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Agent Information
            </Typography>
            {application.super_agent_name && (
              <DetailRow label="Super Agent" value={application.super_agent_name} />
            )}
            {application.sub_agent_name && (
              <DetailRow label="Sub Agent" value={application.sub_agent_name} />
            )}
            {!application.super_agent_name && !application.sub_agent_name && (
              <Typography variant="body2" color="text.secondary">No agents assigned</Typography>
            )}
          </Grid>

          {/* Assignment & Metadata */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Assignment & Metadata
            </Typography>
            {application.assigned_to_name && (
              <DetailRow label="Assigned To" value={application.assigned_to_name} />
            )}
            {application.created_by_name && (
              <DetailRow label="Created By" value={application.created_by_name} />
            )}
            <DetailRow label="Created At" value={formatDate(application.created_at)} />
            <DetailRow label="Last Updated" value={formatDate(application.updated_at)} />
          </Grid>

          {/* Notes */}
          {application.notes && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
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
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEdit}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Edit College Application</Typography>
            <IconButton onClick={handleCloseEdit} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <CollegeApplicationForm
            mode="edit"
            initialData={application}
            onSave={handleSaveApplication}
            onCancel={handleCloseEdit}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this college application? This action cannot be undone.
          </Typography>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, p: 2 }}>
          <Button onClick={handleDeleteCancel} disabled={formLoading}>
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
        </Box>
      </Dialog>
    </>
  );
};

export default CollegeApplicationDetail;
