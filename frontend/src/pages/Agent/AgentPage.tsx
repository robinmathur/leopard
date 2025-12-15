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
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Protect } from '@/components/protected/Protect';
import { usePermission } from '@/auth/hooks/usePermission';

const mockAgents = [
  {
    id: '1',
    name: 'Jane Agent',
    email: 'agent@immigrationcrm.com',
    role: 'Agent',
    branch: 'Toronto',
    status: 'Active',
    clients: 15,
  },
  {
    id: '2',
    name: 'Branch Manager',
    email: 'manager@immigrationcrm.com',
    role: 'Branch Manager',
    branch: 'Toronto',
    status: 'Active',
    clients: 42,
  },
];

export const AgentPage = () => {
  const { hasPermission } = usePermission();

  // Show warning if user doesn't have permission
  if (!hasPermission('view_agent')) {
    return (
      <Box>
        <Alert severity="warning">
          You don't have permission to view this page. Contact your administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Agent Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage team members and permissions
          </Typography>
        </Box>
        <Protect permission="add_agent">
          <Button variant="contained" startIcon={<AddIcon />} size="small">
            Add Agent
          </Button>
        </Protect>
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Clients</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockAgents.map((agent) => (
                <TableRow key={agent.id} hover>
                  <TableCell>{agent.name}</TableCell>
                  <TableCell>{agent.email}</TableCell>
                  <TableCell>{agent.role}</TableCell>
                  <TableCell>{agent.branch}</TableCell>
                  <TableCell>
                    <Chip label={agent.status} size="small" color="success" />
                  </TableCell>
                  <TableCell align="right">{agent.clients}</TableCell>
                  <TableCell align="right">
                    <Protect permission="change_agent">
                      <Button size="small" variant="text">
                        Edit
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

