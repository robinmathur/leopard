/**
 * CollegeApplicationOverview
 * Overview tab component displaying all application details
 */
import { Box, Grid, Paper, Typography, Chip, Divider } from '@mui/material';
import type { CollegeApplication } from '@/types/collegeApplication';

interface CollegeApplicationOverviewProps {
  application: CollegeApplication;
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

export const CollegeApplicationOverview = ({ application }: CollegeApplicationOverviewProps) => {
  return (
    <Box>
      {/* Quick Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Application Type
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {application.application_type_title}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Stage
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="h6" fontWeight={600}>
                {application.stage_name}
              </Typography>
              {application.is_final_stage && (
                <Chip label="Final" size="small" color="success" />
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Tuition Fee
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {formatCurrency(application.total_tuition_fee)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Intake Date
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {formatDate(application.intake_date)}
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
            <DetailRow label="Application Type" value={application.application_type_title} />
            <DetailRow label="Stage" value={application.stage_name} />
            <DetailRow label="Student ID" value={application.student_id || '-'} />
            <DetailRow label="Intake Date" value={formatDate(application.intake_date)} />
            {application.finish_date && (
              <DetailRow label="Finish Date" value={formatDate(application.finish_date)} />
            )}
            {application.assigned_to_name && (
              <DetailRow label="Assigned To" value={application.assigned_to_name} />
            )}
          </Paper>
        </Grid>

        {/* Institute & Course */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Institute & Course
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <DetailRow label="Institute" value={application.institute_name} />
            <DetailRow label="Course" value={application.course_name} />
            {application.location_display && (
              <DetailRow label="Location" value={application.location_display} />
            )}
            <DetailRow label="Tuition Fee" value={formatCurrency(application.total_tuition_fee)} />
          </Paper>
        </Grid>

        {/* Agents & Additional Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Agents & Additional Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {application.super_agent_name && (
              <DetailRow label="Super Agent" value={application.super_agent_name} />
            )}
            {application.sub_agent_name && (
              <DetailRow label="Sub Agent" value={application.sub_agent_name} />
            )}
            {!application.super_agent_name && !application.sub_agent_name && (
              <Typography variant="body2" color="text.secondary">
                No additional information
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

export default CollegeApplicationOverview;

