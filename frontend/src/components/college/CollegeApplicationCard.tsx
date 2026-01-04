/**
 * CollegeApplicationCard
 * Card component for displaying college application summary
 */
import {
  Box,
  Paper,
  Typography,
  Chip,
  Grid,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { CollegeApplication } from '@/types/collegeApplication';

interface CollegeApplicationCardProps {
  application: CollegeApplication;
  isSelected?: boolean;
  onClick: () => void;
}

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
    return amount; }};

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
 * CollegeApplicationCard Component
 */
export const CollegeApplicationCard = ({
  application,
  isSelected = false,
  onClick
}: CollegeApplicationCardProps) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        bgcolor: isSelected ? 'action.selected' : 'background.paper',
        '&:hover': {
          boxShadow: 2,
          cursor: 'pointer',
        },
        transition: 'all 0.2s ease-in-out', }}onClick={onClick}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <SchoolIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {application.course_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {application.institute_name}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={application.stage_name}
          color={application.is_final_stage ? 'success' : 'primary'}
          size="small"
        />
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <DetailRow label="Application Type" value={application.application_type_title} />
        </Grid>
        {application.location_display && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Location" value={application.location_display} />
          </Grid>
        )}
        <Grid size={{ xs: 6, sm: 4 }}>
          <DetailRow label="Intake Date" value={formatDate(application.intake_date)} />
        </Grid>
        {application.finish_date && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Finish Date" value={formatDate(application.finish_date)} />
          </Grid>
        )}
        <Grid size={{ xs: 6, sm: 4 }}>
          <DetailRow label="Tuition Fee" value={formatCurrency(application.total_tuition_fee)} />
        </Grid>
        {application.assigned_to_name && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Assigned To" value={application.assigned_to_name} />
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default CollegeApplicationCard;
