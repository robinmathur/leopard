/**
 * UserForm Component
 * Form for adding/editing user details
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Autocomplete, Chip } from '@mui/material';
import { GROUP_OPTIONS } from '@/constants/groups';
import type { User, UserCreateRequest, UserUpdateRequest } from '@/types/user';
import type { BranchData } from '@/auth/types';

interface UserFormProps {
  mode: 'add' | 'edit';
  initialData?: User;
  onSave: (data: UserCreateRequest | UserUpdateRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  fieldErrors?: Record<string, string[]>;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  group_name: string;
  tenant_id: string;
  branch_ids: number[];
  is_active: boolean;
}

const initialFormData: FormData = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  first_name: '',
  last_name: '',
  group_name: 'CONSULTANT',
  tenant_id: '',
  branch_ids: [],
  is_active: true,
};

export const UserForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  loading = false,
  fieldErrors = {},
}: UserFormProps) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        // Get branches from current user's profile or fetch from API
        // For now, we'll use the branches from the current user's auth store
        // In a real scenario, you'd have a branches API endpoint
        const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
        if (currentUser.branches) {
          setBranches(currentUser.branches);
        }
      } catch (error) {
        console.error('Failed to fetch branches:', error);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  // Populate form with initial data when editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        username: initialData.username || '',
        email: initialData.email || '',
        password: '', // Don't populate password
        confirmPassword: '', // Don't populate confirm password
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        group_name: initialData.primary_group || 'CONSULTANT',
        tenant_id: initialData.tenant ? String(initialData.tenant) : '',
        branch_ids: initialData.branches_data?.map(b => b.id) || [],
        is_active: initialData.is_active,
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

  const handleCheckboxChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.checked }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (mode === 'add' && !formData.username.trim()) {
      errors.username = 'Username is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (mode === 'add' && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (mode === 'add' && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (mode === 'edit' && formData.password && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (!formData.group_name) {
      errors.group_name = 'Group is required';
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData: UserCreateRequest | UserUpdateRequest = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      group_name: formData.group_name,
      is_active: formData.is_active,
    };

    if (mode === 'add') {
      (submitData as UserCreateRequest).username = formData.username;
      (submitData as UserCreateRequest).password = formData.password;
    } else if (formData.password) {
      (submitData as UserUpdateRequest).password = formData.password;
    }

    if (formData.tenant_id) {
      submitData.tenant_id = parseInt(formData.tenant_id, 10);
    }

    if (formData.branch_ids.length > 0) {
      submitData.branch_ids = formData.branch_ids;
    }

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
        {/* Username (only for add mode) */}
        {mode === 'add' && (
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Username"
              value={formData.username}
              onChange={handleChange('username')}
              error={!!getFieldError('username')}
              helperText={getFieldError('username')}
              size="small"
              disabled={loading}
            />
          </Grid>
        )}

        {/* Email */}
        <Grid item xs={12} sm={mode === 'add' ? 6 : 12}>
          <TextField
            required
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

        {/* Password */}
        <Grid item xs={12} sm={6}>
          <TextField
            required={mode === 'add'}
            fullWidth
            label={mode === 'add' ? 'Password' : 'New Password (leave blank to keep current)'}
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            error={!!getFieldError('password')}
            helperText={getFieldError('password')}
            size="small"
            disabled={loading}
          />
        </Grid>

        {/* Confirm Password */}
        {(mode === 'add' || formData.password) && (
          <Grid item xs={12} sm={6}>
            <TextField
              required={mode === 'add' || !!formData.password}
              fullWidth
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={!!getFieldError('confirmPassword')}
              helperText={getFieldError('confirmPassword')}
              size="small"
              disabled={loading}
            />
          </Grid>
        )}

        {/* First Name */}
        <Grid item xs={12} sm={6}>
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

        {/* Last Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            required
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

        {/* Group */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small" required error={!!getFieldError('group_name')}>
            <InputLabel>Group</InputLabel>
            <Select
              value={formData.group_name}
              onChange={handleChange('group_name')}
              label="Group"
              disabled={loading}
            >
              {GROUP_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {getFieldError('group_name') && (
              <FormHelperText>{getFieldError('group_name')}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Tenant ID */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Tenant ID"
            type="number"
            value={formData.tenant_id}
            onChange={handleChange('tenant_id')}
            error={!!getFieldError('tenant_id')}
            helperText={getFieldError('tenant_id')}
            size="small"
            disabled={loading}
          />
        </Grid>

        {/* Branches */}
        <Grid item xs={12} sm={6}>
          <Autocomplete
            multiple
            options={branches}
            getOptionLabel={(option) => option.name}
            value={branches.filter(b => formData.branch_ids.includes(b.id))}
            onChange={(_, newValue) => {
              setFormData((prev) => ({
                ...prev,
                branch_ids: newValue.map(b => b.id),
              }));
            }}
            loading={loadingBranches}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Branches"
                size="small"
                placeholder="Select branches"
                disabled={loading || loadingBranches}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.name}
                  {...getTagProps({ index })}
                  size="small"
                  disabled={loading}
                />
              ))
            }
            disabled={loading || loadingBranches}
          />
        </Grid>

        {/* Active Status */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_active}
                onChange={handleCheckboxChange('is_active')}
                disabled={loading}
              />
            }
            label="Active"
          />
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
              {loading ? 'Saving...' : mode === 'add' ? 'Create User' : 'Update User'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

