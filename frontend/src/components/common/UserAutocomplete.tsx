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

  // Load all assignable users in same branch/team on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const response = await httpClient.get<{ count: number; results: User[] }>(
          '/v1/users/assignable/', // New endpoint - no special permissions required
          {
            params: {
              page_size: 100, // Load up to 100 users from same branch/team
              is_active: true,
            },
          }
        );
        setOptions(response.data.results);
      } catch (err) {
        console.error('Failed to load assignable users:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []); // Load once on mount

  // Filter options based on search term (client-side filtering)
  const filteredOptions = searchTerm
    ? options.filter((user) => {
        const fullName = user.full_name || `${user.first_name} ${user.last_name}`.trim();
        const searchLower = searchTerm.toLowerCase();
        return (
          fullName.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower)
        );
      })
    : options;

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={searchTerm}
      onInputChange={(_, newInputValue) => setSearchTerm(newInputValue)}
      options={filteredOptions}
      getOptionLabel={(option) =>
        option.full_name || `${option.first_name} ${option.last_name}`.trim()
      }
      loading={loading}
      disabled={disabled}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={searchTerm ? 'No users found' : 'No users available'}
      renderInput={(params) => (
        <TextField
          {...params}
          label={required ? `${label} *` : label}
          placeholder={placeholder}
          size={size}
          error={error}
          helperText={helperText || `${options.length} user(s) from your branch/team`}
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
