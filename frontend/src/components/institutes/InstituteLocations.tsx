/**
 * InstituteLocations Component
 * Displays and manages locations for an institute
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { instituteApi } from '@/services/api/instituteApi';
import {
  InstituteLocation,
  InstituteLocationCreateRequest,
  InstituteLocationUpdateRequest,
} from '@/types/institute';
import { COUNTRIES } from '@/types/client';
import { usePermission } from '@/auth/hooks/usePermission';
import {Protect} from "@/components/protected/Protect.tsx";

interface InstituteLocationsProps {
  instituteId: number;
}

export const InstituteLocations = ({ instituteId }: InstituteLocationsProps) => {
  const { hasAnyPermission } = usePermission();
  const hasAnyAction = hasAnyPermission(['change_institutelocation', 'delete_institutelocation']);

  const [locations, setLocations] = useState<InstituteLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<InstituteLocation | null>(null);
  const [formData, setFormData] = useState({
    street_name: '',
    suburb: '',
    state: '',
    postcode: '',
    country: '',
    phone_number: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLocations();
  }, [instituteId]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await instituteApi.listLocations(instituteId);
      setLocations(data);
    } catch (err) {
      setError('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLocation(null);
    setFormData({
      street_name: '',
      suburb: '',
      state: '',
      postcode: '',
      country: '',
      phone_number: '',
      email: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (location: InstituteLocation) => {
    setEditingLocation(location);
    setFormData({
      street_name: location.street_name || '',
      suburb: location.suburb || '',
      state: location.state,
      postcode: location.postcode || '',
      country: location.country,
      phone_number: location.phone_number || '',
      email: location.email || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this location?')) {
      return;
    }
    try {
      await instituteApi.deleteLocation(id);
      loadLocations();
    } catch (err) {
      setError('Failed to delete location');
    }
  };

  const handleSave = async () => {
    setFormErrors({});
    const errors: Record<string, string> = {};

    if (!formData.state || formData.state.trim() === '') {
      errors.state = 'State is required';
    }
    if (!formData.country) {
      errors.country = 'Country is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingLocation) {
        const updateData: InstituteLocationUpdateRequest = {
          street_name: formData.street_name || undefined,
          suburb: formData.suburb || undefined,
          state: formData.state,
          postcode: formData.postcode || undefined,
          country: formData.country,
          phone_number: formData.phone_number || undefined,
          email: formData.email || undefined,
        };
        await instituteApi.updateLocation(editingLocation.id, updateData);
      } else {
        const createData: InstituteLocationCreateRequest = {
          institute: instituteId,
          street_name: formData.street_name || undefined,
          suburb: formData.suburb || undefined,
          state: formData.state,
          postcode: formData.postcode || undefined,
          country: formData.country,
          phone_number: formData.phone_number || undefined,
          email: formData.email || undefined,
        };
        await instituteApi.createLocation(createData);
      }
      setDialogOpen(false);
      loadLocations();
    } catch (err) {
      setError('Failed to save location');
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
        <Typography variant="h6">Locations</Typography>
        <Protect permission={'add_institutelocation'}>
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={handleAdd}>
            Add Location
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
              <TableCell>Street</TableCell>
              <TableCell>Suburb</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Postcode</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              {hasAnyAction && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasAnyAction ? 8 : 7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No locations found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>{location.street_name || '-'}</TableCell>
                  <TableCell>{location.suburb || '-'}</TableCell>
                  <TableCell>{location.state}</TableCell>
                  <TableCell>{location.postcode || '-'}</TableCell>
                  <TableCell>
                    {COUNTRIES.find((c) => c.code === location.country)?.name || location.country}
                  </TableCell>
                  <TableCell>{location.phone_number || '-'}</TableCell>
                  <TableCell>{location.email || '-'}</TableCell>
                  {hasAnyAction && (
                    <TableCell align="right">
                      <Protect permission={'change_institutelocation'}>
                        <IconButton size="small" onClick={() => handleEdit(location)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Protect>
                      <Protect permission={'delete_institutelocation'}>
                        <IconButton size="small" onClick={() => handleDelete(location.id)} color="error">
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
          {editingLocation ? 'Edit Location' : 'Add Location'}
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Street Name"
              value={formData.street_name}
              onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
              fullWidth
              disabled={saving}
            />
            <TextField
              label="Suburb"
              value={formData.suburb}
              onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
              fullWidth
              disabled={saving}
            />
            <TextField
              label="State"
              value={formData.state}
              onChange={(e) => {
                setFormData({ ...formData, state: e.target.value });
                if (formErrors.state) setFormErrors({ ...formErrors, state: '' });
              }}
              required
              fullWidth
              disabled={saving}
              error={!!formErrors.state}
              helperText={formErrors.state}
            />
            <TextField
              label="Postcode"
              value={formData.postcode}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              fullWidth
              disabled={saving}
            />
            <FormControl fullWidth required error={!!formErrors.country}>
              <InputLabel>Country</InputLabel>
              <Select
                value={formData.country}
                onChange={(e) => {
                  setFormData({ ...formData, country: e.target.value });
                  if (formErrors.country) setFormErrors({ ...formErrors, country: '' });
                }}
                label="Country"
                disabled={saving}
              >
                {COUNTRIES.map((country) => (
                  <MenuItem key={country.code} value={country.code}>
                    {country.name}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.country && <FormHelperText>{formErrors.country}</FormHelperText>}
            </FormControl>
            <TextField
              label="Phone Number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              fullWidth
              disabled={saving}
            />
            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              type="email"
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
                disabled={saving || !formData.state || !formData.country}
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
