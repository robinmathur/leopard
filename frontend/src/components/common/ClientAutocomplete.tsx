/**
 * ClientAutocomplete Component
 * Reusable searchable autocomplete for client selection
 */
import { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Box, Typography } from '@mui/material';
import { Client } from '@/types/client';
import httpClient from '@/services/api/httpClient';

interface ClientAutocompleteProps {
  value: Client | null;
  onChange: (client: Client | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  required?: boolean;
}

export const ClientAutocomplete = ({
  value,
  onChange,
  label = 'Client',
  placeholder = 'Search by name or email...',
  disabled = false,
  error = false,
  helperText,
  size = 'small',
  required = false,
}: ClientAutocompleteProps) => {
  const [options, setOptions] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Search clients with debouncing
  useEffect(() => {
    const searchClients = async () => {
      if (searchTerm.length < 2) {
        setOptions([]);
        return;
      }

      try {
        setLoading(true);
        const response = await httpClient.get<{ count: number; results: Client[] }>(
          '/v1/clients/',
          {
            params: {
              search: searchTerm,
              page_size: 20,
            },
          }
        );
        setOptions(response.data.results);
      } catch (err) {
        console.error('Failed to search clients:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchClients, 300);
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
        `${option.first_name} ${option.last_name}`.trim() || option.email
      }
      loading={loading}
      disabled={disabled}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={
        searchTerm.length < 2
          ? 'Type at least 2 characters to search...'
          : 'No clients found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={required ? `${label} *` : label}
          placeholder={placeholder}
          size={size}
          error={error}
          helperText={helperText || 'Type to search for clients'}
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
              {`${option.first_name} ${option.last_name}`.trim()}
            </Typography>
            {option.email && (
              <Typography variant="caption" color="text.secondary">
                {option.email}
              </Typography>
            )}
            {option.stage && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                • {option.stage.replace('_', ' ')}
              </Typography>
            )}
          </Box>
        </li>
      )}
    />
  );
};

export default ClientAutocomplete;
