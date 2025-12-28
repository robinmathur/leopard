/**
 * InstitutePage
 * Main page for institute management - shows all institutes
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Protect } from '@/components/protected/Protect';
import { useInstituteStore } from '@/store/instituteStore';
import {
  Institute,
  InstituteCreateRequest,
  InstituteUpdateRequest,
} from '@/types/institute';
import { ApiError } from '@/services/api/httpClient';

type DialogMode = 'add' | 'edit' | null;

export const InstitutePage = () => {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Dialog states
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<InstituteCreateRequest>({
    name: '',
    short_name: '',
    phone: '',
    website: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Institute store
  const {
    institutes,
    loading,
    error,
    fetchInstitutes,
    addInstitute,
    updateInstitute,
    deleteInstitute,
    clearError,
    cancelFetchInstitutes,
  } = useInstituteStore();

  // Fetch institutes on mount
  useEffect(() => {
    fetchInstitutes();

    return () => {
      cancelFetchInstitutes();
    };
  }, [fetchInstitutes, cancelFetchInstitutes]);

  // Show error in snackbar
  useEffect(() => {
    if (error) {
      setSnackbar({
        open: true,
        message: error.message || 'An error occurred',
        severity: 'error',
      });
      clearError();
    }
  }, [error, clearError]);

  // --- Add Institute ---
  const handleAdd = () => {
    setDialogMode('add');
    setSelectedInstitute(null);
    setFormData({
      name: '',
      short_name: '',
      phone: '',
      website: '',
    });
    setFormErrors({});
  };

  // --- Edit Institute ---
  const handleEdit = (institute: Institute) => {
    setDialogMode('edit');
    setSelectedInstitute(institute);
    setFormData({
      name: institute.name,
      short_name: institute.short_name,
      phone: institute.phone || '',
      website: institute.website || '',
    });
  };

  // --- Delete Institute ---
  const handleDelete = async (institute: Institute) => {
    if (!window.confirm(`Are you sure you want to delete "${institute.name}"?`)) {
      return;
    }

    setFormLoading(true);
    const success = await deleteInstitute(institute.id);
    setFormLoading(false);

    if (success) {
      setSnackbar({
        open: true,
        message: `Institute "${institute.name}" deleted successfully`,
        severity: 'success',
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to delete institute',
        severity: 'error',
      });
    }
  };

  // --- View Institute ---
  const handleView = (institute: Institute) => {
    navigate(`/institute/${institute.id}`);
  };

  // --- Form Dialog Actions ---
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedInstitute(null);
    setFormData({
      name: '',
      short_name: '',
      phone: '',
      website: '',
    });
    setFormErrors({});
  };

  const handleSave = useCallback(async () => {
    // Clear previous errors
    setFormErrors({});

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Name is required';
    }
    if (!formData.short_name || formData.short_name.trim() === '') {
      errors.short_name = 'Short Name is required';
    }

    // Validate phone format if provided
    if (formData.phone && formData.phone.trim() !== '') {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    // Validate website format if provided
    if (formData.website && formData.website.trim() !== '') {
      try {
        new URL(formData.website.startsWith('http') ? formData.website : `https://${formData.website}`);
      } catch {
        errors.website = 'Please enter a valid website URL';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormLoading(true);

    try {
      if (dialogMode === 'add') {
        const result = await addInstitute({
          name: formData.name.trim(),
          short_name: formData.short_name.trim(),
          phone: formData.phone?.trim() || undefined,
          website: formData.website?.trim() || undefined,
        });
        if (result) {
          handleCloseDialog();
          setSnackbar({
            open: true,
            message: `Institute "${result.name}" added successfully`,
            severity: 'success',
          });
          fetchInstitutes();
        }
      } else if (dialogMode === 'edit' && selectedInstitute) {
        const updateData: InstituteUpdateRequest = {
          name: formData.name.trim(),
          short_name: formData.short_name.trim(),
          phone: formData.phone?.trim() || undefined,
          website: formData.website?.trim() || undefined,
        };
        const result = await updateInstitute(selectedInstitute.id, updateData);
        if (result) {
          handleCloseDialog();
          setSnackbar({
            open: true,
            message: `Institute "${result.name}" updated successfully`,
            severity: 'success',
          });
        }
      }
    } catch (err) {
      const apiError = err as ApiError;
      // Handle field-specific errors from backend
      if (apiError.fieldErrors) {
        // Convert Record<string, string[]> to Record<string, string>
        const convertedErrors: Record<string, string> = {};
        Object.entries(apiError.fieldErrors).forEach(([key, value]) => {
          convertedErrors[key] = Array.isArray(value) ? value.join(', ') : value;
        });
        setFormErrors(convertedErrors);
      } else {
        setSnackbar({
          open: true,
          message: apiError.message || 'Failed to save institute',
          severity: 'error',
        });
      }
    } finally {
      setFormLoading(false);
    }
  }, [dialogMode, selectedInstitute, formData, addInstitute, updateInstitute, fetchInstitutes]);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Institutes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage partner universities and colleges
          </Typography>
        </Box>
        <Protect permission={'add_institute'}>
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={handleAdd}>
            Add Institute
          </Button>
        </Protect>
      </Box>

      {loading && institutes.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : institutes.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 6,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No institutes found
          </Typography>
          <Protect permission={'add_institute'}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Get started by adding your first institute
            </Typography>
          </Protect>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {institutes.map((institute) => (
            <Grid item xs={12} sm={6} md={4} key={institute.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {institute.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {institute.short_name}
                  </Typography>
                  {institute.phone && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Phone: {institute.phone}
                    </Typography>
                  )}
                  {institute.website && (
                    <Typography variant="body2" color="text.secondary">
                      Website: {institute.website}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button size="small" startIcon={<VisibilityIcon />} onClick={() => handleView(institute)}>
                    View
                  </Button>
                  <Protect permission="change_institute">
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEdit(institute)}
                    >
                      Edit
                    </Button>
                  </Protect>
                  <Protect permission="delete_institute">
                    <Button
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(institute)}
                      color="error"
                    >
                      Delete
                    </Button>
                  </Protect>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Institute Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {dialogMode === 'add' ? 'Add New Institute' : 'Edit Institute'}
          <IconButton onClick={handleCloseDialog} disabled={formLoading} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
              }}
              required
              fullWidth
              disabled={formLoading}
              error={!!formErrors.name}
              helperText={formErrors.name}
              autoFocus
            />
            <TextField
              label="Short Name"
              value={formData.short_name}
              onChange={(e) => {
                setFormData({ ...formData, short_name: e.target.value });
                if (formErrors.short_name) setFormErrors({ ...formErrors, short_name: '' });
              }}
              required
              fullWidth
              disabled={formLoading}
              error={!!formErrors.short_name}
              helperText={formErrors.short_name}
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
              }}
              fullWidth
              disabled={formLoading}
              error={!!formErrors.phone}
              helperText={formErrors.phone || 'Optional'}
              placeholder="e.g., +1 234 567 8900"
            />
            <TextField
              label="Website"
              value={formData.website}
              onChange={(e) => {
                setFormData({ ...formData, website: e.target.value });
                if (formErrors.website) setFormErrors({ ...formErrors, website: '' });
              }}
              fullWidth
              disabled={formLoading}
              error={!!formErrors.website}
              helperText={formErrors.website || 'Optional (e.g., www.example.com)'}
              placeholder="www.example.com"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={handleCloseDialog} disabled={formLoading}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={formLoading || !formData.name || !formData.short_name}
              >
                {formLoading ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
