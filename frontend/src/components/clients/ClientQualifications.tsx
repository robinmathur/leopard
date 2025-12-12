/**
 * ClientQualifications Component
 * Displays and manages educational qualifications for a client
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Alert,
  Skeleton,
  Button,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import { getQualifications, Qualification } from '@/services/api/qualificationApi';
import { COUNTRIES } from '@/types/client';

export interface ClientQualificationsProps {
  /** Client ID */
  clientId: number;
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2">{value || '-'}</Typography>
  </Box>
);

/**
 * Loading skeleton
 */
const QualificationsSkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Qualification card
 */
const QualificationCard = ({ qualification }: { qualification: Qualification }) => {
  const isInProgress = !qualification.completion_date;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        '&:hover': {
          boxShadow: 1,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <SchoolIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {qualification.course}
            </Typography>
            {qualification.institute && (
              <Typography variant="body2" color="text.secondary">
                {qualification.institute}
              </Typography>
            )}
          </Box>
        </Box>
        {isInProgress && (
          <Chip label="In Progress" color="info" size="small" />
        )}
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={6} sm={4}>
          <DetailRow label="Country" value={getCountryName(qualification.country)} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <DetailRow label="Start Date" value={formatDate(qualification.enroll_date)} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <DetailRow
            label="Completion Date"
            value={
              isInProgress ? (
                <Chip label="In Progress" size="small" color="info" variant="outlined" />
              ) : (
                formatDate(qualification.completion_date)
              )
            }
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

/**
 * ClientQualifications Component
 */
export const ClientQualifications = ({ clientId }: ClientQualificationsProps) => {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch qualification data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getQualifications(clientId);
        // Sort by start date (most recent first)
        const sorted = data.sort((a, b) => {
          if (!a.enroll_date) return 1;
          if (!b.enroll_date) return -1;
          return new Date(b.enroll_date).getTime() - new Date(a.enroll_date).getTime();
        });
        setQualifications(sorted);
      } catch (err) {
        setError((err as Error).message || 'Failed to load qualifications');
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
          Educational Qualifications
        </Typography>
        <QualificationsSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Educational Qualifications
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Educational Qualifications</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            // TODO: Open qualification add form
            alert('Add Qualification form - Coming in future enhancement');
          }}
        >
          Add Qualification
        </Button>
      </Box>

      {/* Qualifications List */}
      {qualifications.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No qualifications recorded
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add educational qualifications for this client
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // TODO: Open qualification add form
              alert('Add Qualification form - Coming in future enhancement');
            }}
          >
            Add Qualification
          </Button>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {qualifications.length} qualification
            {qualifications.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {qualifications.map((qualification) => (
            <QualificationCard key={qualification.id} qualification={qualification} />
          ))}
        </>
      )}
    </Paper>
  );
};

export default ClientQualifications;
