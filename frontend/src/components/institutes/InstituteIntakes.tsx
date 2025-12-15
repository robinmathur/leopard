/**
 * InstituteIntakes Component
 * Displays and manages intakes for an institute
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { instituteApi } from '@/services/api/instituteApi';
import {
  InstituteIntake,
  InstituteIntakeCreateRequest,
  InstituteIntakeUpdateRequest,
} from '@/types/institute';
import { usePermission } from '@/auth/hooks/usePermission';
import {Protect} from "@/components/protected/Protect.tsx";

interface InstituteIntakesProps {
  instituteId: number;
}

export const InstituteIntakes = ({ instituteId }: InstituteIntakesProps) => {
  const { hasAnyPermission } = usePermission();
  const hasAnyAction = hasAnyPermission(['change_instituteintake', 'delete_instituteintake']);

  const [intakes, setIntakes] = useState<InstituteIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntake, setEditingIntake] = useState<InstituteIntake | null>(null);
  const [formData, setFormData] = useState({
    intake_date: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIntakes();
  }, [instituteId]);

  const loadIntakes = async () => {
    setLoading(true);
    try {
      const data = await instituteApi.listIntakes(instituteId);
      setIntakes(data);
    } catch (err) {
      setError('Failed to load intakes');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingIntake(null);
    setFormData({ intake_date: '', description: '' });
    setDialogOpen(true);
  };

  const handleEdit = (intake: InstituteIntake) => {
    setEditingIntake(intake);
    setFormData({
      intake_date: intake.intake_date.split('T')[0], // Extract date part
      description: intake.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this intake?')) {
      return;
    }
    try {
      await instituteApi.deleteIntake(id);
      loadIntakes();
    } catch (err) {
      setError('Failed to delete intake');
    }
  };

  const handleSave = async () => {
    if (!formData.intake_date) {
      setError('Intake date is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingIntake) {
        const updateData: InstituteIntakeUpdateRequest = {
          intake_date: formData.intake_date,
          description: formData.description || undefined,
        };
        await instituteApi.updateIntake(editingIntake.id, updateData);
      } else {
        const createData: InstituteIntakeCreateRequest = {
          institute: instituteId,
          intake_date: formData.intake_date,
          description: formData.description || undefined,
        };
        await instituteApi.createIntake(createData);
      }
      setDialogOpen(false);
      loadIntakes();
    } catch (err) {
      setError('Failed to save intake');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Intakes</Typography>
        <Protect permission={'add_instituteintake'}>
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={handleAdd}>
            Add Intake
          </Button>
        </Protect>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Intake Date</TableCell>
              <TableCell>Description</TableCell>
              {hasAnyAction && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {intakes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasAnyAction ? 3 : 2} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No intakes found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              intakes.map((intake) => (
                <TableRow key={intake.id}>
                  <TableCell>{formatDate(intake.intake_date)}</TableCell>
                  <TableCell>{intake.description || '-'}</TableCell>
                  {hasAnyAction && (
                    <TableCell align="right">
                      <Protect permission={'change_instituteintake'}>
                        <IconButton size="small" onClick={() => handleEdit(intake)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Protect>
                      <Protect permission={'delete_instituteintake'}>
                        <IconButton size="small" onClick={() => handleDelete(intake.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Protect>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingIntake ? 'Edit Intake' : 'Add Intake'}
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Intake Date"
              type="date"
              value={formData.intake_date}
              onChange={(e) => setFormData({ ...formData, intake_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={saving}
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              disabled={saving}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !formData.intake_date}
              >
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
