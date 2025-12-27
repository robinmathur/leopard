/**
 * UserAutocomplete Component
 * Reusable searchable autocomplete for user selection
 */
import { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Box, Typography } from '@mui/material';
import { User } from '@/types/user';
import httpClient from '@/services/api/httpClient';

interface UserAutocompleteProps {
  value: User | null;
  onChange: (user: User | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  required?: boolean;
}

export const UserAutocomplete = ({
  value,
  onChange,
  label = 'User',
  placeholder = 'Search by name, email, or username...',
  disabled = false,
  error = false,
  helperText,
  size = 'small',
  required = false,
}: UserAutocompleteProps) => {
  const [options, setOptions] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Search users with debouncing
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length < 2) {
        setOptions([]);
        return;
      }

      try {
        setLoading(true);
        const response = await httpClient.get<{ count: number; results: User[] }>(
          '/v1/users/',
          {
            params: {
              search: searchTerm,
              page_size: 20,
              is_active: true,
            },
          }
        );
        setOptions(response.data.results);
      } catch (err) {
        console.error('Failed to search users:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={searchTerm}
      onInputChange={(_, newInputValue) => setSearchTerm(newInputValue)}
      options={options}
      getOptionLabel={(option) =>
        option.full_name || `${option.first_name} ${option.last_name}`.trim()
      }
      loading={loading}
      disabled={disabled}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={
        searchTerm.length < 2
          ? 'Type at least 2 characters to search...'
          : 'No users found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={required ? `${label} *` : label}
          placeholder={placeholder}
          size={size}
          error={error}
          helperText={helperText || 'Type to search for users'}
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
            <Typography variant="body2">
              {option.full_name || `${option.first_name} ${option.last_name}`.trim()}
            </Typography>
            {option.email && (
              <Typography variant="caption" color="text.secondary">
                {option.email}
              </Typography>
            )}
            {option.primary_group && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                • {option.primary_group.replace('_', ' ')}
              </Typography>
            )}
          </Box>
        </li>
      )}
    />
  );
};

export default UserAutocomplete;
