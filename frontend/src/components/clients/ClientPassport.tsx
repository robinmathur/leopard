/**
 * ClientPassport Component
 * Displays and manages passport information for a client
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Alert,
  Skeleton,
  Button,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import { getPassport, Passport } from '@/services/api/passportApi';
import { COUNTRIES } from '@/types/client';

export interface ClientPassportProps {
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
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

/**
 * Check if passport expires within 6 months
 */
const isExpiringWithin6Months = (expiryDate?: string): boolean => {
  if (!expiryDate) return false;
  
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(now.getMonth() + 6);
    
    return expiry <= sixMonthsFromNow && expiry >= now;
  } catch {
    return false;
  }
};

/**
 * Check if passport is expired
 */
const isExpired = (expiryDate?: string): boolean => {
  if (!expiryDate) return false;
  
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  } catch {
    return false;
  }
};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2">{value || '-'}</Typography>
  </Box>
);

/**
 * Loading skeleton
 */
const PassportSkeleton = () => (
  <Box>
    <Grid container spacing={2}>
      {[...Array(6)].map((_, index) => (
        <Grid item xs={12} sm={6} key={index}>
          <Skeleton variant="text" width={80} height={20} />
          <Skeleton variant="text" width="100%" height={28} />
        </Grid>
      ))}
    </Grid>
  </Box>
);

/**
 * ClientPassport Component
 */
export const ClientPassport = ({ clientId }: ClientPassportProps) => {
  const [passport, setPassport] = useState<Passport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch passport data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getPassport(clientId);
        setPassport(data);
      } catch (err) {
        setError((err as Error).message || 'Failed to load passport');
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
          Passport Information
        </Typography>
        <PassportSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  // No passport state
  if (!passport) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Passport Information
        </Typography>
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No passport information available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add passport details for this client
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // TODO: Open passport add/edit form
              alert('Add Passport form - Coming in future enhancement');
            }}
          >
            Add Passport
          </Button>
        </Box>
      </Paper>
    );
  }

  // Check expiry status
  const expired = isExpired(passport.date_of_expiry);
  const expiringSoon = isExpiringWithin6Months(passport.date_of_expiry);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Passport Information
        </Typography>
        {(expired || expiringSoon) && (
          <Chip
            icon={<WarningIcon />}
            label={expired ? 'Expired' : 'Expires Soon'}
            color={expired ? 'error' : 'warning'}
            size="small"
          />
        )}
      </Box>

      {/* Expiry Warning */}
      {expired && (
        <Alert severity="error" sx={{ mb: 2 }}>
          This passport has expired. Please update the passport information.
        </Alert>
      )}
      {!expired && expiringSoon && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This passport will expire within 6 months ({formatDate(passport.date_of_expiry)}).
          Consider renewing it soon.
        </Alert>
      )}

      {/* Passport Details */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <DetailRow label="Passport Number" value={passport.passport_no} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DetailRow
            label="Passport Country"
            value={getCountryName(passport.passport_country)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DetailRow label="Nationality" value={getCountryName(passport.nationality)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DetailRow
            label="Country of Birth"
            value={getCountryName(passport.country_of_birth)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DetailRow label="Date of Issue" value={formatDate(passport.date_of_issue)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DetailRow
            label="Date of Expiry"
            value={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{formatDate(passport.date_of_expiry)}</span>
                {(expired || expiringSoon) && (
                  <WarningIcon
                    fontSize="small"
                    color={expired ? 'error' : 'warning'}
                  />
                )}
              </Box>
            }
          />
        </Grid>
        {passport.place_of_issue && (
          <Grid item xs={12}>
            <DetailRow label="Place of Issue" value={passport.place_of_issue} />
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default ClientPassport;
