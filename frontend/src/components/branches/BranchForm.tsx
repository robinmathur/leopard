/**
 * BranchForm Component
 * Form for adding/editing branch details
 */
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Grid,
  Button,
  CircularProgress,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Branch,
  BranchCreateRequest,
  BranchUpdateRequest,
} from '@/types/branch';
import { COUNTRIES } from '@/types/agent';

interface BranchFormProps {
  mode: 'add' | 'edit';
  initialData?: Branch;
  onSave: (data: BranchCreateRequest | BranchUpdateRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  fieldErrors?: Record<string, string[]>;
  regions?: Array<{ id: number; name: string }>;
}

interface FormData {
  name: string;
  region_id: string;
  phone: string;
  website: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

const initialFormData: FormData = {
  name: '',
  region_id: '',
  phone: '',
  website: '',
  street: '',
  suburb: '',
  state: '',
  postcode: '',
  country: '',
};


export const BranchForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  loading = false,
  fieldErrors = {},
  regions = [],
}: BranchFormProps) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Populate form with initial data when editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name || '',
        region_id: initialData.region ? String(initialData.region) : '',
        phone: initialData.phone || '',
        website: initialData.website || '',
        street: initialData.street || '',
        suburb: initialData.suburb || '',
        state: initialData.state || '',
        postcode: initialData.postcode || '',
        country: initialData.country || '',
      }); }}, [mode, initialData]);

  const handleChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear local error when field changes
    if (localErrors[field]) {
      setLocalErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      }); }};

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    // Website validation (optional but must be valid URL if provided)
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      errors.website = 'Website must be a valid URL (e.g., https://example.com)';
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Build request data - only include non-empty values for optional fields
    const submitData: BranchCreateRequest | BranchUpdateRequest = {
      name: formData.name.trim(),
    };

    // Add optional fields if they have values
    if (formData.region_id) {
      submitData.region_id = parseInt(formData.region_id, 10);
    } else {
      submitData.region_id = null;
    }
    if (formData.phone.trim()) submitData.phone = formData.phone.trim();
    if (formData.website.trim()) submitData.website = formData.website.trim();
    if (formData.street.trim()) submitData.street = formData.street.trim();
    if (formData.suburb.trim()) submitData.suburb = formData.suburb.trim();
    if (formData.state.trim()) submitData.state = formData.state.trim();
    if (formData.postcode.trim()) submitData.postcode = formData.postcode.trim();
    if (formData.country) submitData.country = formData.country;

    await onSave(submitData);
  };

  const getFieldError = (field: keyof FormData): string | undefined => {
    if (localErrors[field]) {
      return localErrors[field];
    }
    if (fieldErrors[field] && fieldErrors[field].length > 0) {
      return fieldErrors[field][0];
    }
    return undefined;
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        {/* Name */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Branch Name"
            value={formData.name}
            onChange={handleChange('name')}
            fullWidth
            required
            error={!!getFieldError('name')}
            helperText={getFieldError('name')}
            disabled={loading}
          />
        </Grid>

        {/* Region */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small" error={!!getFieldError('region_id')}>
            <InputLabel>Region</InputLabel>
            <Select
              value={formData.region_id}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, region_id: e.target.value }));
                if (localErrors.region_id) {
                  setLocalErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.region_id;
                    return updated;
                  }); }}}
              label="Region"
              disabled={loading}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {regions.map((region) => (
                <MenuItem key={region.id} value={region.id}>
                  {region.name}
                </MenuItem>
              ))}
            </Select>
            {getFieldError('region_id') && (
              <FormHelperText>{getFieldError('region_id')}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Contact Information */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mb: 1 }}>
            <FormHelperText sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
              Contact Information
            </FormHelperText>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Phone Number"
            value={formData.phone}
            onChange={handleChange('phone')}
            error={!!getFieldError('phone')}
            helperText={getFieldError('phone')}
            size="small"
            disabled={loading}
            placeholder="+1234567890"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Website"
            value={formData.website}
            onChange={handleChange('website')}
            error={!!getFieldError('website')}
            helperText={getFieldError('website') || 'Include https:// or http://'}
            size="small"
            disabled={loading}
            placeholder="https://example.com"
          />
        </Grid>

        {/* Address Information */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mb: 1, mt: 1 }}>
            <FormHelperText sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
              Address Information
            </FormHelperText>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Street Address"
            value={formData.street}
            onChange={handleChange('street')}
            error={!!getFieldError('street')}
            helperText={getFieldError('street')}
            size="small"
            disabled={loading}
            placeholder="123 Main Street"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Suburb"
            value={formData.suburb}
            onChange={handleChange('suburb')}
            error={!!getFieldError('suburb')}
            helperText={getFieldError('suburb')}
            size="small"
            disabled={loading}
            placeholder="City/Suburb"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="State/Province"
            value={formData.state}
            onChange={handleChange('state')}
            error={!!getFieldError('state')}
            helperText={getFieldError('state')}
            size="small"
            disabled={loading}
            placeholder="State or Province"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Postcode"
            value={formData.postcode}
            onChange={handleChange('postcode')}
            error={!!getFieldError('postcode')}
            helperText={getFieldError('postcode')}
            size="small"
            disabled={loading}
            placeholder="12345"
          />
        </Grid>

        {/* Country */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small" error={!!getFieldError('country')}>
            <InputLabel>Country</InputLabel>
            <Select
              value={formData.country}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, country: e.target.value }));
                if (localErrors.country) {
                  setLocalErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.country;
                    return updated;
                  }); }}}
              label="Country"
              disabled={loading}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {COUNTRIES.map((country) => (
                <MenuItem key={country.code} value={country.code}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
            {getFieldError('country') && (
              <FormHelperText>{getFieldError('country')}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Form Actions */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? 'Saving...' : mode === 'add' ? 'Create Branch' : 'Update Branch'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
};

