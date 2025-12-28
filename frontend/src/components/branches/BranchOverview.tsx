/**
 * BranchOverview Component
 * Displays comprehensive branch overview with essential information
 */
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Paper, Divider, Skeleton, Link } from '@mui/material';
import { Branch } from '@/types/branch';

interface BranchOverviewProps {
  branch: Branch;
  loading?: boolean;
}

/**
 * Get country name from code
 */
const getCountryName = (code?: string): string => {
  if (!code) return '-';
  const COUNTRIES = [
    { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
    { code: 'PH', name: 'Philippines' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
  ];
  const country = COUNTRIES.find((c) => c.code === code);
  return country ? country.name : code;
};

/**
 * Format date string
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Detail row component
 */
interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.5 }}>
      {value || '-'}
    </Typography>
  </Box>
);

/**
 * BranchOverview skeleton loader
 */
export const BranchOverviewSkeleton = () => (
  <Paper sx={{ p: 3 }}>
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={24} sx={{ mt: 2 }} />
        <Skeleton variant="text" width="50%" height={24} sx={{ mt: 1 }} />
      </Grid>
    </Grid>
  </Paper>
);

/**
 * BranchOverview component
 */
export const BranchOverview = ({ branch, loading = false }: BranchOverviewProps) => {
  const navigate = useNavigate();

  if (loading) {
    return <BranchOverviewSkeleton />;
  }

  const addressParts = [
    branch.street,
    branch.suburb,
    branch.state,
    branch.postcode,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Branch Details Section */}
        <Grid item xs={12}>
          {/* Basic Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Branch Name" value={branch.name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow
                label="Region"
                value={
                  branch.region && branch.region_name ? (
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => navigate(`/org-management/regions/${branch.region}`, { state: { from: '/org-management/regions' } })}
                      sx={{
                        color: 'primary.main',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                        cursor: 'pointer',
                      }}
                    >
                      {branch.region_name}
                    </Link>
                  ) : (
                    '-'
                  )
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Contact Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            {branch.phone && (
              <Grid item xs={12} sm={6} md={4}>
                <DetailRow label="Phone" value={branch.phone} />
              </Grid>
            )}
            {branch.website && (
              <Grid item xs={12} sm={6} md={4}>
                <DetailRow
                  label="Website"
                  value={
                    <a href={branch.website} target="_blank" rel="noopener noreferrer">
                      {branch.website}
                    </a>
                  }
                />
              </Grid>
            )}
          </Grid>

          {(branch.street || branch.suburb || branch.state || branch.postcode || branch.country) && (
            <>
              <Divider sx={{ my: 2 }} />

              {/* Address Information */}
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Address Information
              </Typography>
              <Grid container spacing={2}>
                {fullAddress && (
                  <Grid item xs={12}>
                    <DetailRow label="Full Address" value={fullAddress} />
                  </Grid>
                )}
                {branch.street && (
                  <Grid item xs={12}>
                    <DetailRow label="Street Address" value={branch.street} />
                  </Grid>
                )}
                <Grid item xs={12} sm={6} md={4}>
                  <DetailRow label="Suburb" value={branch.suburb} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <DetailRow label="State/Province" value={branch.state} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <DetailRow label="Postcode" value={branch.postcode} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <DetailRow label="Country" value={getCountryName(branch.country)} />
                </Grid>
              </Grid>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Audit Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Audit Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Created By" value={branch.created_by_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Created At" value={formatDate(branch.created_at)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Updated By" value={branch.updated_by_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Last Updated" value={formatDate(branch.updated_at)} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BranchOverview;

