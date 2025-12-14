import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme/theme';
import { useAuthStore } from './store/authStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/Login/LoginPage';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { ClientsPage } from './pages/Clients/ClientsPage';
import { ClientDetailPage } from './pages/Clients/ClientDetailPage';
import { LeadsPage } from './pages/Leads/LeadsPage';
import { InstitutePage } from './pages/Institute/InstitutePage';
import { AgentPage } from './pages/Agent/AgentPage';
import { VisaDashboard } from './pages/VisaManager/VisaDashboard';
import { VisaTracker } from './pages/VisaManager/VisaTracker';
import { VisaTypePage } from './pages/VisaManager/VisaTypePage';
import { VisaApplicationsManagementPage } from './pages/VisaManager/VisaApplicationsManagementPage';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Main Application Component
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/add" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="leads" element={<LeadsPage />} />
            
            {/* Visa Manager Routes */}
            <Route path="visa-manager/dashboard" element={<VisaDashboard />} />
            <Route path="visa-manager/tracker" element={<VisaTracker />} />
            <Route path="visa-manager/applications" element={<VisaApplicationsManagementPage />} />
            <Route path="visa-manager/types" element={<VisaTypePage />} />
            
            {/* Legacy route - redirect to Visa Dashboard */}
            <Route path="visa-applications" element={<Navigate to="/visa-manager/dashboard" replace />} />
            
            <Route path="institute" element={<InstitutePage />} />
            <Route path="agent" element={<AgentPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

