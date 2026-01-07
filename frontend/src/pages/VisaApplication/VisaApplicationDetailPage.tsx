/**
 * VisaApplicationDetailPage
 * Full-page view with tabbed interface for comprehensive visa application information
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
import { getVisaApplication, deleteVisaApplication, updateVisaApplication } from '@/services/api/visaApplicationApi';
import type { VisaApplication } from '@/services/api/visaApplicationApi';
import { VisaApplicationForm } from '@/components/visa/VisaApplicationForm';
import { VisaApplicationOverview } from '@/components/visa/VisaApplicationOverview';
import { VisaApplicationActivity } from '@/components/visa/VisaApplicationActivity';
import { VisaApplicationFinancialAccount } from '@/components/visa/VisaApplicationFinancialAccount';
import { VisaApplicationApplicantAccount } from '@/components/visa/VisaApplicationApplicantAccount';
import { VisaApplicationDocuments } from '@/components/visa/VisaApplicationDocuments';
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
    id={`visa-application-tabpanel-${index}`}
    aria-labelledby={`visa-application-tab-${index}`}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

export const VisaApplicationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get the 'from' path from navigation state, default to visa tracker
  const fromPath = (location.state as { from?: string })?.from || '/visa-manager/tracker';
  
  const [application, setApplication] = useState<VisaApplication | null>(null);
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
        const data = await getVisaApplication(parseInt(id, 10));
        setApplication(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load visa application');
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
      navigate(`/clients/${application.client}?tab=visa-applications`);
    } else {
      // Otherwise navigate to the from path or default to visa tracker
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
      await updateVisaApplication(application.id, data);
      
      // Refresh application data
      const updated = await getVisaApplication(application.id);
      setApplication(updated);
      
      setEditDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to update visa application:', err);
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
      await deleteVisaApplication(application.id);
      setDeleteDialogOpen(false);
      // Navigate back after deletion
      navigate(-1);
    } catch (err: any) {
      console.error('Failed to delete visa application:', err);
      alert('Failed to delete visa application. Please try again.');
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
                  {application.visa_type_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({formatVirtualId('visa-application', application.id)})
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {application.visa_category_name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Protect permission="change_visaapplication">
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={handleEditClick}
              >
                Edit
              </Button>
            </Protect>
            <Protect permission="delete_visaapplication">
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
            aria-label="visa application detail tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Overview" id="visa-application-tab-0" aria-controls="visa-application-tabpanel-0" />
            <Tab label="Activity" id="visa-application-tab-1" aria-controls="visa-application-tabpanel-1" />
            <Tab label="Financial Account" id="visa-application-tab-2" aria-controls="visa-application-tabpanel-2" />
            <Tab label="Applicant Account" id="visa-application-tab-3" aria-controls="visa-application-tabpanel-3" />
            <Tab label="Documents" id="visa-application-tab-4" aria-controls="visa-application-tabpanel-4" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            <VisaApplicationOverview application={application} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <VisaApplicationActivity application={application} />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <VisaApplicationFinancialAccount application={application} />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <VisaApplicationApplicantAccount application={application} />
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            <VisaApplicationDocuments application={application} />
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
            <Typography variant="h6">Edit Visa Application</Typography>
            <IconButton onClick={() => setEditDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <VisaApplicationForm
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
            Are you sure you want to delete this visa application? This action cannot be undone.
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

export default VisaApplicationDetailPage;

