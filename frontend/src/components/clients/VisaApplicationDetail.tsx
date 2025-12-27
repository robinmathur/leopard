/**
 * VisaApplicationDetail Component
 * Displays comprehensive details of a visa application with edit functionality
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
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { getVisaApplication, VisaApplication, VisaApplicationStatus } from '@/services/api/visaApplicationApi';
import { VisaApplicationForm } from '@/components/visa/VisaApplicationForm';
import { updateVisaApplication } from '@/services/api/visaApplicationApi';
import { Protect } from '@/components/protected/Protect';

export interface VisaApplicationDetailProps {
  /** Visa Application ID */
  visaApplicationId: number;
  /** Callback when detail view should be closed */
  onClose?: () => void;
  /** Callback when application is updated */
  onUpdate?: () => void;
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
const formatCurrency = (amount: string, currency: string): string => {
  if (!amount) return '-';
  try {
    const value = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  } catch {
    return `${amount} ${currency}`;
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
 * VisaApplicationDetail Component
 */
export const VisaApplicationDetail = ({ visaApplicationId, onClose, onUpdate }: VisaApplicationDetailProps) => {
  const [application, setApplication] = useState<VisaApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch visa application data
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getVisaApplication(visaApplicationId);
        if (!abortController.signal.aborted && isMounted) {
          setApplication(data);
        }
      } catch (err) {
        if ((err as Error).name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError((err as Error).message || 'Failed to load visa application');
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
  }, [visaApplicationId]);

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
      await updateVisaApplication(application.id, data);
      
      // Refresh the application data
      const updated = await getVisaApplication(visaApplicationId);
      setApplication(updated);
      
      setEditDialogOpen(false);
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      console.error('Failed to update visa application:', err);
      throw err; // Let the form handle the error
    } finally {
      setFormLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Visa Application Details</Typography>
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
          <Typography variant="h6">Visa Application Details</Typography>
          {onClose && (
            <Button startIcon={<ArrowBackIcon />} onClick={onClose} size="small">
              Back to List
            </Button>
          )}
        </Box>
        <Alert severity="error">{error || 'Visa application not found'}</Alert>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ p: 3, mt: 3 }} elevation={2}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FlightTakeoffIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {application.visa_type_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {application.visa_category_name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={STATUS_LABELS[application.status]}
              color={STATUS_COLORS[application.status]}
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
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Protect permission="edit_client">
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit Application
            </Button>
          </Protect>
          {onClose && (
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onClose}>
              Back to List
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Application Details */}
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Basic Information
            </Typography>
            <DetailRow label="Visa Type" value={application.visa_type_name} />
            <DetailRow label="Visa Category" value={application.visa_category_name} />
            <DetailRow label="Status" value={<Chip label={STATUS_LABELS[application.status]} color={STATUS_COLORS[application.status]} size="small" />} />
            <DetailRow label="Dependent Application" value={application.dependent ? 'Yes' : 'No'} />
            {application.transaction_reference_no && (
              <DetailRow label="Transaction Reference Number" value={application.transaction_reference_no} />
            )}
          </Grid>

          {/* Financial Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Financial Information
            </Typography>
            <DetailRow
              label="Immigration Fee"
              value={formatCurrency(application.immigration_fee, application.immigration_fee_currency)}
            />
            <DetailRow
              label="Service Fee"
              value={formatCurrency(application.service_fee, application.service_fee_currency)}
            />
          </Grid>

          {/* Important Dates */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Important Dates
            </Typography>
            {application.date_opened && (
              <DetailRow label="Date Opened" value={formatDate(application.date_opened)} />
            )}
            {application.date_applied && (
              <DetailRow label="Date Applied" value={formatDate(application.date_applied)} />
            )}
            {application.date_granted && (
              <DetailRow label="Date Granted" value={formatDate(application.date_granted)} />
            )}
            {application.date_rejected && (
              <DetailRow label="Date Rejected" value={formatDate(application.date_rejected)} />
            )}
            {application.date_withdrawn && (
              <DetailRow label="Date Withdrawn" value={formatDate(application.date_withdrawn)} />
            )}
            {application.expiry_date && (
              <DetailRow label="Expiry Date" value={formatDate(application.expiry_date)} />
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

          {/* Required Documents */}
          {application.required_documents && application.required_documents.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Required Documents
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {application.required_documents.map((doc, index) => (
                  <Chip key={index} label={doc} size="small" variant="outlined" />
                ))}
              </Box>
            </Grid>
          )}

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
            <Typography variant="h6">Edit Visa Application</Typography>
            <IconButton onClick={handleCloseEdit} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <VisaApplicationForm
            mode="edit"
            initialData={application}
            onSave={handleSaveApplication}
            onCancel={handleCloseEdit}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VisaApplicationDetail;

