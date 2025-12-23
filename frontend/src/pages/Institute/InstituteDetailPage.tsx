/**
 * InstituteDetailPage
 * Full institute detail view page with tabbed interface and lazy loading
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { useInstituteStore } from '@/store/instituteStore';
import { Protect } from '@/components/protected/Protect';
import { InstituteOverview, InstituteOverviewSkeleton } from '@/components/institutes/InstituteOverview';
import { InstituteContactPersons } from '@/components/institutes/InstituteContactPersons';
import { InstituteLocations } from '@/components/institutes/InstituteLocations';
import { InstituteCourses } from '@/components/institutes/InstituteCourses';
import { InstituteIntakes } from '@/components/institutes/InstituteIntakes';
import { InstituteRequirements } from '@/components/institutes/InstituteRequirements';

/**
 * Tab value type
 */
type TabValue = 'overview' | 'contact-persons' | 'locations' | 'courses' | 'intakes' | 'requirements';

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
      id={`institute-tabpanel-${value}`}
      aria-labelledby={`institute-tab-${value}`}
    >
      {value === currentValue && <Box sx={{ mt: 3 }}>{children}</Box>}
    </div>
  );
};

export const InstituteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string })?.from || '/institute';
  
  const { selectedInstitute, loading, error, fetchInstituteById, clearError, cancelFetchInstituteById } = useInstituteStore();
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  // Fetch institute on mount
  useEffect(() => {
    if (id) {
      fetchInstituteById(parseInt(id, 10));
    }
    return () => {
      cancelFetchInstituteById();
      clearError();
    };
  }, [id, fetchInstituteById]);

  const handleBack = () => {
    navigate(fromPath);
  };

  const handleEdit = () => {
    // Navigate back to origin page where edit dialog can be opened
    navigate(fromPath, { state: { editInstituteId: id } });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
  };

  // Loading state
  if (loading && !selectedInstitute) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }}>
            Back to Institutes
          </Button>
        </Box>
        <InstituteOverviewSkeleton />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Back to Institutes
          </Button>
        </Box>
        <Alert severity="error">{error.message || 'Failed to load institute'}</Alert>
      </Box>
    );
  }

  // Not found state
  if (!selectedInstitute) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Back to Institutes
          </Button>
        </Box>
        <Alert severity="warning">Institute not found</Alert>
      </Box>
    );
  }

  const institute = selectedInstitute;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }}>
            Back to Institutes
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              {institute.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {institute.short_name}
            </Typography>
          </Box>
        </Box>
        <Protect permission="edit_institute">
          <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit}>
            Edit Institute
          </Button>
        </Protect>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="institute detail tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" value="overview" id="institute-tab-overview" />
          <Tab label="Contact Persons" value="contact-persons" id="institute-tab-contact-persons" />
          <Tab label="Locations" value="locations" id="institute-tab-locations" />
          <Tab label="Courses" value="courses" id="institute-tab-courses" />
          <Tab label="Intakes" value="intakes" id="institute-tab-intakes" />
          <Tab label="Requirements" value="requirements" id="institute-tab-requirements" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value="overview" currentValue={activeTab}>
        <InstituteOverview institute={institute} loading={loading} />
      </TabPanel>

      <TabPanel value="contact-persons" currentValue={activeTab}>
        <InstituteContactPersons instituteId={institute.id} />
      </TabPanel>

      <TabPanel value="locations" currentValue={activeTab}>
        <InstituteLocations instituteId={institute.id} />
      </TabPanel>

      <TabPanel value="courses" currentValue={activeTab}>
        <InstituteCourses instituteId={institute.id} />
      </TabPanel>

      <TabPanel value="intakes" currentValue={activeTab}>
        <InstituteIntakes instituteId={institute.id} />
      </TabPanel>

      <TabPanel value="requirements" currentValue={activeTab}>
        <InstituteRequirements instituteId={institute.id} />
      </TabPanel>
    </Box>
  );
};

export default InstituteDetailPage;
