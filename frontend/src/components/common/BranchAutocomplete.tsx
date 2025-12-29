/**
 * BranchAutocomplete Component
 * Reusable searchable autocomplete for branch selection
 */
import { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Box, Typography } from '@mui/material';
import { Branch } from '@/types/branch';
import { branchApi } from '@/services/api/branchApi';

interface BranchAutocompleteProps {
  value: Branch | null;
  onChange: (branch: Branch | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  required?: boolean;
}

export const BranchAutocomplete = ({
  value,
  onChange,
  label = 'Branch',
  placeholder = 'Search by branch name...',
  disabled = false,
  error = false,
  helperText,
  size = 'small',
  required = false,
}: BranchAutocompleteProps) => {
  const [options, setOptions] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Search branches with debouncing
  useEffect(() => {
    const searchBranches = async () => {
      if (searchTerm.length < 2) {
        setOptions([]);
        return;
      }

      try {
        setLoading(true);
        const response = await branchApi.list({
          search: searchTerm,
          page_size: 20,
        });
        setOptions(response.results);
      } catch (err) {
        console.error('Failed to search branches:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchBranches, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={searchTerm}
      onInputChange={(_, newInputValue) => setSearchTerm(newInputValue)}
      options={options}
      getOptionLabel={(option) => option.name}
      loading={loading}
      disabled={disabled}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={
        searchTerm.length < 2
          ? 'Type at least 2 characters to search...'
          : 'No branches found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={required ? `${label} *` : label}
          placeholder={placeholder}
          size={size}
          error={error}
          helperText={helperText || 'Type to search for branches'}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box>
            <Typography variant="body2">{option.name}</Typography>
            {option.suburb && option.state && (
              <Typography variant="caption" color="text.secondary">
                {option.suburb}, {option.state}
              </Typography>
            )}
          </Box>
        </li>
      )}
    />
  );
};

export default BranchAutocomplete;

