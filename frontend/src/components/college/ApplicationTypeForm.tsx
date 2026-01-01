/**
 * ApplicationTypeForm - Form for creating/editing application types
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Grid,
} from '@mui/material';
import type { ApplicationType, ApplicationTypeCreateRequest } from '@/types/collegeApplication';

interface ApplicationTypeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ApplicationTypeCreateRequest) => void;
  initialData?: ApplicationType;
  loading?: boolean;
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
];

export const ApplicationTypeForm: React.FC<ApplicationTypeFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = React.useState({
    title: initialData?.title || '',
    currency: initialData?.currency || 'USD',
    tax_name: initialData?.tax_name || '',
    tax_percentage: initialData?.tax_percentage || '0',
    description: initialData?.description || '',
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        currency: initialData.currency,
        tax_name: initialData.tax_name || '',
        tax_percentage: initialData.tax_percentage,
        description: initialData.description || '',
      });
    }
  }, [initialData]);

  const handleChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      title: formData.title,
      currency: formData.currency,
      tax_name: formData.tax_name || undefined,
      tax_percentage: parseFloat(formData.tax_percentage),
      description: formData.description || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Application Type' : 'Create Application Type'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={handleChange('title')}
                required
                placeholder="e.g., Undergraduate, Postgraduate"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Currency"
                value={formData.currency}
                onChange={handleChange('currency')}
                required
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Tax Name"
                value={formData.tax_name}
                onChange={handleChange('tax_name')}
                placeholder="e.g., GST, VAT"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Tax Percentage (%)"
                value={formData.tax_percentage}
                onChange={handleChange('tax_percentage')}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
                placeholder="Optional description of this application type"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : initialData ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
