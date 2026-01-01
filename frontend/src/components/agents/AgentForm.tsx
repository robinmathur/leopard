/**
 * AgentForm Component
 * Form for adding/editing agent details
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
  CircularProgress,
} from '@mui/material';
import {
  Agent,
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentType,
  AGENT_TYPE_LABELS,
  COUNTRIES,
} from '@/types/agent';

interface AgentFormProps {
  mode: 'add' | 'edit';
  initialData?: Agent;
  onSave: (data: AgentCreateRequest | AgentUpdateRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  fieldErrors?: Record<string, string[]>;
}

interface FormData {
  agent_name: string;
  agent_type: AgentType;
  phone_number: string;
  email: string;
  website: string;
  invoice_to: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  description: string;
}

const initialFormData: FormData = {
  agent_name: '',
  agent_type: 'SUB_AGENT',
  phone_number: '',
  email: '',
  website: '',
  invoice_to: '',
  street: '',
  suburb: '',
  state: '',
  postcode: '',
  country: '',
  description: '',
};

export const AgentForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  loading = false,
  fieldErrors = {},
}: AgentFormProps) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Populate form with initial data when editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        agent_name: initialData.agent_name || '',
        agent_type: initialData.agent_type || 'SUB_AGENT',
        phone_number: initialData.phone_number || '',
        email: initialData.email || '',
        website: initialData.website || '',
        invoice_to: initialData.invoice_to || '',
        street: initialData.street || '',
        suburb: initialData.suburb || '',
        state: initialData.state || '',
        postcode: initialData.postcode || '',
        country: initialData.country || '',
        description: initialData.description || '',
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
    if (!formData.agent_name.trim()) {
      errors.agent_name = 'Agent name is required';
    }
    if (!formData.agent_type) {
      errors.agent_type = 'Agent type is required';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Website validation (optional but must be valid URL if provided)
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      errors.website = 'Website must be a valid URL (e.g., https://example.com)';
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

    // Build request data - only include non-empty values for optional fields
    const data: AgentCreateRequest | AgentUpdateRequest = {
      agent_name: formData.agent_name.trim(),
      agent_type: formData.agent_type,
    };

    // Add optional fields if they have values
    if (formData.phone_number.trim()) data.phone_number = formData.phone_number.trim();
    if (formData.email.trim()) data.email = formData.email.trim();
    if (formData.website.trim()) data.website = formData.website.trim();
    if (formData.invoice_to.trim()) data.invoice_to = formData.invoice_to.trim();
    if (formData.street.trim()) data.street = formData.street.trim();
    if (formData.suburb.trim()) data.suburb = formData.suburb.trim();
    if (formData.state.trim()) data.state = formData.state.trim();
    if (formData.postcode.trim()) data.postcode = formData.postcode.trim();
    if (formData.country) data.country = formData.country;
    if (formData.description.trim()) data.description = formData.description.trim();

    await onSave(data);
  };

  const getFieldError = (field: string): string | undefined => {
    if (localErrors[field]) return localErrors[field];
    if (fieldErrors[field] && fieldErrors[field].length > 0) {
      return fieldErrors[field][0];
    }
    return undefined;
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Grid container spacing={2}>
        {/* Agent Name */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            required
            fullWidth
            label="Agent Name"
            value={formData.agent_name}
            onChange={handleChange('agent_name')}
            error={!!getFieldError('agent_name')}
            helperText={getFieldError('agent_name')}
            size="small"
            disabled={loading}
            placeholder="Enter agent name"
          />
        </Grid>

        {/* Agent Type */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth required size="small" error={!!getFieldError('agent_type')}>
            <InputLabel>Agent Type</InputLabel>
            <Select
              value={formData.agent_type}
              onChange={handleChange('agent_type')}
              label="Agent Type"
              disabled={loading}
            >
              {(Object.keys(AGENT_TYPE_LABELS) as AgentType[]).map((type) => (
                <MenuItem key={type} value={type}>
                  {AGENT_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </Select>
            {getFieldError('agent_type') && (
              <FormHelperText>{getFieldError('agent_type')}</FormHelperText>
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
            value={formData.phone_number}
            onChange={handleChange('phone_number')}
            error={!!getFieldError('phone_number')}
            helperText={getFieldError('phone_number')}
            size="small"
            disabled={loading}
            placeholder="+1234567890"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
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
            placeholder="agent@example.com"
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

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" error={!!getFieldError('country')}>
            <InputLabel>Country</InputLabel>
            <Select
              value={formData.country}
              onChange={handleChange('country')}
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

        {/* Invoice Information */}
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Invoice To"
            value={formData.invoice_to}
            onChange={handleChange('invoice_to')}
            error={!!getFieldError('invoice_to')}
            helperText={getFieldError('invoice_to')}
            size="small"
            disabled={loading}
            placeholder="Billing address or contact name"
          />
        </Grid>

        {/* Description */}
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={handleChange('description')}
            error={!!getFieldError('description')}
            helperText={getFieldError('description')}
            size="small"
            disabled={loading}
            multiline
            rows={3}
            placeholder="Additional notes or information about the agent"
          />
        </Grid>

        {/* Action Buttons */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
              size="small"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              size="small"
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? 'Saving...' : mode === 'add' ? 'Create Agent' : 'Update Agent'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
