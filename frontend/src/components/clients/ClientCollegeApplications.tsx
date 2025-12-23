/**
 * ClientCollegeApplications Component
 * Displays college/institute applications for a client
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
import SchoolIcon from '@mui/icons-material/School';
import { getApplications, Application } from '@/services/api/applicationApi';

export interface ClientCollegeApplicationsProps {
  /** Client ID */
  clientId: number;
}

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
const ApplicationsSkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * College application card
 */
const ApplicationCard = ({ application }: { application: Application }) => {
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
        // TODO: Navigate to application detail
        alert(`Navigate to Application ${application.id} - Coming in future enhancement`);
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <SchoolIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {application.course?.name || 'Course'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {application.institute?.name || 'Institute'}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={application.stage?.title || 'Stage'}
          color="primary"
          size="small"
        />
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={6} sm={4}>
          <DetailRow label="Application Type" value={application.application_type?.title} />
        </Grid>
        {application.location?.title && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Location" value={application.location.title} />
          </Grid>
        )}
        {application.start_date?.title && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Intake" value={application.start_date.title} />
          </Grid>
        )}
        {application.finish_date && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Finish Date" value={formatDate(application.finish_date)} />
          </Grid>
        )}
        {application.total_tuition_fee && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Tuition Fee" value={`$${application.total_tuition_fee}`} />
          </Grid>
        )}
        {application.assigned_to?.full_name && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Assigned To" value={application.assigned_to.full_name} />
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

/**
 * ClientCollegeApplications Component
 */
export const ClientCollegeApplications = ({ clientId }: ClientCollegeApplicationsProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch application data
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getApplications(clientId, abortController.signal);
        if (isMounted) {
          // Sort by created_at (most recent first)
          const sorted = data.sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setApplications(sorted);
        }
      } catch (err) {
        if ((err as Error).name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError((err as Error).message || 'Failed to load applications');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [clientId]);

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          College Applications
        </Typography>
        <ApplicationsSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          College Applications
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">College Applications</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            // TODO: Open application add form
            alert('New Application form - Coming in future enhancement');
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
            No college applications yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a college application for this client
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // TODO: Open application add form
              alert('New Application form - Coming in future enhancement');
            }}
          >
            New Application
          </Button>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {applications.length} application
            {applications.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </>
      )}
    </Paper>
  );
};

export default ClientCollegeApplications;
