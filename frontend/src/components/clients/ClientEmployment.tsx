/**
 * ClientEmployment Component
 * Displays and manages employment history for a client with full CRUD operations
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WorkIcon from '@mui/icons-material/Work';
import {
  getEmployments,
  createEmployment,
  updateEmployment,
  deleteEmployment,
  Employment,
  EmploymentCreateRequest,
  EmploymentUpdateRequest,
} from '@/services/api/employmentApi';
import { COUNTRIES } from '@/types/client';

export interface ClientEmploymentProps {
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
const EmploymentSkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Employment card
 */
interface EmploymentCardProps {
  employment: Employment;
  onEdit: () => void;
  onDelete: () => void;
}

const EmploymentCard = ({ employment, onEdit, onDelete }: EmploymentCardProps) => {
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
          <WorkIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {employment.position}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {employment.employer_name}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <IconButton size="small" onClick={onEdit} color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onDelete} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={6} sm={4}>
          <DetailRow label="Start Date" value={formatDate(employment.start_date)} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <DetailRow label="End Date" value={formatDate(employment.end_date)} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <DetailRow label="Country" value={getCountryName(employment.country)} />
        </Grid>
      </Grid>
    </Paper>
  );
};

/**
 * ClientEmployment Component
 */
export const ClientEmployment = ({ clientId }: ClientEmploymentProps) => {
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState<Employment | null>(null);
  const [employmentToDelete, setEmploymentToDelete] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<EmploymentCreateRequest>({
    client_id: clientId,
    employer_name: '',
    position: '',
    start_date: '',
    end_date: '',
    country: '',
  });

  // Fetch employments
  const fetchEmployments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getEmployments(clientId);
      // Sort by end date (most recent first)
      const sorted = data.sort((a, b) => {
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
      });
      setEmployments(sorted);
    } catch (err) {
      setError((err as Error).message || 'Failed to load employment history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployments();
  }, [clientId]);

  // Open form dialog
  const handleOpenForm = (employment?: Employment) => {
    if (employment) {
      setEditingEmployment(employment);
      setFormData({
        client_id: clientId,
        employer_name: employment.employer_name,
        position: employment.position,
        start_date: employment.start_date,
        end_date: employment.end_date,
        country: employment.country,
      });
    } else {
      setEditingEmployment(null);
      setFormData({
        client_id: clientId,
        employer_name: '',
        position: '',
        start_date: '',
        end_date: '',
        country: '',
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
      if (editingEmployment) {
        const updateData: EmploymentUpdateRequest = formData;
        await updateEmployment(editingEmployment.id, updateData);
      } else {
        await createEmployment(formData);
      }
      setFormDialogOpen(false);
      await fetchEmployments(); // Refresh
    } catch (err) {
      setError((err as Error).message || 'Failed to save employment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (employmentId: number) => {
    setEmploymentToDelete(employmentId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!employmentToDelete) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteEmployment(employmentToDelete);
      setDeleteDialogOpen(false);
      setEmploymentToDelete(null);
      await fetchEmployments(); // Refresh
    } catch (err) {
      setError((err as Error).message || 'Failed to delete employment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Employment History
        </Typography>
        <EmploymentSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error && !formDialogOpen && !deleteDialogOpen) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Employment History
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Employment History</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Employment
        </Button>
      </Box>

      {/* Employment List */}
      {employments.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No employment history recorded
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click "Add Employment" button above to add employment details for this client
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {employments.length} employment record
            {employments.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {employments.map((employment) => (
            <EmploymentCard
              key={employment.id}
              employment={employment}
              onEdit={() => handleOpenForm(employment)}
              onDelete={() => handleDeleteClick(employment.id)}
            />
          ))}
        </>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingEmployment ? 'Edit Employment' : 'Add Employment'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

              <TextField
                label="Employer Name"
                value={formData.employer_name}
                onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Country of Employment"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                select
                required
                fullWidth
              >
                <MenuItem value="">Select Country</MenuItem>
                {COUNTRIES.map((country) => (
                  <MenuItem key={country.code} value={country.code}>
                    {country.name}
                  </MenuItem>
                ))}
              </TextField>
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
        <DialogTitle>Delete Employment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this employment record? This action cannot be undone.
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

export default ClientEmployment;
