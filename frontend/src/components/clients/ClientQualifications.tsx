/**
 * ClientQualifications Component
 * Displays and manages educational qualifications for a client with full CRUD operations
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
  Chip,
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
import SchoolIcon from '@mui/icons-material/School';
import {
  getQualifications,
  createQualification,
  updateQualification,
  deleteQualification,
  Qualification,
  QualificationCreateRequest,
  QualificationUpdateRequest
} from '@/services/api/qualificationApi';
import { COUNTRIES } from '@/types/client';

export interface ClientQualificationsProps {
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
const QualificationsSkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Qualification card
 */
interface QualificationCardProps {
  qualification: Qualification;
  onEdit: () => void;
  onDelete: () => void;
}

const QualificationCard = ({ qualification, onEdit, onDelete }: QualificationCardProps) => {
  const isInProgress = !qualification.completion_date;

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
          <SchoolIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {qualification.course}
            </Typography>
            {qualification.institute && (
              <Typography variant="body2" color="text.secondary">
                {qualification.institute}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {isInProgress && (
            <Chip label="In Progress" color="info" size="small" sx={{ mr: 1 }} />
          )}
          <IconButton size="small" onClick={onEdit} color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onDelete} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {qualification.degree && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Degree" value={qualification.degree} />
          </Grid>
        )}
        {qualification.field_of_study && (
          <Grid item xs={6} sm={4}>
            <DetailRow label="Field of Study" value={qualification.field_of_study} />
          </Grid>
        )}
        <Grid item xs={6} sm={4}>
          <DetailRow label="Country" value={getCountryName(qualification.country)} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <DetailRow label="Start Date" value={formatDate(qualification.enroll_date)} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <DetailRow
            label="Completion Date"
            value={
              isInProgress ? (
                <Chip label="In Progress" size="small" color="info" variant="outlined" />
              ) : (
                formatDate(qualification.completion_date)
              )
            }
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

/**
 * ClientQualifications Component
 */
export const ClientQualifications = ({ clientId }: ClientQualificationsProps) => {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingQualification, setEditingQualification] = useState<Qualification | null>(null);
  const [qualificationToDelete, setQualificationToDelete] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<QualificationCreateRequest>({
    client_id: clientId,
    course: '',
    institute: '',
    degree: '',
    field_of_study: '',
    enroll_date: '',
    completion_date: '',
    country: '',
  });

  // Fetch qualifications
  const fetchQualifications = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getQualifications(clientId, signal);
      if (!signal?.aborted) {
        // Sort by start date (most recent first)
        const sorted = data.sort((a, b) => {
          if (!a.enroll_date) return 1;
          if (!b.enroll_date) return -1;
          return new Date(b.enroll_date).getTime() - new Date(a.enroll_date).getTime();
        });
        setQualifications(sorted);
      }
    } catch (err) {
      if ((err as Error).name === 'CanceledError' || signal?.aborted) {
        return;
      }
      setError((err as Error).message || 'Failed to load qualifications');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchQualifications(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [clientId]);

  // Open form dialog
  const handleOpenForm = (qualification?: Qualification) => {
    if (qualification) {
      setEditingQualification(qualification);
      setFormData({
        client_id: clientId,
        course: qualification.course,
        institute: qualification.institute || '',
        degree: qualification.degree || '',
        field_of_study: qualification.field_of_study || '',
        enroll_date: qualification.enroll_date || '',
        completion_date: qualification.completion_date || '',
        country: qualification.country || '',
      });
    } else {
      setEditingQualification(null);
      setFormData({
        client_id: clientId,
        course: '',
        institute: '',
        degree: '',
        field_of_study: '',
        enroll_date: '',
        completion_date: '',
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
      if (editingQualification) {
        const updateData: QualificationUpdateRequest = {
          client_id: formData.client_id,
          course: formData.course,
          institute: formData.institute,
          degree: formData.degree,
          field_of_study: formData.field_of_study,
          enroll_date: formData.enroll_date || undefined,
          completion_date: formData.completion_date || undefined,
          country: formData.country,
        };
        await updateQualification(editingQualification.id, updateData);
      } else {
        await createQualification(formData);
      }
      setFormDialogOpen(false);
      await fetchQualifications(); // Refresh
    } catch (err) {
      setError((err as Error).message || 'Failed to save qualification');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (qualificationId: number) => {
    setQualificationToDelete(qualificationId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!qualificationToDelete) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteQualification(qualificationToDelete);
      setDeleteDialogOpen(false);
      setQualificationToDelete(null);
      await fetchQualifications(); // Refresh
    } catch (err) {
      setError((err as Error).message || 'Failed to delete qualification');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Educational Qualifications
        </Typography>
        <QualificationsSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error && !formDialogOpen && !deleteDialogOpen) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Educational Qualifications
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Educational Qualifications</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Qualification
        </Button>
      </Box>

      {/* Qualifications List */}
      {qualifications.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No qualifications recorded
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click "Add Qualification" button above to add educational qualifications for this client
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {qualifications.length} qualification
            {qualifications.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {qualifications.map((qualification) => (
            <QualificationCard
              key={qualification.id}
              qualification={qualification}
              onEdit={() => handleOpenForm(qualification)}
              onDelete={() => handleDeleteClick(qualification.id)}
            />
          ))}
        </>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingQualification ? 'Edit Qualification' : 'Add Qualification'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

              <TextField
                label="Course"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Institute"
                value={formData.institute}
                onChange={(e) => setFormData({ ...formData, institute: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Degree"
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                required
                fullWidth
                placeholder="e.g., Bachelor's, Master's, PhD"
              />

              <TextField
                label="Field of Study"
                value={formData.field_of_study}
                onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                required
                fullWidth
                placeholder="e.g., Computer Science, Business Administration"
              />

              <TextField
                label="Country"
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

              <TextField
                label="Enrollment Date"
                type="date"
                value={formData.enroll_date}
                onChange={(e) => setFormData({ ...formData, enroll_date: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Completion Date"
                type="date"
                value={formData.completion_date}
                onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
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
        <DialogTitle>Delete Qualification</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this qualification? This action cannot be undone.
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

export default ClientQualifications;
