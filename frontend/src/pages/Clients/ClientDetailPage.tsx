/**
 * ClientDetailPage
 * Full client detail view page with tabbed interface and lazy loading
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { useClientStore } from '@/store/clientStore';
import { useClientDetailStore } from '@/store/clientDetailStore';
import {
  STAGE_LABELS,
  STAGE_COLORS,
} from '@/types/client';
import { Protect } from '@/components/protected/Protect';
import { ClientOverview, ClientOverviewSkeleton } from '@/components/clients/ClientOverview';
import { ClientNotes } from '@/components/clients/ClientNotes';
import { ClientTimeline } from '@/components/clients/ClientTimeline';
import { ClientPassport } from '@/components/clients/ClientPassport';
import { ClientProficiency } from '@/components/clients/ClientProficiency';
import { ClientQualifications } from '@/components/clients/ClientQualifications';
import { ClientEmployment } from '@/components/clients/ClientEmployment';
import { ClientVisaApplications } from '@/components/clients/ClientVisaApplications';
import { ClientCollegeApplications } from '@/components/clients/ClientCollegeApplications';
import { ClientTasks } from '@/components/clients/ClientTasks';
import { ClientReminders } from '@/components/clients/ClientReminders';

/**
 * Tab value type
 */
type TabValue = 'overview' | 'notes' | 'timeline' | 'documents' | 'applications' | 'tasks' | 'reminders';

/**
 * Tab panel component
 */
interface TabPanelProps {
  children?: React.ReactNode;
  value: TabValue;
  currentValue: TabValue;
}

const TabPanel = ({ children, value, currentValue }: TabPanelProps) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== currentValue}
      id={`client-tabpanel-${value}`}
      aria-labelledby={`client-tab-${value}`}
    >
      {value === currentValue && <Box sx={{ mt: 3 }}>{children}</Box>}
    </div>
  );
};

export const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string })?.from || '/clients';
  const backLabel = fromPath === '/leads' ? 'Back to Leads' : 'Back to Clients';
  const { selectedClient, loading, error, fetchClientById, clearError } = useClientStore();
  const { setCurrentTab, markSectionLoaded, loadedSections, resetStore } = useClientDetailStore();
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  // Fetch client on mount
  useEffect(() => {
    if (id) {
      fetchClientById(parseInt(id, 10));
      markSectionLoaded('overview');
    }
    return () => {
      clearError();
      resetStore(); // Reset client detail store on unmount
    };
  }, [id, fetchClientById, clearError, markSectionLoaded, resetStore]);

  const handleBack = () => {
    navigate(fromPath);
  };

  const handleEdit = () => {
    // Navigate back to origin page where edit dialog can be opened
    // In a more complex app, we might open an edit page or modal here
    navigate(fromPath, { state: { editClientId: id } });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
    setCurrentTab(newValue);
    
    // Mark section as loaded when tab is clicked (lazy loading)
    if (newValue !== 'overview') {
      markSectionLoaded(newValue as keyof typeof loadedSections);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }}>
            {backLabel}
          </Button>
        </Box>
        <ClientOverviewSkeleton />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
            {backLabel}
          </Button>
        </Box>
        <Alert severity="error">{error.message || 'Failed to load client'}</Alert>
      </Box>
    );
  }

  // Not found state
  if (!selectedClient) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
            {backLabel}
          </Button>
        </Box>
        <Alert severity="warning">Client not found</Alert>
      </Box>
    );
  }

  const client = selectedClient;
  const fullName = [client.first_name, client.middle_name, client.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }}>
            {backLabel}
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              {fullName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                label={STAGE_LABELS[client.stage]}
                color={STAGE_COLORS[client.stage]}
                size="small"
              />
              {!client.active && (
                <Chip label="Archived" color="default" size="small" variant="outlined" />
              )}
            </Box>
          </Box>
        </Box>
        <Protect permission="edit_client">
          <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit}>
            Edit Client
          </Button>
        </Protect>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="client detail tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" value="overview" id="client-tab-overview" />
          <Tab label="Notes" value="notes" id="client-tab-notes" />
          <Tab label="Timeline" value="timeline" id="client-tab-timeline" />
          <Tab label="Documents" value="documents" id="client-tab-documents" />
          <Tab label="Applications" value="applications" id="client-tab-applications" />
          <Tab label="Tasks" value="tasks" id="client-tab-tasks" />
          <Tab label="Reminders" value="reminders" id="client-tab-reminders" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value="overview" currentValue={activeTab}>
        <ClientOverview client={client} loading={loading} />
      </TabPanel>

      <TabPanel value="notes" currentValue={activeTab}>
        {loadedSections.notes ? (
          <ClientNotes clientId={client.id} />
        ) : (
          <Alert severity="info">Click on Notes tab to load notes</Alert>
        )}
      </TabPanel>

      <TabPanel value="timeline" currentValue={activeTab}>
        {loadedSections.timeline ? (
          <ClientTimeline clientId={client.id} />
        ) : (
          <Alert severity="info">Click on Timeline tab to load activities</Alert>
        )}
      </TabPanel>

      <TabPanel value="documents" currentValue={activeTab}>
        {loadedSections.documents ? (
          <Box>
            <ClientPassport clientId={client.id} />
            <Box sx={{ mt: 3 }}>
              <ClientProficiency clientId={client.id} />
            </Box>
            <Box sx={{ mt: 3 }}>
              <ClientQualifications clientId={client.id} />
            </Box>
            <Box sx={{ mt: 3 }}>
              <ClientEmployment clientId={client.id} />
            </Box>
          </Box>
        ) : (
          <Alert severity="info">Click on Documents tab to load documents</Alert>
        )}
      </TabPanel>

      <TabPanel value="applications" currentValue={activeTab}>
        {loadedSections.applications ? (
          <Box>
            <ClientVisaApplications clientId={client.id} />
            <Box sx={{ mt: 3 }}>
              <ClientCollegeApplications clientId={client.id} />
            </Box>
          </Box>
        ) : (
          <Alert severity="info">Click on Applications tab to load applications</Alert>
        )}
      </TabPanel>

      <TabPanel value="tasks" currentValue={activeTab}>
        {loadedSections.tasks ? (
          <ClientTasks clientId={client.id} />
        ) : (
          <Alert severity="info">Click on Tasks tab to load tasks</Alert>
        )}
      </TabPanel>

      <TabPanel value="reminders" currentValue={activeTab}>
        {loadedSections.reminders ? (
          <ClientReminders clientId={client.id} />
        ) : (
          <Alert severity="info">Click on Reminders tab to load reminders</Alert>
        )}
      </TabPanel>
    </Box>
  );
};

export default ClientDetailPage;
