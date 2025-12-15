import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DescriptionIcon from '@mui/icons-material/Description';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Protect } from '@/components/protected/Protect';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={600}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${color}15`,
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Welcome to your Immigration CRM dashboard
      </Typography>

      <Grid container spacing={2}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Protect permission="view_client">
            <StatCard
              title="Total Clients"
              value="1,245"
              icon={<PeopleIcon />}
              color="#1976d2"
            />
          </Protect>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Protect permission="view_client">
            <StatCard
              title="Active Leads"
              value="387"
              icon={<PersonAddIcon />}
              color="#2e7d32"
            />
          </Protect>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Protect permission="view_visaapplication">
            <StatCard
              title="Applications"
              value="562"
              icon={<DescriptionIcon />}
              color="#ed6c02"
            />
          </Protect>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {/*<Protect permission="view_analytic">*/}
            <StatCard
              title="Conversion Rate"
              value="68%"
              icon={<TrendingUpIcon />}
              color="#9c27b0"
            />
          {/*</Protect>*/}
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Activity feed will be displayed here
            </Typography>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quick action buttons will be displayed here
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

