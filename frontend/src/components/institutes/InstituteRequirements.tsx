/**
 * InstituteRequirements Component
 * Displays and manages requirements for an institute
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
  MenuItem,
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
  InstituteRequirement,
  InstituteRequirementCreateRequest,
  InstituteRequirementUpdateRequest,
  REQUIREMENT_TYPE_LABELS,
  RequirementType,
} from '@/types/institute';
import { usePermission } from '@/auth/hooks/usePermission';
import {Protect} from "@/components/protected/Protect.tsx";

interface InstituteRequirementsProps {
  instituteId: number;
}

export const InstituteRequirements = ({ instituteId }: InstituteRequirementsProps) => {
  const { hasAnyPermission } = usePermission();
  const hasAnyAction = hasAnyPermission(['change_instituterequirement', 'delete_instituterequirement']);

  const [requirements, setRequirements] = useState<InstituteRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<InstituteRequirement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirement_type: 'OTHER' as RequirementType,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequirements();
  }, [instituteId]);

  const loadRequirements = async () => {
    setLoading(true);
    try {
      const data = await instituteApi.listRequirements(instituteId);
      setRequirements(data);
    } catch (err) {
      setError('Failed to load requirements');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRequirement(null);
    setFormData({ title: '', description: '', requirement_type: 'OTHER' });
    setDialogOpen(true);
  };

  const handleEdit = (requirement: InstituteRequirement) => {
    setEditingRequirement(requirement);
    setFormData({
      title: requirement.title,
      description: requirement.description || '',
      requirement_type: requirement.requirement_type,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this requirement?')) {
      return;
    }
    try {
      await instituteApi.deleteRequirement(id);
      loadRequirements();
    } catch (err) {
      setError('Failed to delete requirement');
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingRequirement) {
        const updateData: InstituteRequirementUpdateRequest = {
          title: formData.title,
          description: formData.description || undefined,
          requirement_type: formData.requirement_type,
        };
        await instituteApi.updateRequirement(editingRequirement.id, updateData);
      } else {
        const createData: InstituteRequirementCreateRequest = {
          institute: instituteId,
          title: formData.title,
          description: formData.description || undefined,
          requirement_type: formData.requirement_type,
        };
        await instituteApi.createRequirement(createData);
      }
      setDialogOpen(false);
      loadRequirements();
    } catch (err) {
      setError('Failed to save requirement');
    } finally {
      setSaving(false);
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
        <Typography variant="h6">Requirements</Typography>
        <Protect permission={'add_instituterequirement'}>
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={handleAdd}>
            Add Requirement
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
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              {hasAnyAction && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {requirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasAnyAction ? 4 : 3} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No requirements found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              requirements.map((requirement) => (
                <TableRow key={requirement.id}>
                  <TableCell>{requirement.title}</TableCell>
                  <TableCell>{REQUIREMENT_TYPE_LABELS[requirement.requirement_type]}</TableCell>
                  <TableCell>{requirement.description || '-'}</TableCell>
                  {hasAnyAction && (
                    <TableCell align="right">
                      <Protect permission={'change_instituterequirement'}>
                        <IconButton size="small" onClick={() => handleEdit(requirement)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Protect>
                      <Protect permission={'delete_instituterequirement'}>
                        <IconButton size="small" onClick={() => handleDelete(requirement.id)} color="error">
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
          {editingRequirement ? 'Edit Requirement' : 'Add Requirement'}
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              fullWidth
              disabled={saving}
            />
            <TextField
              label="Type"
              value={formData.requirement_type}
              onChange={(e) => setFormData({ ...formData, requirement_type: e.target.value as RequirementType })}
              select
              fullWidth
              disabled={saving}
            >
              {Object.entries(REQUIREMENT_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
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
                disabled={saving || !formData.title}
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
