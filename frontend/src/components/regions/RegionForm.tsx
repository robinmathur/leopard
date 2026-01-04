/**
 * RegionForm Component
 * Form for adding/editing region details
 */
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Region,
  RegionCreateRequest,
  RegionUpdateRequest,
} from '@/types/region';

interface RegionFormProps {
  mode: 'add' | 'edit';
  initialData?: Region;
  onSave: (data: RegionCreateRequest | RegionUpdateRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  fieldErrors?: Record<string, string[]>;
}

interface FormData {
  name: string;
  description: string;
}

const initialFormData: FormData = {
  name: '',
  description: '',
};

export const RegionForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  loading = false,
  fieldErrors = {},
}: RegionFormProps) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Populate form with initial data when editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
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

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Build request data
    const submitData: RegionCreateRequest | RegionUpdateRequest = {
      name: formData.name.trim(),
    };

    // Add optional description if provided
    if (formData.description.trim()) {
      submitData.description = formData.description.trim();
    }

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
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Region Name"
            value={formData.name}
            onChange={handleChange('name')}
            fullWidth
            required
            error={!!getFieldError('name')}
            helperText={getFieldError('name')}
            disabled={loading}
            placeholder="Enter region name"
          />
        </Grid>

        {/* Description */}
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Description"
            value={formData.description}
            onChange={handleChange('description')}
            fullWidth
            multiline
            rows={3}
            error={!!getFieldError('description')}
            helperText={getFieldError('description')}
            disabled={loading}
            placeholder="Enter region description (optional)"
          />
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
              {loading ? 'Saving...' : mode === 'add' ? 'Create Region' : 'Update Region'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
};

