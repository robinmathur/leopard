/**
 * VisaApplicationOverview
 * Overview tab component displaying all visa application details
 */
import { Box, Grid, Paper, Typography, Chip, Divider } from '@mui/material';
import type { VisaApplication, VisaApplicationStatus } from '@/services/api/visaApplicationApi';

interface VisaApplicationOverviewProps {
  application: VisaApplication;
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

export const VisaApplicationOverview = ({ application }: VisaApplicationOverviewProps) => {
  return (
    <Box>
      {/* Quick Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Visa Type
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {application.visa_type_name}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                label={STATUS_LABELS[application.status]}
                color={STATUS_COLORS[application.status]}
                size="small"
              />
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Immigration Fee
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {formatCurrency(application.immigration_fee, application.immigration_fee_currency)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Service Fee
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {formatCurrency(application.service_fee, application.service_fee_currency)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Details */}
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <DetailRow label="Client" value={application.client_name} />
            <DetailRow label="Visa Type" value={application.visa_type_name} />
            <DetailRow label="Visa Category" value={application.visa_category_name} />
            <DetailRow 
              label="Status" 
              value={
                <Chip
                  label={STATUS_LABELS[application.status]}
                  color={STATUS_COLORS[application.status]}
                  size="small"
                />
              } 
            />
            <DetailRow label="Dependent Application" value={application.dependent ? 'Yes' : 'No'} />
            {application.transaction_reference_no && (
              <DetailRow label="Transaction Reference Number" value={application.transaction_reference_no} />
            )}
            {application.assigned_to_name && (
              <DetailRow label="Assigned To" value={application.assigned_to_name} />
            )}
          </Paper>
        </Grid>

        {/* Financial Information */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Financial Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <DetailRow
              label="Immigration Fee"
              value={formatCurrency(application.immigration_fee, application.immigration_fee_currency)}
            />
            <DetailRow
              label="Service Fee"
              value={formatCurrency(application.service_fee, application.service_fee_currency)}
            />
          </Paper>
        </Grid>

        {/* Important Dates */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Important Dates
            </Typography>
            <Divider sx={{ mb: 2 }} />
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
            {!application.date_opened && !application.date_applied && !application.date_granted && 
             !application.date_rejected && !application.date_withdrawn && !application.expiry_date && (
              <Typography variant="body2" color="text.secondary">
                No dates recorded
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Metadata */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Metadata
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {application.created_by_name && (
              <DetailRow label="Created By" value={application.created_by_name} />
            )}
            <DetailRow label="Created At" value={formatDate(application.created_at)} />
            <DetailRow label="Last Updated" value={formatDate(application.updated_at)} />
          </Paper>
        </Grid>

        {/* Notes */}
        {application.notes && (
          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Notes
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {application.notes}
                </Typography>
              </Paper>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default VisaApplicationOverview;

