/**
 * Global Search Component
 * 
 * Provides a unified search interface in the AppBar that allows users to search
 * across all entity types (Client, Visa Application, College Application, Agent, Institute)
 * using names, emails, phone numbers, or virtual IDs.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  ListSubheader,
  Paper,
  CircularProgress,
  Chip,
  alpha,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import SchoolIcon from '@mui/icons-material/School';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import { globalSearch } from '@/services/api/globalSearchApi';
import type { SearchResult } from '@/types/globalSearch';
import { parseVirtualId } from '@/utils/virtualId';

const StyledAutocomplete = styled(Autocomplete<SearchResult, false, false, false>)(({ theme }) => ({
  width: '100%',
  maxWidth: '600px',
  '& .MuiOutlinedInput-root': {
    padding: theme.spacing(0.5, 1),
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    '&.Mui-focused': {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    '& fieldset': {
      border: 'none',
    },
  },
  '& .MuiInputBase-input': {
    fontSize: '0.8125rem',
    padding: theme.spacing(0.5, 0),
  },
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(1),
  maxHeight: '400px',
}));

const ResultItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, 1.5),
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const ResultContent = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const ResultMetadata = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginTop: theme.spacing(0.5),
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

const VirtualIdChip = styled(Chip)(({ theme }) => ({
  height: '20px',
  fontSize: '0.6875rem',
  marginLeft: theme.spacing(0.5),
}));

/**
 * Get icon for entity type
 */
function getEntityIcon(type: SearchResult['type']) {
  switch (type) {
    case 'client':
      return <PersonIcon fontSize="small" />;
    case 'visa-application':
      return <FlightTakeoffIcon fontSize="small" />;
    case 'college-application':
      return <SchoolIcon fontSize="small" />;
    case 'agent':
      return <AccountBoxIcon fontSize="small" />;
    case 'institute':
      return <BusinessIcon fontSize="small" />;
    default:
      return <SearchIcon fontSize="small" />;
  }
}

/**
 * Get label for entity type
 */
function getEntityTypeLabel(type: SearchResult['type']): string {
  switch (type) {
    case 'client':
      return 'Clients';
    case 'visa-application':
      return 'Visa Applications';
    case 'college-application':
      return 'College Applications';
    case 'agent':
      return 'Agents';
    case 'institute':
      return 'Institutes';
    default:
      return 'Results';
  }
}


interface GlobalSearchProps {
  /** Placeholder text */
  placeholder?: string;
}

export const GlobalSearch = ({ placeholder = 'Search clients, applications...' }: GlobalSearchProps) => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Perform search
   */
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setOpen(true);

    try {
      const results = await globalSearch({
        query: query.trim(),
        signal: abortControllerRef.current.signal,
      });

      // If it's a virtual ID, navigate directly
      if (results.isVirtualId && results.virtualId) {
        navigate(results.virtualId.route);
        setInputValue('');
        setOpen(false);
        return;
      }

      setOptions(results.results);
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Search error:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  /**
   * Handle input change
   */
  const handleInputChange = (event: React.SyntheticEvent, newValue: string) => {
    setInputValue(newValue);
  };

  /**
   * Handle key down - trigger search on Enter
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && inputValue.trim()) {
      event.preventDefault();
      performSearch(inputValue);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  /**
   * Handle option selection
   */
  const handleChange = (event: React.SyntheticEvent, value: SearchResult | null) => {
    if (value) {
      navigate(value.route);
      setInputValue('');
      setOpen(false);
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const hasResults = options.length > 0;

  return (
    <StyledAutocomplete
      open={open && (hasResults || loading)}
      onOpen={() => {
        if (inputValue.trim() && !loading) {
          setOpen(true);
        }
      }}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      getOptionLabel={(option) => option.displayName}
      isOptionEqualToValue={(option, value) => option.id === value.id && option.type === value.type}
      filterOptions={(x) => x} // Disable default filtering, we handle it server-side
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} />
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={`${option.type}-${option.id}`}>
          <ResultItem>
            {getEntityIcon(option.type)}
            <ResultContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" noWrap>
                  {option.displayName}
                </Typography>
                <VirtualIdChip
                  label={option.virtualId}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.6875rem' }}
                />
              </Box>
              {option.metadata && (
                <ResultMetadata>
                  {option.metadata.email && (
                    <Typography variant="caption" noWrap>
                      {option.metadata.email}
                    </Typography>
                  )}
                  {option.metadata.phone && (
                    <Typography variant="caption" noWrap>
                      {option.metadata.phone}
                    </Typography>
                  )}
                  {option.metadata.subtitle && (
                    <Typography variant="caption" noWrap>
                      {option.metadata.subtitle}
                    </Typography>
                  )}
                </ResultMetadata>
              )}
            </ResultContent>
          </ResultItem>
        </li>
      )}
      groupBy={(option) => option.type}
      renderGroup={(params) => (
        <li key={params.key}>
          <ListSubheader sx={{ bgcolor: 'background.paper' }}>
            {getEntityTypeLabel(params.group as SearchResult['type'])}
          </ListSubheader>
          {params.children}
        </li>
      )}
      PaperComponent={StyledPaper}
      noOptionsText={
        loading ? 'Searching...' : inputValue.trim() ? 'No results found' : 'Type to search'
      }
      ListboxProps={{
        style: { maxHeight: '400px' },
      }}
    />
  );
};

