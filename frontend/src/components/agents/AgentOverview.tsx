/**
 * AgentOverview Component
 * Displays comprehensive agent overview with essential information
 */
import { Box, Grid, Typography, Chip, Paper, Divider, Skeleton, Link } from '@mui/material';
import { Agent, AGENT_TYPE_LABELS, COUNTRIES } from '@/types/agent';

interface AgentOverviewProps {
  agent: Agent;
  loading?: boolean;
}

/**
 * Get country name from code
 */
const getCountryName = (code?: string): string => {
  if (!code) return '-';
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
 * AgentOverview skeleton loader
 */
export const AgentOverviewSkeleton = () => (
  <Paper sx={{ p: 3 }}>
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Skeleton variant="rectangular" width="100%" height={200} />
      </Grid>
      <Grid item xs={12} md={8}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={24} sx={{ mt: 2 }} />
        <Skeleton variant="text" width="50%" height={24} sx={{ mt: 1 }} />
      </Grid>
    </Grid>
  </Paper>
);

/**
 * AgentOverview component
 */
export const AgentOverview = ({ agent, loading = false }: AgentOverviewProps) => {
  if (loading) {
    return <AgentOverviewSkeleton />;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Agent Details Section */}
        <Grid item xs={12}>
          {/* Basic Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Agent Name" value={agent.agent_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow
                label="Agent Type"
                value={
                  <Chip
                    label={agent.agent_type_display || AGENT_TYPE_LABELS[agent.agent_type]}
                    size="small"
                    color={agent.agent_type === 'SUPER_AGENT' ? 'primary' : 'default'}
                    variant="outlined"
                  />
                }
              />
            </Grid>
            {agent.description && (
              <Grid item xs={12}>
                <DetailRow label="Description" value={agent.description} />
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Contact Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Email" value={agent.email} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Phone Number" value={agent.phone_number} />
            </Grid>
            {agent.website && (
              <Grid item xs={12} sm={6} md={4}>
                <DetailRow
                  label="Website"
                  value={
                    <Link href={agent.website} target="_blank" rel="noopener noreferrer">
                      {agent.website}
                    </Link>
                  }
                />
              </Grid>
            )}
            {agent.invoice_to && (
              <Grid item xs={12} sm={6} md={4}>
                <DetailRow label="Invoice To" value={agent.invoice_to} />
              </Grid>
            )}
          </Grid>

          {(agent.street || agent.suburb || agent.state || agent.postcode || agent.country) && (
            <>
              <Divider sx={{ my: 2 }} />

              {/* Address Information */}
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Address Information
              </Typography>
              <Grid container spacing={2}>
                {agent.street && (
                  <Grid item xs={12}>
                    <DetailRow label="Street Address" value={agent.street} />
                  </Grid>
                )}
                <Grid item xs={12} sm={6} md={4}>
                  <DetailRow label="Suburb" value={agent.suburb} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <DetailRow label="State/Province" value={agent.state} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <DetailRow label="Postcode" value={agent.postcode} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <DetailRow label="Country" value={getCountryName(agent.country)} />
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
              <DetailRow label="Created By" value={agent.created_by_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Created At" value={formatDate(agent.created_at)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Updated By" value={agent.updated_by_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DetailRow label="Last Updated" value={formatDate(agent.updated_at)} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AgentOverview;
