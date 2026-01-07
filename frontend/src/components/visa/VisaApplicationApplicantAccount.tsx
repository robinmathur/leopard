/**
 * VisaApplicationApplicantAccount
 * Applicant Account tab component displaying charges, fees, and payment tracking
 */
import { Box, Paper, Typography, Grid, Divider } from '@mui/material';
import type { VisaApplication } from '@/services/api/visaApplicationApi';

interface VisaApplicationApplicantAccountProps {
  application: VisaApplication;
}

/**
 * Format currency for display
 */
const formatCurrency = (amount: string, currency: string): string => {
  if (!amount) return '-';
  try {
    const value = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  } catch {
    return `${amount} ${currency}`;
  }
};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
      {label}
    </Typography>
    <Typography variant="body1">{value || '-'}</Typography>
  </Box>
);

export const VisaApplicationApplicantAccount = ({ application }: VisaApplicationApplicantAccountProps) => {
  const totalFees = parseFloat(application.immigration_fee || '0') + parseFloat(application.service_fee || '0');
  
  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Applicant Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Charges, fees, and payment tracking for the applicant
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {/* Fee Summary */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Total Charges
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {formatCurrency(String(totalFees), application.immigration_fee_currency || 'USD')}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Payments Made
              </Typography>
              <Typography variant="h6" fontWeight={600} color="success.main">
                $0.00
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Outstanding Balance
              </Typography>
              <Typography variant="h6" fontWeight={600} color="error.main">
                {formatCurrency(String(totalFees), application.immigration_fee_currency || 'USD')}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Fee Breakdown */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Fee Breakdown
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <DetailRow 
              label="Immigration Fee" 
              value={formatCurrency(application.immigration_fee, application.immigration_fee_currency)} 
            />
            <DetailRow 
              label="Service Fee" 
              value={formatCurrency(application.service_fee, application.service_fee_currency)} 
            />
            <Divider sx={{ my: 2 }} />
            <DetailRow 
              label="Total" 
              value={
                <Typography variant="h6" fontWeight={600}>
                  {formatCurrency(String(totalFees), application.immigration_fee_currency || 'USD')}
                </Typography>
              } 
            />
          </Paper>
        </Box>

        {/* Transaction History */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Transaction History
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box
              sx={{
                py: 4,
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography variant="body2">
                No transactions recorded
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Payment and charge transactions will be displayed here when available
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
};

export default VisaApplicationApplicantAccount;

