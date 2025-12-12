import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';

/**
 * Main Dashboard Layout
 * Provides the application shell with AppBar, Sidebar, and content area
 */
export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

