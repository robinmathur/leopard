/**
 * ApplicationTrackerLanding - Landing page for selecting application type tracker
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Chip,
  Grid,
} from '@mui/material';
import { Timeline, CheckCircle } from '@mui/icons-material';
import { listApplicationTypes } from '@/services/api/collegeApplicationApi';
import type { ApplicationType } from '@/types/collegeApplication';

export const ApplicationTrackerLanding: React.FC = () => {
  const navigate = useNavigate();
  const [applicationTypes, setApplicationTypes] = useState<ApplicationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplicationTypes = async () => {
      try {
        const response = await listApplicationTypes({ is_active: true });
        setApplicationTypes(response.results);

        // Auto-redirect to first application type if only one exists
        if (response.results.length === 1) {
          navigate(`/application-manager/tracker/${response.results[0].id}`, { replace: true }); }}catch (err: any) {
        setError(err.message || 'Failed to load application types');
      } finally {
        setLoading(false); }};

    fetchApplicationTypes();
  }, [navigate]);

  const handleTypeClick = (typeId: number) => {
    navigate(`/application-manager/tracker/${typeId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (applicationTypes.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No active application types found. Create an application type to start tracking applications.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Application Tracker
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select an application type to view and manage applications
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {applicationTypes.map((type) => (
          <Grid key={type.id}size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                }, }}>
              <CardActionArea
                onClick={() => handleTypeClick(type.id)}
                sx={{ height: '100%', p: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Timeline sx={{ fontSize: 40, color: 'primary.main', mr: 2 }}/>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        {type.title}
                      </Typography>
                      {type.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {type.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<CheckCircle />}
                      label={`${type.stages_count} Stages`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    {type.has_applications && (
                      <Chip
                        label="Has Applications"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  {type.currency && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Currency: {type.currency}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
