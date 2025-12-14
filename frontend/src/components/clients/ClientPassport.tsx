/**
 * ClientPassport Component
 * Displays and manages passport information for a client with full CRUD operations
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getPassport, upsertPassport, deletePassport, Passport, PassportCreateRequest } from '@/services/api/passportApi';
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
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<PassportCreateRequest>({
    client_id: clientId,
    passport_no: '',
    passport_country: '',
    date_of_issue: '',
    date_of_expiry: '',
    place_of_issue: '',
    country_of_birth: '',
    nationality: '',
  });

  // Fetch passport data
  const fetchPassport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getPassport(clientId);
      setPassport(data); // Will be null if no passport exists (404)
    } catch (err) {
      // Only set error for non-404 errors
      // 404 is handled by getPassport returning null
      console.error('Error fetching passport:', err);
      setError((err as Error).message || 'Failed to load passport');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPassport();
  }, [clientId]);

  // Open form dialog
  const handleOpenForm = (editMode: boolean = false) => {
    if (editMode && passport) {
      setFormData({
        client_id: clientId,
        passport_no: passport.passport_no,
        passport_country: passport.passport_country,
        date_of_issue: passport.date_of_issue || '',
        date_of_expiry: passport.date_of_expiry || '',
        place_of_issue: passport.place_of_issue || '',
        country_of_birth: passport.country_of_birth,
        nationality: passport.nationality,
      });
    } else {
      setFormData({
        client_id: clientId,
        passport_no: '',
        passport_country: '',
        date_of_issue: '',
        date_of_expiry: '',
        place_of_issue: '',
        country_of_birth: '',
        nationality: '',
      });
    }
    setFormDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await upsertPassport(formData);
      setFormDialogOpen(false);
      await fetchPassport(); // Refresh
    } catch (err) {
      setError((err as Error).message || 'Failed to save passport');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await deletePassport(clientId);
      setDeleteDialogOpen(false);
      await fetchPassport(); // Refresh
    } catch (err) {
      setError((err as Error).message || 'Failed to delete passport');
    } finally {
      setIsSubmitting(false);
    }
  };

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
  if (error && !formDialogOpen && !deleteDialogOpen) {
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Passport Information</Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm(false)}
          >
            Add Passport
          </Button>
        </Box>
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
          <Typography variant="body2" color="text.secondary">
            Click "Add Passport" button above to add passport details for this client
          </Typography>
        </Box>

        {/* Add/Edit Form Dialog */}
        <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>Add Passport</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

                <TextField
                  label="Passport Number"
                  value={formData.passport_no}
                  onChange={(e) => setFormData({ ...formData, passport_no: e.target.value })}
                  required
                  fullWidth
                />

                <TextField
                  label="Passport Country"
                  value={formData.passport_country}
                  onChange={(e) => setFormData({ ...formData, passport_country: e.target.value })}
                  select
                  required
                  fullWidth
                >
                  {COUNTRIES.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  select
                  required
                  fullWidth
                >
                  {COUNTRIES.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Country of Birth"
                  value={formData.country_of_birth}
                  onChange={(e) => setFormData({ ...formData, country_of_birth: e.target.value })}
                  select
                  required
                  fullWidth
                >
                  {COUNTRIES.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Date of Issue"
                  type="date"
                  value={formData.date_of_issue}
                  onChange={(e) => setFormData({ ...formData, date_of_issue: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Date of Expiry"
                  type="date"
                  value={formData.date_of_expiry}
                  onChange={(e) => setFormData({ ...formData, date_of_expiry: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Place of Issue"
                  value={formData.place_of_issue}
                  onChange={(e) => setFormData({ ...formData, place_of_issue: e.target.value })}
                  fullWidth
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setFormDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Paper>
    );
  }

  // Check expiry status
  const expired = isExpired(passport.date_of_expiry);
  const expiringSoon = isExpiringWithin6Months(passport.date_of_expiry);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
        <Box>
          <IconButton onClick={() => handleOpenForm(true)} color="primary" size="small">
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => setDeleteDialogOpen(true)} color="error" size="small">
            <DeleteIcon />
          </IconButton>
        </Box>
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

      {/* Edit Form Dialog */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Edit Passport</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

              <TextField
                label="Passport Number"
                value={formData.passport_no}
                onChange={(e) => setFormData({ ...formData, passport_no: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Passport Country"
                value={formData.passport_country}
                onChange={(e) => setFormData({ ...formData, passport_country: e.target.value })}
                select
                required
                fullWidth
              >
                {COUNTRIES.map((country) => (
                  <MenuItem key={country.code} value={country.code}>
                    {country.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                select
                required
                fullWidth
              >
                {COUNTRIES.map((country) => (
                  <MenuItem key={country.code} value={country.code}>
                    {country.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Country of Birth"
                value={formData.country_of_birth}
                onChange={(e) => setFormData({ ...formData, country_of_birth: e.target.value })}
                select
                required
                fullWidth
              >
                {COUNTRIES.map((country) => (
                  <MenuItem key={country.code} value={country.code}>
                    {country.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Date of Issue"
                type="date"
                value={formData.date_of_issue}
                onChange={(e) => setFormData({ ...formData, date_of_issue: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Date of Expiry"
                type="date"
                value={formData.date_of_expiry}
                onChange={(e) => setFormData({ ...formData, date_of_expiry: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Place of Issue"
                value={formData.place_of_issue}
                onChange={(e) => setFormData({ ...formData, place_of_issue: e.target.value })}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
        <DialogTitle>Delete Passport</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this passport information? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ClientPassport;
