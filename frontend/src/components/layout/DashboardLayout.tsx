import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { useNotificationStore } from '@/store/notificationStore';

/**
 * Main Dashboard Layout
 * Provides the application shell with AppBar, Sidebar, and content area
 */
export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { connectSSE, disconnectSSE, isSSEConnected } = useNotificationStore();

  // Connect SSE when dashboard mounts (user is authenticated)
  useEffect(() => {
    console.log('DashboardLayout: Connecting SSE...');
    connectSSE();
    
    // Disconnect on unmount (logout)
    return () => {
      console.log('DashboardLayout: Disconnecting SSE...');
      disconnectSSE();
    };
  }, [connectSSE, disconnectSSE]);

  // Log SSE connection status changes
  useEffect(() => {
    console.log('DashboardLayout: SSE connected =', isSSEConnected);
  }, [isSSEConnected]);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* Global Header */}
      <AppBar open={sidebarOpen} onMenuClick={handleToggleSidebar} />

      {/* Collapsible Sidebar */}
      <Sidebar open={sidebarOpen} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          mt: '48px', // AppBar height
          minHeight: 'calc(100vh - 48px)',
          backgroundColor: 'background.default',
          transition: (theme) =>
            theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

