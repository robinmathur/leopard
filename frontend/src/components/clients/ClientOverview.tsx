/**
 * ClientOverview Component
 * Displays comprehensive client overview with essential information
 */
import { Box, Grid, Typography, Chip, Paper, Divider, Skeleton } from '@mui/material';
import { Client, STAGE_LABELS, STAGE_COLORS, GENDER_LABELS, COUNTRIES } from '@/types/client';
import { ProfilePictureUpload } from './ProfilePictureUpload';

interface ClientOverviewProps {
  client: Client;
  loading?: boolean;
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
    return dateString;
  }
};

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
      <Grid item xs={12} md={3}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Skeleton variant="circular" width={120} height={120} />
          <Skeleton variant="text" width={150} sx={{ mt: 2 }} />
        </Box>
      </Grid>
      <Grid item xs={12} md={9}>
        <Grid container spacing={2}>
          {[...Array(8)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
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
export const ClientOverview = ({ client, loading = false }: ClientOverviewProps) => {
  if (loading) {
    return <ClientOverviewSkeleton />;
  }

  const fullName = [client.first_name, client.middle_name, client.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Profile Picture Section */}
        <Grid item xs={12} md={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Profile Picture Upload with validation */}
            <ProfilePictureUpload
              clientId={client.id}
              clientName={fullName}
              size={120}
              editable={true}
            />
            <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
              {fullName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip
                label={STAGE_LABELS[client.stage]}
                color={STAGE_COLORS[client.stage]}
                size="small"
              />
              {!client.active && (
                <Chip label="Archived" color="default" size="small" variant="outlined" />
              )}
            </Box>
          </Box>
        </Grid>

        {/* Client Details Section */}
        <Grid item xs={12} md={9}>
          {/* Personal Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Personal Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="First Name" value={client.first_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Last Name" value={client.last_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Gender" value={GENDER_LABELS[client.gender]} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Date of Birth" value={formatDate(client.dob)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Country" value={getCountryName(client.country)} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Contact Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <DetailRow label="Email" value={client.email} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DetailRow label="Phone Number" value={client.phone_number} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Assignment & Status */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Assignment & Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
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
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Assigned To" value={client.assigned_to_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Agent" value={client.agent_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Visa Category" value={client.visa_category_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Last Updated" value={formatDate(client.updated_at)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
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
