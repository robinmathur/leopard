/**
 * CollegeApplicationDetailPage
 * Full-page view with tabbed interface for comprehensive college application information
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { getCollegeApplication, deleteCollegeApplication, updateCollegeApplication } from '@/services/api/collegeApplicationApi';
import type { CollegeApplication } from '@/types/collegeApplication';
import { CollegeApplicationForm } from '@/components/college/CollegeApplicationForm';
import { CollegeApplicationOverview } from '@/components/college/CollegeApplicationOverview';
import { CollegeApplicationActivity } from '@/components/college/CollegeApplicationActivity';
import { CollegeApplicationCollegeAccount } from '@/components/college/CollegeApplicationCollegeAccount';
import { CollegeApplicationApplicantAccount } from '@/components/college/CollegeApplicationApplicantAccount';
import { CollegeApplicationDocuments } from '@/components/college/CollegeApplicationDocuments';
import { Protect } from '@/components/protected/Protect';
import { formatVirtualId } from '@/utils/virtualId';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`college-application-tabpanel-${index}`}
    aria-labelledby={`college-application-tab-${index}`}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

export const CollegeApplicationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get the 'from' path from navigation state, default to application tracker
  const fromPath = (location.state as { from?: string })?.from || '/application-manager/tracker';
  
  const [application, setApplication] = useState<CollegeApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Get tab from URL or default to 0 (Overview)
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam ? parseInt(tabParam, 10) : 0;
  const [tabValue, setTabValue] = useState(initialTab);

  // Fetch application data
  useEffect(() => {
    const fetchApplication = async () => {
      if (!id) {
        setError('Application ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getCollegeApplication(parseInt(id, 10));
        setApplication(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load college application');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id]);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', String(newValue));
    setSearchParams(newParams, { replace: true });
  };

  // Handle back navigation
  const handleBack = () => {
    // If coming from client detail page, navigate back to that client
    if (application && fromPath.includes('/clients/')) {
      navigate(`/clients/${application.client}?tab=applications`);
    } else {
      // Otherwise navigate to the from path or default to application tracker
      navigate(fromPath);
    }
  };

  // Handle edit
  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  // Handle delete
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  // Handle save application
  const handleSaveApplication = async (data: any) => {
    if (!application) return;
    
    try {
      setFormLoading(true);
      await updateCollegeApplication(application.id, data);
      
      // Refresh application data
      const updated = await getCollegeApplication(application.id);
      setApplication(updated);
      
      setEditDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to update college application:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!application) return;
    
    try {
      setFormLoading(true);
      await deleteCollegeApplication(application.id);
      setDeleteDialogOpen(false);
      // Navigate back after deletion
      navigate(-1);
    } catch (err: any) {
      console.error('Failed to delete college application:', err);
      alert('Failed to delete college application. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || !application) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Application not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={handleBack} size="small" aria-label="Go back">
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h5" fontWeight={600}>
                  {application.course_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({formatVirtualId('college-application', application.id)})
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {application.institute_name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Protect permission="change_collegeapplication">
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={handleEditClick}
              >
                Edit
              </Button>
            </Protect>
            <Protect permission="delete_collegeapplication">
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
              >
                Delete
              </Button>
            </Protect>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="college application detail tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Overview" id="college-application-tab-0" aria-controls="college-application-tabpanel-0" />
            <Tab label="Activity" id="college-application-tab-1" aria-controls="college-application-tabpanel-1" />
            <Tab label="College Account" id="college-application-tab-2" aria-controls="college-application-tabpanel-2" />
            <Tab label="Applicant Account" id="college-application-tab-3" aria-controls="college-application-tabpanel-3" />
            <Tab label="Documents" id="college-application-tab-4" aria-controls="college-application-tabpanel-4" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            <CollegeApplicationOverview application={application} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <CollegeApplicationActivity application={application} />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <CollegeApplicationCollegeAccount application={application} />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <CollegeApplicationApplicantAccount application={application} />
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            <CollegeApplicationDocuments application={application} />
          </TabPanel>
        </Box>
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '90vh',
            },
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Edit College Application</Typography>
            <IconButton onClick={() => setEditDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <CollegeApplicationForm
            mode="edit"
            initialData={application}
            onSave={handleSaveApplication}
            onCancel={() => setEditDialogOpen(false)}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this college application? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={formLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={formLoading}
          >
            {formLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollegeApplicationDetailPage;

