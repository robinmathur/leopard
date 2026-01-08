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
import { InstituteDetailPage } from './pages/Institute/InstituteDetailPage';
import { AgentPage } from './pages/Agent/AgentPage';
import { AgentDetailPage } from './pages/Agent/AgentDetailPage';
import { VisaDashboard } from './pages/VisaManager/VisaDashboard';
import { VisaTracker } from './pages/VisaManager/VisaTracker';
import { VisaTypePage } from './pages/VisaManager/VisaTypePage';
import { VisaApplicationsManagementPage } from './pages/VisaManager/VisaApplicationsManagementPage';
import { ApplicationDashboard } from './pages/ApplicationManager/ApplicationDashboard';
import { ApplicationTracker } from './pages/ApplicationManager/ApplicationTracker';
import { ApplicationsList } from './pages/ApplicationManager/ApplicationsList';
import { ApplicationTypePage } from './pages/ApplicationManager/ApplicationTypePage';
import { CollegeApplicationDetailPage } from './pages/CollegeApplication/CollegeApplicationDetailPage';
import { VisaApplicationDetailPage } from './pages/VisaApplication/VisaApplicationDetailPage';
import { UsersPage } from './pages/Users/UsersPage';
import { UserDetailPage } from './pages/Users/UserDetailPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { GroupsPage } from './pages/Groups/GroupsPage';
import { BranchesPage } from './pages/Branches/BranchesPage';
import { BranchDetailPage } from './pages/Branches/BranchDetailPage';
import { RegionsPage } from './pages/Regions/RegionsPage';
import { RegionDetailPage } from './pages/Regions/RegionDetailPage';
import { TasksPage } from './pages/Tasks/TasksPage';
import { CalendarPage } from './pages/Calendar/CalendarPage';
import { NotificationsPage } from './pages/Notifications/NotificationsPage';

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
            <Route path="tasks" element={<TasksPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="leads" element={<LeadsPage />} />
            
            {/* Visa Manager Routes */}
            <Route path="visa-manager/dashboard" element={<VisaDashboard />} />
            <Route path="visa-manager/tracker" element={<VisaTracker />} />
            <Route path="visa-manager/applications" element={<VisaApplicationsManagementPage />} />
            <Route path="visa-manager/types" element={<VisaTypePage />} />

            {/* Legacy route - redirect to Visa Dashboard */}
            <Route path="visa-applications" element={<Navigate to="/visa-manager/dashboard" replace />} />

            {/* Application Manager Routes */}
            <Route path="application-manager/dashboard" element={<ApplicationDashboard />} />
            <Route path="application-manager/tracker" element={<ApplicationTracker />} />
            <Route path="application-manager/applications" element={<ApplicationsList />} />
            <Route path="application-manager/types" element={<ApplicationTypePage />} />
            
            {/* College Application Detail Route */}
            <Route path="college-applications/:id" element={<CollegeApplicationDetailPage />} />
            
            {/* Visa Application Detail Route */}
            <Route path="visa-applications/:id" element={<VisaApplicationDetailPage />} />

            <Route path="institute" element={<InstitutePage />} />
            <Route path="institute/:id" element={<InstituteDetailPage />} />
            <Route path="agent" element={<AgentPage />} />
            <Route path="agent/:id" element={<AgentDetailPage />} />
            {/* Org Management Routes */}
            <Route path="org-management/regions" element={<RegionsPage />} />
            <Route path="org-management/regions/add" element={<RegionsPage />} />
            <Route path="org-management/regions/:id" element={<RegionDetailPage />} />
            <Route path="org-management/branches" element={<BranchesPage />} />
            <Route path="org-management/branches/add" element={<BranchesPage />} />
            <Route path="org-management/branches/:id" element={<BranchDetailPage />} />
            
            {/* User Management Routes */}
            <Route path="user-management/users" element={<UsersPage />} />
            <Route path="user-management/users/:id" element={<UserDetailPage />} />
            <Route path="user-management/groups" element={<GroupsPage />} />
            
            {/* Profile Route */}
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

