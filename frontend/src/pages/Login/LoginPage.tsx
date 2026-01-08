import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { tenantApi } from '@/services/api/tenantApi';
import type { ApiError } from '@/services/api/httpClient';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, error, isLoading, isAuthenticated, initializeFromStorage } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);
  const [isTenantInvalid, setIsTenantInvalid] = useState(false);

  // Initialize auth state from storage on mount
  useEffect(() => {
    initializeFromStorage();
  }, [initializeFromStorage]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch tenant information on mount
  useEffect(() => {
    const fetchTenantInfo = async () => {
      try {
        setIsLoadingTenant(true);
        setTenantError(null);
        setTenantName(null);
        setIsTenantInvalid(false);
        
        const tenantInfo = await tenantApi.getTenantInfo();
        
        console.log('Tenant info received:', tenantInfo);
        
        if (tenantInfo && tenantInfo.tenant_name) {
          setTenantName(tenantInfo.tenant_name);
        } else {
          console.warn('Tenant info missing or invalid:', tenantInfo);
          setTenantError('Unable to verify tenant. Please check your URL.');
          setIsTenantInvalid(false);
        }
      } catch (err: any) {
        console.error('Error fetching tenant info:', err);
        
        // Check if it's an axios error
        const status = err?.response?.status || err?.status;
        const message = err?.message || err?.response?.data?.detail || 'Unknown error';
        
        if (status === 404) {
          setTenantError('Invalid URL - This URL is not associated with any organization.');
          setIsTenantInvalid(true);
        } else if (status === 304 || message.includes('Cached response')) {
          // 304 Not Modified or cache-related error
          setTenantError('Unable to verify tenant. Please refresh the page or clear your browser cache.');
          setIsTenantInvalid(false);
        } else {
          // For other errors (network, etc.), show warning but allow login attempt
          setTenantError('Unable to verify tenant. Please check your URL.');
          setIsTenantInvalid(false);
        }
      } finally {
        setIsLoadingTenant(false);
      }
    };

    fetchTenantInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent login if tenant is invalid (404)
    if (isTenantInvalid) {
      return;
    }
    await login(username, password);
  };

  // Disable form when tenant is invalid (404) or while loading
  const isFormDisabled = isLoading || isTenantInvalid || isLoadingTenant;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom color="primary">
            Immigration CRM
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Multi-Tenant SaaS Platform
          </Typography>

          {/* Tenant Name Display */}
          {isLoadingTenant ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          ) : tenantName ? (
            <Typography variant="h6" fontWeight={600} color="primary" sx={{ mb: 3 }}>
              {tenantName}
            </Typography>
          ) : null}

          {/* Tenant Error Display */}
          {tenantError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {tenantError}
            </Alert>
          )}

          {/* Login Error Display */}
          {error && !tenantError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
              required
              disabled={isFormDisabled}
              autoComplete="username"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
              sx={{ mb: 3 }}
              required
              disabled={isFormDisabled}
              autoComplete="current-password"
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="medium"
              disabled={isFormDisabled}
              startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};
