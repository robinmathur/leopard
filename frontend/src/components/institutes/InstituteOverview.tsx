/**
 * InstituteOverview Component
 * Displays comprehensive institute overview with essential information
 */
import { Box, Grid, Typography, Paper, Skeleton } from '@mui/material';
import { Institute } from '@/types/institute';

interface InstituteOverviewProps {
  institute: Institute;
  loading?: boolean;
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
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2">{value || '-'}</Typography>
  </Box>
);

/**
 * Loading skeleton for overview section
 */
export const InstituteOverviewSkeleton = () => (
  <Paper sx={{ p: 3 }}>
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="text" width={150} height={24} sx={{ mt: 1 }}/>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={2}>
          {[...Array(6)].map((_, index) => (
            <Grid key={index}size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="text" width={80} height={20} />
              <Skeleton variant="text" width="100%" height={28} />
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  </Paper>
);

/**
 * InstituteOverview component
 */
export const InstituteOverview = ({ institute, loading = false }: InstituteOverviewProps) => {
  if (loading) {
    return <InstituteOverviewSkeleton />;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Institute Details Section */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Name" value={institute.name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Short Name" value={institute.short_name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Phone" value={institute.phone} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Website" value={institute.website} />
            </Grid>
          </Grid>
        </Grid>

        {/* Audit Information */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Audit Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Created By" value={institute.created_by_name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Created At" value={formatDate(institute.created_at)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Updated By" value={institute.updated_by_name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Last Updated" value={formatDate(institute.updated_at)} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default InstituteOverview;
