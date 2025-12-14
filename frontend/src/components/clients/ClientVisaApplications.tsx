/**
 * ClientVisaApplications Component
 * Displays visa applications for a client
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { getVisaApplications, VisaApplication, VisaApplicationStatus } from '@/services/api/visaApplicationApi';

export interface ClientVisaApplicationsProps {
  /** Client ID */
  clientId: number;
}

/**
 * Status color mapping
 */
const STATUS_COLORS: Record<VisaApplicationStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  TO_BE_APPLIED: 'default',
  APPLIED: 'info',
  OPEN: 'warning',
  GRANTED: 'success',
  REJECTED: 'error',
  WITHDRAWN: 'default',
};

/**
 * Status labels
 */
const STATUS_LABELS: Record<VisaApplicationStatus, string> = {
  TO_BE_APPLIED: 'To Be Applied',
  APPLIED: 'Applied',
  OPEN: 'Open',
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
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

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
 * Loading skeleton
 */
const VisaApplicationsSkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Visa application card
 */
const VisaApplicationCard = ({ application }: { application: VisaApplication }) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        '&:hover': {
          boxShadow: 2,
          cursor: 'pointer',
        },
      }}
      onClick={() => {
        // TODO: Navigate to visa application detail
        alert(`Navigate to Visa Application ${application.id} - Coming in future enhancement`);
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <FlightTakeoffIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {application.visa_type_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {application.visa_category_name}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={STATUS_LABELS[application.status]}
          color={STATUS_COLORS[application.status]}
          size="small"
        />
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {application.date_applied && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Date Applied" value={formatDate(application.date_applied)} />
          </Grid>
        )}
        {application.date_granted && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Date Granted" value={formatDate(application.date_granted)} />
          </Grid>
        )}
        {application.date_rejected && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Date Rejected" value={formatDate(application.date_rejected)} />
          </Grid>
        )}
        {application.expiry_date && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Expiry Date" value={formatDate(application.expiry_date)} />
          </Grid>
        )}
        {application.assigned_to_name && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Assigned To" value={application.assigned_to_name} />
          </Grid>
        )}
        {application.transaction_reference_no && (
          <Grid item xs={12}>
            <DetailRow label="Reference Number" value={application.transaction_reference_no} />
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

/**
 * ClientVisaApplications Component
 */
export const ClientVisaApplications = ({ clientId }: ClientVisaApplicationsProps) => {
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch visa application data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getVisaApplications(clientId);
        // Sort by created_at (most recent first)
        const sorted = data.sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setApplications(sorted);
      } catch (err) {
        setError((err as Error).message || 'Failed to load visa applications');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visa Applications
        </Typography>
        <VisaApplicationsSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visa Applications
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Visa Applications</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            // TODO: Open visa application add form
            alert('New Visa Application form - Coming in future enhancement');
          }}
        >
          New Application
        </Button>
      </Box>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No visa applications yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a visa application for this client
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // TODO: Open visa application add form
              alert('New Visa Application form - Coming in future enhancement');
            }}
          >
            New Application
          </Button>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {applications.length} visa application
            {applications.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {applications.map((application) => (
            <VisaApplicationCard key={application.id} application={application} />
          ))}
        </>
      )}
    </Paper>
  );
};

export default ClientVisaApplications;
