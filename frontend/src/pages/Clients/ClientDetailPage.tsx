/**
 * ClientDetailPage
 * Client detail page with tabbed interface
 * - Overview tab: Client basic details (left) + Timeline (right)
 * - Profile tab: Full client details
 * - Other tabs: Notes, Documents, Applications, Tasks, Reminders
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  Alert,
  Tabs,
  Tab,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { useClientStore } from '@/store/clientStore';
import { useClientDetailStore } from '@/store/clientDetailStore';
import { useTimelineStore } from '@/store/timelineStore';
import {
  STAGE_LABELS,
  STAGE_COLORS,
  GENDER_LABELS,
  COUNTRIES,
} from '@/types/client';
import { Protect } from '@/components/protected/Protect';
import { ClientOverview, ClientOverviewSkeleton } from '@/components/clients/ClientOverview';
import { ProfilePictureUpload } from '@/components/clients/ProfilePictureUpload';
import { TimelineWithNotes } from '@/components/shared/Timeline/TimelineWithNotes';
import { ClientNotes } from '@/components/clients/ClientNotes';
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
type TabValue = 'overview' | 'profile' | 'notes' | 'documents' | 'applications' | 'visa-applications' | 'tasks' | 'reminders';

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

/**
 * Get country name from code
 */
const getCountryName = (code: string): string => {
  const country = COUNTRIES.find((c) => c.code === code);
  return country?.name || code;
};

/**
 * Format date for display
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2">{value || '-'}</Typography>
  </Box>
);

export const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromPath = (location.state as { from?: string })?.from || '/clients';
  
  // Determine back button label based on where user came from
  let backLabel = 'Back to Clients';
  if (fromPath === '/leads') {
    backLabel = 'Back to Leads';
  } else if (fromPath === '/visa-manager/applications') {
    backLabel = 'Back to Visa Applications';
  } else if (fromPath === '/visa-manager/tracker') {
    backLabel = 'Back to Visa Tracker';
  } else if (fromPath === '/application-manager/tracker') {
    backLabel = 'Back to Application Tracker';
  }

  const { selectedClient, loading, error, fetchClientById, clearError, cancelFetchClientById } = useClientStore();
  const { setCurrentTab, markSectionLoaded, loadedSections, resetStore } = useClientDetailStore();
  const {
    activities,
    isLoading: timelineLoading,
    error: timelineError,
    hasMore,
    activeFilter,
    fetchTimeline,
    setFilter,
    loadMore,
    cancelFetchTimeline,
  } = useTimelineStore();
  
  // Get URL params
  const visaApplicationIdParam = searchParams.get('visaApplicationId');
  const collegeApplicationIdParam = searchParams.get('collegeApplicationId');
  
  // Initialize tab state - read from URL on mount if present, otherwise default to 'overview'
  // Use lazy initializer to only read from URL once on mount
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const urlTab = searchParams.get('tab') as TabValue | null;
    if (urlTab && ['overview', 'profile', 'notes', 'documents', 'applications', 'visa-applications', 'tasks', 'reminders'].includes(urlTab)) {
      return urlTab;
    }
    return 'overview';
  });

  // Fetch client and timeline on mount
  useEffect(() => {
    if (id) {
      fetchClientById(parseInt(id, 10));
      fetchTimeline(parseInt(id, 10));
      markSectionLoaded('overview');
      
      // Mark the initial tab section as loaded if it's not overview
      // Read from URL directly to avoid dependency on activeTab state
      const urlTab = searchParams.get('tab') as TabValue | null;
      if (urlTab && urlTab !== 'overview' && ['overview', 'profile', 'notes', 'documents', 'applications', 'visa-applications', 'tasks', 'reminders'].includes(urlTab)) {
        // Map visa-applications to applications for the store (they share the same loaded section)
        const sectionKey = urlTab === 'visa-applications' ? 'applications' : urlTab;
        markSectionLoaded(sectionKey as keyof typeof loadedSections);
        setCurrentTab(urlTab);
      }
    }
    return () => {
      cancelFetchClientById();
      cancelFetchTimeline();
      clearError();
      resetStore();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only run when id changes

  // Handle refresh timeline after note is added
  const handleNoteAdded = () => {
    if (id) {
      fetchTimeline(parseInt(id, 10), {
        activity_type: activeFilter || undefined,
      });
    }
  };

  // Handle filter change
  const handleFilterChange = (activityType: string | null) => {
    setFilter(activityType);
    if (id) {
      fetchTimeline(parseInt(id, 10), {
        activity_type: activityType || undefined,
        page: 1,
      });
    }
  };

  // Handle load more
  const handleLoadMore = () => {
    if (id) {
      loadMore(parseInt(id, 10));
    }
  };

  const handleBack = () => {
    navigate(fromPath);
  };

  const handleEdit = () => {
    navigate(fromPath, { state: { editClientId: id } });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
    setCurrentTab(newValue);

    // Mark section as loaded when tab is clicked (lazy loading)
    if (newValue !== 'overview') {
      // Map visa-applications to applications for the store (they share the same loaded section)
      const sectionKey = newValue === 'visa-applications' ? 'applications' : newValue;
      markSectionLoaded(sectionKey as keyof typeof loadedSections);
    }

    // Update URL params to preserve tab selection
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', newValue);

    // Clear application IDs based on which tab is active
    if (newValue === 'applications') {
      // Keep collegeApplicationId, remove visaApplicationId
      newSearchParams.delete('visaApplicationId');
    } else if (newValue === 'visa-applications') {
      // Keep visaApplicationId, remove collegeApplicationId
      newSearchParams.delete('collegeApplicationId');
    } else {
      // Remove both if not on application tabs
      newSearchParams.delete('visaApplicationId');
      newSearchParams.delete('collegeApplicationId');
    }

    setSearchParams(newSearchParams, { replace: true });
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
          <Tab label="Profile" value="profile" id="client-tab-profile" />
          <Tab label="Notes" value="notes" id="client-tab-notes" />
          <Tab label="Documents" value="documents" id="client-tab-documents" />
          <Tab label="Applications" value="applications" id="client-tab-applications" />
          <Tab label="Visa Applications" value="visa-applications" id="client-tab-visa-applications" />
          <Tab label="Tasks" value="tasks" id="client-tab-tasks" />
          <Tab label="Reminders" value="reminders" id="client-tab-reminders" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {/* Overview Tab: Client Details (Left) + Timeline (Right) */}
      <TabPanel value="overview" currentValue={activeTab}>
        <Grid container spacing={3}>
          {/* Left Side: Client Basic Details */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              {/* Profile Picture */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <ProfilePictureUpload
                  clientId={client.id}
                  clientName={fullName}
                  size={120}
                  editable={true}
                />
                <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
                  {fullName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
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

              <Divider sx={{ my: 2 }} />

              {/* Personal Information */}
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Personal Information
              </Typography>
              <DetailRow label="First Name" value={client.first_name} />
              <DetailRow label="Last Name" value={client.last_name} />
              <DetailRow label="Gender" value={GENDER_LABELS[client.gender]} />
              <DetailRow label="Date of Birth" value={formatDate(client.dob)} />
              <DetailRow label="Country" value={getCountryName(client.country)} />

              <Divider sx={{ my: 2 }} />

              {/* Contact Information */}
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Contact Information
              </Typography>
              <DetailRow label="Email" value={client.email} />
              <DetailRow label="Phone Number" value={client.phone_number} />

              <Divider sx={{ my: 2 }} />

              {/* Assignment & Status */}
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Assignment & Status
              </Typography>
              <DetailRow
                label="Stage"
                value={
                  <Chip
                    label={STAGE_LABELS[client.stage]}
                    color={STAGE_COLORS[client.stage]}
                    size="small"
                  />
                }
              />
              <DetailRow label="Assigned To" value={client.assigned_to_name} />
              <DetailRow label="Agent" value={client.agent_name} />
              <DetailRow label="Visa Category" value={client.visa_category_name} />
              <DetailRow label="Last Updated" value={formatDate(client.updated_at)} />
              <DetailRow
                label="Status"
                value={client.active ? 'Active' : 'Archived'}
              />
            </Paper>
          </Grid>

          {/* Right Side: Timeline */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Timeline
              </Typography>
              <TimelineWithNotes
                clientId={client.id}
                activities={activities}
                isLoading={timelineLoading}
                error={timelineError?.message || null}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                showFilters={true}
                onNoteAdded={handleNoteAdded}
              />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Profile Tab: Full Client Details */}
      <TabPanel value="profile" currentValue={activeTab}>
        <ClientOverview client={client} loading={loading} />
      </TabPanel>

      {/* Notes Tab */}
      <TabPanel value="notes" currentValue={activeTab}>
        {loadedSections.notes ? (
          <ClientNotes clientId={client.id} />
        ) : (
          <Alert severity="info">Click on Notes tab to load notes</Alert>
        )}
      </TabPanel>

      {/* Documents Tab */}
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

      {/* College Applications Tab */}
      <TabPanel value="applications" currentValue={activeTab}>
        {loadedSections.applications ? (
          <ClientCollegeApplications
            clientId={client.id}
            selectedApplicationId={collegeApplicationIdParam ? parseInt(collegeApplicationIdParam, 10) : undefined}
            onCardClick={(applicationId) => {
              // Update URL when a card is clicked
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.set('tab', 'applications');
              newSearchParams.set('collegeApplicationId', applicationId.toString());
              setSearchParams(newSearchParams, { replace: true });
            }}
            onDetailClose={() => {
              // Remove collegeApplicationId from URL when detail is closed
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('collegeApplicationId');
              setSearchParams(newSearchParams, { replace: true });
            }}
          />
        ) : (
          <Alert severity="info">Click on Applications tab to load applications</Alert>
        )}
      </TabPanel>

      {/* Visa Applications Tab */}
      <TabPanel value="visa-applications" currentValue={activeTab}>
        {loadedSections.applications ? (
          <ClientVisaApplications
            clientId={client.id}
            selectedApplicationId={visaApplicationIdParam ? parseInt(visaApplicationIdParam, 10) : undefined}
            onCardClick={(applicationId) => {
              // Update URL when a card is clicked
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.set('tab', 'visa-applications');
              newSearchParams.set('visaApplicationId', applicationId.toString());
              setSearchParams(newSearchParams, { replace: true });
            }}
            onDetailClose={() => {
              // Remove visaApplicationId from URL when detail is closed
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('visaApplicationId');
              setSearchParams(newSearchParams, { replace: true });
            }}
          />
        ) : (
          <Alert severity="info">Click on Visa Applications tab to load applications</Alert>
        )}
      </TabPanel>

      {/* Tasks Tab */}
      <TabPanel value="tasks" currentValue={activeTab}>
        {loadedSections.tasks ? (
          <ClientTasks clientId={client.id} />
        ) : (
          <Alert severity="info">Click on Tasks tab to load tasks</Alert>
        )}
      </TabPanel>

      {/* Reminders Tab */}
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
