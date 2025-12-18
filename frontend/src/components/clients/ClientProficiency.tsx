/**
 * ClientProficiency Component
 * Displays and manages language proficiency test results for a client with full CRUD operations
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
  Divider,
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
import {
  getProficiencies,
  createProficiency,
  updateProficiency,
  deleteProficiency,
  Proficiency,
  ProficiencyCreateRequest,
  ProficiencyUpdateRequest,
} from '@/services/api/proficiencyApi';
import { getLanguageExams, LanguageExam } from '@/services/api/languageExamApi';

export interface ClientProficiencyProps {
  /** Client ID */
  clientId: number;
}

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
 * Format score for display
 */
const formatScore = (score?: number | string): string => {
  if (score === undefined || score === null) return '-';
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(numScore)) return '-';
  return numScore.toFixed(1);
};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500}>
      {value || '-'}
    </Typography>
  </Box>
);

/**
 * Loading skeleton
 */
const ProficiencySkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Proficiency test card
 */
interface ProficiencyCardProps {
  proficiency: Proficiency;
  onEdit: () => void;
  onDelete: () => void;
}

const ProficiencyCard = ({ proficiency, onEdit, onDelete }: ProficiencyCardProps) => {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {proficiency.test_name_display || 'Language Test'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Test Date: {formatDate(proficiency.test_date)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {proficiency.overall_score && (
            <Chip
              label={`Overall: ${formatScore(proficiency.overall_score)}`}
              color="primary"
              size="small"
              sx={{ mr: 1 }}
            />
          )}
          <IconButton size="small" onClick={onEdit} color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onDelete} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Component Scores
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <DetailRow label="Reading" value={formatScore(proficiency.reading_score)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DetailRow label="Writing" value={formatScore(proficiency.writing_score)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DetailRow label="Speaking" value={formatScore(proficiency.speaking_score)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DetailRow label="Listening" value={formatScore(proficiency.listening_score)} />
        </Grid>
      </Grid>
    </Paper>
  );
};

/**
 * ClientProficiency Component
 */
export const ClientProficiency = ({ clientId }: ClientProficiencyProps) => {
  const [proficiencies, setProficiencies] = useState<Proficiency[]>([]);
  const [languageExams, setLanguageExams] = useState<LanguageExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProficiency, setEditingProficiency] = useState<Proficiency | null>(null);
  const [proficiencyToDelete, setProficiencyToDelete] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<ProficiencyCreateRequest>({
    client_id: clientId,
    test_name_id: 0,
    overall_score: undefined,
    speaking_score: undefined,
    reading_score: undefined,
    listening_score: undefined,
    writing_score: undefined,
    test_date: '',
  });

  // Fetch proficiency data and language exams
  const fetchData = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const [proficienciesData, examsData] = await Promise.all([
        getProficiencies(clientId, signal),
        getLanguageExams(signal),
      ]);

      if (!signal?.aborted) {
        // Sort by test date (most recent first)
        const sorted = proficienciesData.sort((a, b) => {
          if (!a.test_date) return 1;
          if (!b.test_date) return -1;
          return new Date(b.test_date).getTime() - new Date(a.test_date).getTime();
        });
        setProficiencies(sorted);
        setLanguageExams(examsData);
      }
    } catch (err) {
      if ((err as Error).name === 'CanceledError' || signal?.aborted) {
        return;
      }
      setError((err as Error).message || 'Failed to load language proficiency data');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchData(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [clientId]);

  // Open form dialog
  const handleOpenForm = (proficiency?: Proficiency) => {
    if (proficiency) {
      setEditingProficiency(proficiency);
      setFormData({
        client_id: clientId,
        test_name_id: proficiency.test_name_id || 0,
        overall_score: proficiency.overall_score,
        speaking_score: proficiency.speaking_score,
        reading_score: proficiency.reading_score,
        listening_score: proficiency.listening_score,
        writing_score: proficiency.writing_score,
        test_date: proficiency.test_date || '',
      });
    } else {
      setEditingProficiency(null);
      setFormData({
        client_id: clientId,
        test_name_id: 0,
        overall_score: undefined,
        speaking_score: undefined,
        reading_score: undefined,
        listening_score: undefined,
        writing_score: undefined,
        test_date: '',
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
      if (editingProficiency) {
        const updateData: ProficiencyUpdateRequest = {
          client_id: formData.client_id,
          test_name_id: formData.test_name_id,
          overall_score: formData.overall_score,
          speaking_score: formData.speaking_score,
          reading_score: formData.reading_score,
          listening_score: formData.listening_score,
          writing_score: formData.writing_score,
          test_date: formData.test_date || undefined,
        };
        await updateProficiency(editingProficiency.id, updateData);
      } else {
        await createProficiency(formData);
      }
      setFormDialogOpen(false);
      await fetchData(); // Refresh
    } catch (err) {
      setError((err as Error).message || 'Failed to save proficiency test');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (proficiencyId: number) => {
    setProficiencyToDelete(proficiencyId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!proficiencyToDelete) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteProficiency(proficiencyToDelete);
      setDeleteDialogOpen(false);
      setProficiencyToDelete(null);
      await fetchData(); // Refresh
    } catch (err) {
      setError((err as Error).message || 'Failed to delete proficiency test');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Language Proficiency
        </Typography>
        <ProficiencySkeleton />
      </Paper>
    );
  }

  // Error state
  if (error && !formDialogOpen && !deleteDialogOpen) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Language Proficiency
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Language Proficiency</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Test Result
        </Button>
      </Box>

      {/* Proficiency List */}
      {proficiencies.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No language proficiency tests recorded
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click "Add Test Result" button above to add language test results for this client
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {proficiencies.length} test result
            {proficiencies.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {proficiencies.map((proficiency) => (
            <ProficiencyCard
              key={proficiency.id}
              proficiency={proficiency}
              onEdit={() => handleOpenForm(proficiency)}
              onDelete={() => handleDeleteClick(proficiency.id)}
            />
          ))}
        </>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingProficiency ? 'Edit Test Result' : 'Add Test Result'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

              <TextField
                label="Test Name"
                value={formData.test_name_id}
                onChange={(e) => setFormData({ ...formData, test_name_id: parseInt(e.target.value, 10) })}
                select
                required
                fullWidth
              >
                <MenuItem value={0} disabled>
                  Select Test Type
                </MenuItem>
                {languageExams.map((exam) => (
                  <MenuItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Test Date"
                type="date"
                value={formData.test_date}
                onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Overall Score"
                type="number"
                value={formData.overall_score || ''}
                onChange={(e) => setFormData({ ...formData, overall_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                required
                fullWidth
                inputProps={{ step: 0.5, min: 0, max: 100 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Reading Score"
                    type="number"
                    value={formData.reading_score || ''}
                    onChange={(e) => setFormData({ ...formData, reading_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                    required
                    fullWidth
                    inputProps={{ step: 0.5, min: 0, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Writing Score"
                    type="number"
                    value={formData.writing_score || ''}
                    onChange={(e) => setFormData({ ...formData, writing_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                    required
                    fullWidth
                    inputProps={{ step: 0.5, min: 0, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Speaking Score"
                    type="number"
                    value={formData.speaking_score || ''}
                    onChange={(e) => setFormData({ ...formData, speaking_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                    required
                    fullWidth
                    inputProps={{ step: 0.5, min: 0, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Listening Score"
                    type="number"
                    value={formData.listening_score || ''}
                    onChange={(e) => setFormData({ ...formData, listening_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                    required
                    fullWidth
                    inputProps={{ step: 0.5, min: 0, max: 100 }}
                  />
                </Grid>
              </Grid>
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
        <DialogTitle>Delete Test Result</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this language proficiency test result? This action cannot be undone.
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

export default ClientProficiency;
