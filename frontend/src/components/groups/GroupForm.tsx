/**
 * GroupForm Component
 * Form for adding/editing group details
 */
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormHelperText,
  Grid,
  Button,
  CircularProgress,
} from '@mui/material';
import type { Group, GroupCreateRequest, GroupUpdateRequest } from '@/types/user';

interface GroupFormProps {
  mode: 'add' | 'edit';
  initialData?: Group;
  onSave: (data: GroupCreateRequest | GroupUpdateRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  fieldErrors?: Record<string, string[]>;
}

interface FormData {
  name: string;
}

const initialFormData: FormData = {
  name: '',
};

export const GroupForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  loading = false,
  fieldErrors = {},
}: GroupFormProps) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Populate form with initial data when editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name || '',
      });
    }
  }, [mode, initialData]);

  const handleChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
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

    if (!formData.name.trim()) {
      errors.name = 'Group name is required';
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData: GroupCreateRequest | GroupUpdateRequest = {
      name: formData.name,
    };

    await onSave(submitData);
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
        {/* Group Name */}
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Group Name"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!getFieldError('name')}
            helperText={getFieldError('name')}
            size="small"
            disabled={loading}
            placeholder="e.g., CUSTOM_GROUP"
          />
          {mode === 'edit' && (
            <FormHelperText sx={{ mt: 0.5 }}>
              Note: Permissions can be assigned after creating/editing the group.
            </FormHelperText>
          )}
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
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
              {loading ? 'Saving...' : mode === 'add' ? 'Create Group' : 'Update Group'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

