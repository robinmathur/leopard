import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Protect } from '@/components/protected/Protect';

const mockInstitutes = [
  {
    id: '1',
    name: 'University of Toronto',
    country: 'Canada',
    programs: 45,
    status: 'Active',
  },
  {
    id: '2',
    name: 'University of Melbourne',
    country: 'Australia',
    programs: 38,
    status: 'Active',
  },
  {
    id: '3',
    name: 'Oxford University',
    country: 'UK',
    programs: 52,
    status: 'Active',
  },
];

export const InstitutePage = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Institutes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage partner universities and colleges
          </Typography>
        </Box>
        <Protect permission="create_institute">
          <Button variant="contained" startIcon={<AddIcon />} size="small">
            Add Institute
          </Button>
        </Protect>
      </Box>

      <Grid container spacing={2}>
        {mockInstitutes.map((institute) => (
          <Grid item xs={12} sm={6} md={4} key={institute.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {institute.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <LocationOnIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {institute.country}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {institute.programs} Programs
                </Typography>
                <Chip label={institute.status} size="small" color="success" />
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button size="small">View Details</Button>
                <Protect permission="edit_institute">
                  <Button size="small">Edit</Button>
                </Protect>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

