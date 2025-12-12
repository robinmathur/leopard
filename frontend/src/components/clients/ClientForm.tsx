/**
 * ClientForm Component
 * Form for adding/editing client details
 */
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  Button,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
} from '@mui/material';
import {
  Client,
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientStage,
  Gender,
  STAGE_LABELS,
  GENDER_LABELS,
  COUNTRIES,
} from '@/types/client';

interface ClientFormProps {
  mode: 'add' | 'edit';
  initialData?: Client;
  onSave: (data: ClientCreateRequest | ClientUpdateRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  fieldErrors?: Record<string, string[]>;
}

interface FormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: Gender;
  dob: string;
  country: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  stage: ClientStage;
  description: string;
  referred_by: string;
}

const initialFormData: FormData = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  gender: 'MALE',
  dob: '',
  country: 'AU',
  street: '',
  suburb: '',
  state: '',
  postcode: '',
  stage: 'LE',
  description: '',
  referred_by: '',
};

export const ClientForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  loading = false,
  fieldErrors = {},
}: ClientFormProps) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Populate form with initial data when editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        first_name: initialData.first_name || '',
        middle_name: initialData.middle_name || '',
        last_name: initialData.last_name || '',
        email: initialData.email || '',
        phone_number: initialData.phone_number || '',
        gender: initialData.gender || 'MALE',
        dob: initialData.dob || '',
        country: initialData.country || 'AU',
        street: initialData.street || '',
        suburb: initialData.suburb || '',
        state: initialData.state || '',
        postcode: initialData.postcode || '',
        stage: initialData.stage || 'LE',
        description: initialData.description || '',
        referred_by: initialData.referred_by || '',
      });
    }
  }, [mode, initialData]);

  const handleChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear local error when field changes
    if (localErrors[field]) {
      setLocalErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!formData.country) {
      errors.country = 'Country is required';
    }
    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Phone validation (optional but should be reasonable if provided)
    if (formData.phone_number && formData.phone_number.length < 8) {
      errors.phone_number = 'Phone number is too short';
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    // Build request data - only include non-empty values
    const data: ClientCreateRequest | ClientUpdateRequest = {
      first_name: formData.first_name,
      gender: formData.gender,
      country: formData.country,
    };

    // Add optional fields if they have values
    if (formData.middle_name) data.middle_name = formData.middle_name;
    if (formData.last_name) data.last_name = formData.last_name;
    if (formData.email) data.email = formData.email;
    if (formData.phone_number) data.phone_number = formData.phone_number;
    if (formData.dob) data.dob = formData.dob;
    if (formData.street) data.street = formData.street;
    if (formData.suburb) data.suburb = formData.suburb;
    if (formData.state) data.state = formData.state;
    if (formData.postcode) data.postcode = formData.postcode;
    if (formData.description) data.description = formData.description;
    if (formData.referred_by) data.referred_by = formData.referred_by;

    // Only include stage for add mode (edit uses MoveStageDialog)
    if (mode === 'add') {
      (data as ClientCreateRequest).stage = formData.stage;
    }

    await onSave(data);
  };

  const getFieldError = (field: string): string | undefined => {
    if (localErrors[field]) return localErrors[field];
    if (fieldErrors[field]) return fieldErrors[field].join(', ');
    return undefined;
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Grid container spacing={2}>
        {/* Name Fields */}
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="First Name"
            value={formData.first_name}
            onChange={handleChange('first_name')}
            error={!!getFieldError('first_name')}
            helperText={getFieldError('first_name')}
            size="small"
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Middle Name"
            value={formData.middle_name}
            onChange={handleChange('middle_name')}
            error={!!getFieldError('middle_name')}
            helperText={getFieldError('middle_name')}
            size="small"
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Last Name"
            value={formData.last_name}
            onChange={handleChange('last_name')}
            error={!!getFieldError('last_name')}
            helperText={getFieldError('last_name')}
            size="small"
            disabled={loading}
          />
        </Grid>

        {/* Contact Fields */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            error={!!getFieldError('email')}
            helperText={getFieldError('email')}
            size="small"
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone Number"
            value={formData.phone_number}
            onChange={handleChange('phone_number')}
            error={!!getFieldError('phone_number')}
            helperText={getFieldError('phone_number')}
            size="small"
            disabled={loading}
          />
        </Grid>

        {/* Gender */}
        <Grid item xs={12} sm={6}>
          <FormControl component="fieldset" error={!!getFieldError('gender')}>
            <FormLabel component="legend" sx={{ fontSize: '0.875rem' }}>
              Gender *
            </FormLabel>
            <RadioGroup
              row
              value={formData.gender}
              onChange={handleChange('gender')}
            >
              {(Object.keys(GENDER_LABELS) as Gender[]).map((gender) => (
                <FormControlLabel
                  key={gender}
                  value={gender}
                  control={<Radio size="small" disabled={loading} />}
                  label={GENDER_LABELS[gender]}
                />
              ))}
            </RadioGroup>
            {getFieldError('gender') && (
              <FormHelperText>{getFieldError('gender')}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Date of Birth */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Date of Birth"
            type="date"
            value={formData.dob}
            onChange={handleChange('dob')}
            error={!!getFieldError('dob')}
            helperText={getFieldError('dob')}
            size="small"
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Country */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small" error={!!getFieldError('country')} required>
            <InputLabel>Country</InputLabel>
            <Select
              value={formData.country}
              onChange={handleChange('country')}
              label="Country"
              disabled={loading}
            >
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

        {/* Stage (only for add mode) */}
        {mode === 'add' && (
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Stage</InputLabel>
              <Select
                value={formData.stage}
                onChange={handleChange('stage')}
                label="Stage"
                disabled={loading}
              >
                {(Object.keys(STAGE_LABELS) as ClientStage[]).map((stage) => (
                  <MenuItem key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Address Fields */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Street Address"
            value={formData.street}
            onChange={handleChange('street')}
            error={!!getFieldError('street')}
            helperText={getFieldError('street')}
            size="small"
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Suburb"
            value={formData.suburb}
            onChange={handleChange('suburb')}
            error={!!getFieldError('suburb')}
            helperText={getFieldError('suburb')}
            size="small"
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="State"
            value={formData.state}
            onChange={handleChange('state')}
            error={!!getFieldError('state')}
            helperText={getFieldError('state')}
            size="small"
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Postcode"
            value={formData.postcode}
            onChange={handleChange('postcode')}
            error={!!getFieldError('postcode')}
            helperText={getFieldError('postcode')}
            size="small"
            disabled={loading}
          />
        </Grid>

        {/* Additional Fields */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Referred By"
            value={formData.referred_by}
            onChange={handleChange('referred_by')}
            error={!!getFieldError('referred_by')}
            helperText={getFieldError('referred_by')}
            size="small"
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description / Notes"
            value={formData.description}
            onChange={handleChange('description')}
            error={!!getFieldError('description')}
            helperText={getFieldError('description')}
            size="small"
            multiline
            rows={3}
            disabled={loading}
          />
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
            >
              {loading ? 'Saving...' : mode === 'add' ? 'Add Client' : 'Save Changes'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClientForm;
