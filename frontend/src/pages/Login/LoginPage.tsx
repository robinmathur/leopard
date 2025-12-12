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
  Divider,
  CircularProgress,
} from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { MOCK_USERS } from '@/auth/types';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, error, isLoading, isAuthenticated, initializeFromStorage } = useAuthStore();
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('password123');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  const handleQuickLogin = (loginUsername: string) => {
    setUsername(loginUsername);
    setPassword('password123');
  };

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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Multi-Tenant SaaS Platform
          </Typography>

          {error && (
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
              disabled={isLoading}
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
              disabled={isLoading}
              autoComplete="current-password"
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="medium"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Quick Login (Demo):
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Object.entries(MOCK_USERS).map(([key, user]) => (
              <Button
                key={key}
                variant="outlined"
                size="small"
                onClick={() => handleQuickLogin(user.username)}
                disabled={isLoading}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                {user.firstName} {user.lastName} ({user.role.replace('_', ' ')})
              </Button>
            ))}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Password for all demo accounts: password123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
