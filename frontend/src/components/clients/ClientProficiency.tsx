/**
 * ClientProficiency Component
 * Displays and manages language proficiency test results for a client
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
  Divider,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getProficiencies, Proficiency } from '@/services/api/proficiencyApi';

export interface ClientProficiencyProps {
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
 * Format score for display
 */
const formatScore = (score?: number): string => {
  if (score === undefined || score === null) return '-';
  return score.toFixed(1);
};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500}>
      {value || '-'}
    </Typography>
  </Box>
);

/**
 * Loading skeleton
 */
const ProficiencySkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Proficiency test card
 */
const ProficiencyCard = ({ proficiency }: { proficiency: Proficiency }) => {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {proficiency.test_name?.name || 'Language Test'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Test Date: {formatDate(proficiency.test_date)}
          </Typography>
        </Box>
        {proficiency.overall_score && (
          <Chip
            label={`Overall: ${formatScore(proficiency.overall_score)}`}
            color="primary"
            size="small"
          />
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Component Scores
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <DetailRow label="Reading" value={formatScore(proficiency.reading_score)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DetailRow label="Writing" value={formatScore(proficiency.writing_score)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DetailRow label="Speaking" value={formatScore(proficiency.speaking_score)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DetailRow label="Listening" value={formatScore(proficiency.listening_score)} />
        </Grid>
      </Grid>
    </Paper>
  );
};

/**
 * ClientProficiency Component
 */
export const ClientProficiency = ({ clientId }: ClientProficiencyProps) => {
  const [proficiencies, setProficiencies] = useState<Proficiency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch proficiency data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getProficiencies(clientId);
        // Sort by test date (most recent first)
        const sorted = data.sort((a, b) => {
          if (!a.test_date) return 1;
          if (!b.test_date) return -1;
          return new Date(b.test_date).getTime() - new Date(a.test_date).getTime();
        });
        setProficiencies(sorted);
      } catch (err) {
        setError((err as Error).message || 'Failed to load language proficiency data');
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
          Language Proficiency
        </Typography>
        <ProficiencySkeleton />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Language Proficiency
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Language Proficiency</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            // TODO: Open proficiency add form
            alert('Add Test Result form - Coming in future enhancement');
          }}
        >
          Add Test Result
        </Button>
      </Box>

      {/* Proficiency List */}
      {proficiencies.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No language proficiency tests recorded
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add language test results for this client
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // TODO: Open proficiency add form
              alert('Add Test Result form - Coming in future enhancement');
            }}
          >
            Add Test Result
          </Button>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {proficiencies.length} test result
            {proficiencies.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {proficiencies.map((proficiency) => (
            <ProficiencyCard key={proficiency.id} proficiency={proficiency} />
          ))}
        </>
      )}
    </Paper>
  );
};

export default ClientProficiency;
