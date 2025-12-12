/**
 * ClientDetailPage
 * Full client detail view page
 */
import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Skeleton,
  Alert,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { useClientStore } from '@/store/clientStore';
import {
  STAGE_LABELS,
  STAGE_COLORS,
  GENDER_LABELS,
  COUNTRIES,
} from '@/types/client';
import { Protect } from '@/components/protected/Protect';

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
    <Typography variant="body1">{value || '-'}</Typography>
  </Box>
);

/**
 * Loading skeleton for detail page
 */
const LoadingSkeleton = () => (
  <Paper sx={{ p: 3 }}>
    <Grid container spacing={3}>
      {[...Array(12)].map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Skeleton variant="text" width={80} height={20} />
          <Skeleton variant="text" width="100%" height={28} />
        </Grid>
      ))}
    </Grid>
  </Paper>
);

export const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string })?.from || '/clients';
  const backLabel = fromPath === '/leads' ? 'Back to Leads' : 'Back to Clients';
  const { selectedClient, loading, error, fetchClientById, clearError } = useClientStore();

  // Fetch client on mount
  useEffect(() => {
    if (id) {
      fetchClientById(parseInt(id, 10));
    }
    return () => {
      clearError();
    };
  }, [id, fetchClientById, clearError]);

  const handleBack = () => {
    navigate(fromPath);
  };

  const handleEdit = () => {
    // Navigate back to origin page where edit dialog can be opened
    // In a more complex app, we might open an edit page or modal here
    navigate(fromPath, { state: { editClientId: id } });
  };

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }}>
            {backLabel}
          </Button>
          <Skeleton variant="text" width={200} height={40} />
        </Box>
        <LoadingSkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
            {backLabel}
          </Button>
        </Box>
        <Alert severity="error">{error.message || 'Failed to load client'}</Alert>
      </Box>
    );
  }

  if (!selectedClient) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
            {backLabel}
          </Button>
        </Box>
        <Alert severity="warning">Client not found</Alert>
      </Box>
    );
  }

  const client = selectedClient;
  const fullName = [client.first_name, client.middle_name, client.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }}>
            {backLabel}
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              {fullName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
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
        </Box>
        <Protect permission="edit_client">
          <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit}>
            Edit Client
          </Button>
        </Protect>
      </Box>

      {/* Client Details */}
      <Paper sx={{ p: 3 }}>
        {/* Personal Information */}
        <Typography variant="h6" gutterBottom>
          Personal Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <DetailRow label="First Name" value={client.first_name} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DetailRow label="Middle Name" value={client.middle_name} />
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

        <Divider sx={{ my: 3 }} />

        {/* Contact Information */}
        <Typography variant="h6" gutterBottom>
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

        <Divider sx={{ my: 3 }} />

        {/* Address */}
        <Typography variant="h6" gutterBottom>
          Address
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <DetailRow label="Street" value={client.street} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DetailRow label="Suburb" value={client.suburb} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DetailRow label="State" value={client.state} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DetailRow label="Postcode" value={client.postcode} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DetailRow label="Country" value={getCountryName(client.country)} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Assignment & Status */}
        <Typography variant="h6" gutterBottom>
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
            <DetailRow label="Referred By" value={client.referred_by} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DetailRow
              label="Status"
              value={client.active ? 'Active' : 'Archived'}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Notes */}
        <Typography variant="h6" gutterBottom>
          Notes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          {client.description || 'No notes available'}
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Audit Information */}
        <Typography variant="h6" gutterBottom>
          Audit Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <DetailRow label="Created By" value={client.created_by_name} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DetailRow label="Created At" value={formatDate(client.created_at)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DetailRow label="Last Updated" value={formatDate(client.updated_at)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DetailRow label="Client ID" value={`#${client.id}`} />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ClientDetailPage;
