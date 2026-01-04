/**
 * ClientOverview Component
 * Displays comprehensive client overview with essential information
 */
import { Box,  Typography, Chip, Paper, Divider, Skeleton , Grid} from '@mui/material';
import { Client, GENDER_LABELS, COUNTRIES, STAGE_LABELS, STAGE_COLORS } from '@/types/client';

interface ClientOverviewProps {
  client: Client;
  loading?: boolean;
  /** Optional header actions (e.g., Edit button) */
  headerActions?: React.ReactNode;
}

/**
 * Get country name from code
 */
const getCountryName = (code: string): string => {
  const country = COUNTRIES.find((c) => c.code === code);
  return country?.name || code;
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
export const ClientOverviewSkeleton = () => (
  <Paper sx={{ p: 3 }}>
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Skeleton variant="circular" width={120} height={120} />
          <Skeleton variant="text" width={150} sx={{ mt: 2 }}/>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 9 }}>
        <Grid container spacing={2}>
          {[...Array(8)].map((_, index) => (
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
 * ClientOverview component
 */
export const ClientOverview = ({ client, loading = false, headerActions }: ClientOverviewProps) => {
  if (loading) {
    return <ClientOverviewSkeleton />;
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header with optional actions */}
      {headerActions && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Client Profile</Typography>
          {headerActions}
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Client Details Section */}
        <Grid size={{ xs: 12 }}>
          {/* Personal Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Personal Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="First Name" value={client.first_name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Last Name" value={client.last_name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Gender" value={GENDER_LABELS[client.gender]} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Date of Birth" value={formatDate(client.dob)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Country" value={getCountryName(client.country)} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }}/>

          {/* Contact Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DetailRow label="Email" value={client.email} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DetailRow label="Phone Number" value={client.phone_number} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }}/>

          {/* Assignment & Status */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Assignment & Status
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow
                label="Stage"
                value={
                  <Chip
                    label={STAGE_LABELS[client.stage]}
                    color={STAGE_COLORS[client.stage]}
                    size="small"
                  />
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Assigned To" value={client.assigned_to_name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Agent" value={client.agent_name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Visa Category" value={client.visa_category_name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Last Updated" value={formatDate(client.updated_at)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow
                label="Status"
                value={client.active ? 'Active' : 'Archived'}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ClientOverview;
