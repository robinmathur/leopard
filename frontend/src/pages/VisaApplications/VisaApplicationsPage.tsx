import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Protect } from '@/components/protected/Protect';

const mockApplications = [
  {
    id: '1',
    client: 'John Smith',
    type: 'Student Visa',
    country: 'Canada',
    status: 'In Progress',
    submittedAt: '2025-01-01',
  },
  {
    id: '2',
    client: 'Sarah Johnson',
    type: 'Work Permit',
    country: 'Australia',
    status: 'Approved',
    submittedAt: '2024-12-15',
  },
];

export const VisaApplicationsPage = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Visa Applications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track visa and permit applications
          </Typography>
        </Box>
        <Protect permission="add_visaapplication">
          <Button variant="contained" startIcon={<AddIcon />} size="small">
            New Application
          </Button>
        </Protect>
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockApplications.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell>{app.client}</TableCell>
                  <TableCell>{app.type}</TableCell>
                  <TableCell>{app.country}</TableCell>
                  <TableCell>
                    <Chip
                      label={app.status}
                      size="small"
                      color={app.status === 'Approved' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>{app.submittedAt}</TableCell>
                  <TableCell align="right">
                    <Protect permission="change_visaapplication">
                      <Button size="small" variant="text">
                        View
                      </Button>
                    </Protect>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

