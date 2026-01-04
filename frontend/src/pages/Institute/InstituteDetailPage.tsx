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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  IconButton,
  TextField,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useInstituteStore } from '@/store/instituteStore';
import { Protect } from '@/components/protected/Protect';
import { usePermission } from '@/auth/hooks/usePermission';
import type { Permission } from '@/auth/types';
import type { InstituteUpdateRequest } from '@/types/institute';
import type { ApiError } from '@/services/api/httpClient';
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
  
  const { selectedInstitute, loading, error, fetchInstituteById, updateInstitute, deleteInstitute, clearError, cancelFetchInstituteById } = useInstituteStore();
  const { hasPermission } = usePermission();
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<InstituteUpdateRequest>({
    name: '',
    short_name: '',
    phone: '',
    website: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

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

  // Check if user has permission for the active tab, redirect to overview if not
  useEffect(() => {
    if (!selectedInstitute) return;

    const tabPermissions: Record<TabValue, Permission | null> = {
      'overview': null, // Always accessible
      'contact-persons': 'view_institutecontactperson',
      'locations': 'view_institutelocation',
      'courses': 'view_course',
      'intakes': 'view_instituteintake',
      'requirements': 'view_instituterequirement',
    };

    const requiredPermission = tabPermissions[activeTab];
    if (requiredPermission && !hasPermission(requiredPermission)) {
      setActiveTab('overview');
    }
  }, [activeTab, selectedInstitute, hasPermission]);

  const handleBack = () => {
    navigate(fromPath);
  };

  const handleEdit = () => {
    if (!selectedInstitute) return;
    setEditDialogOpen(true);
    setFormData({
      name: selectedInstitute.name,
      short_name: selectedInstitute.short_name,
      phone: selectedInstitute.phone || '',
      website: selectedInstitute.website || '',
    });
    setFormErrors({});
  };

  const handleCloseEditDialog = () => {
    if (!formLoading) {
      setEditDialogOpen(false);
      setFormErrors({});
    }
  };

  const handleSaveInstitute = async () => {
    if (!selectedInstitute) return;

    setFormLoading(true);
    setFormErrors({});

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Name is required';
    }
    if (!formData.short_name || formData.short_name.trim() === '') {
      errors.short_name = 'Short Name is required';
    }

    // Validate phone format if provided
    if (formData.phone && formData.phone.trim() !== '') {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    // Validate website format if provided
    if (formData.website && formData.website.trim() !== '') {
      try {
        new URL(formData.website.startsWith('http') ? formData.website : `https://${formData.website}`);
      } catch {
        errors.website = 'Please enter a valid website URL';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormLoading(false);
      return;
    }

    try {
      const updateData: InstituteUpdateRequest = {
        name: formData.name?.trim() || '',
        short_name: formData.short_name?.trim() || '',
        phone: formData.phone?.trim() || undefined,
        website: formData.website?.trim() || undefined,
      };
      const result = await updateInstitute(selectedInstitute.id, updateData);
      if (result) {
        setEditDialogOpen(false);
        setSnackbar({
          open: true,
          message: `Institute "${result.name}" updated successfully`,
          severity: 'success',
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      // Handle field-specific errors from backend
      if (apiError.fieldErrors) {
        // Convert Record<string, string[]> to Record<string, string>
        const convertedErrors: Record<string, string> = {};
        Object.entries(apiError.fieldErrors).forEach(([key, value]) => {
          convertedErrors[key] = Array.isArray(value) ? value.join(', ') : value;
        });
        setFormErrors(convertedErrors);
      } else {
        setSnackbar({
          open: true,
          message: apiError.message || 'Failed to update institute',
          severity: 'error',
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedInstitute) return;

    setFormLoading(true);
    const success = await deleteInstitute(selectedInstitute.id);
    
    if (success) {
      setSnackbar({
        open: true,
        message: `Institute "${selectedInstitute.name}" deleted successfully`,
        severity: 'success',
      });
      // Navigate back to institutes list after a short delay to show success message
      setTimeout(() => {
        navigate(fromPath);
      }, 1500);
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to delete institute',
        severity: 'error',
      });
      setDeleteDialogOpen(false);
      setFormLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Protect permission="change_institute">
            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit} size="small">
              Edit Institute
            </Button>
          </Protect>
          <Protect permission="delete_institute">
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              size="small"
            >
              Delete Institute
            </Button>
          </Protect>
        </Box>
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
          {hasPermission('view_institutecontactperson') && (
            <Tab label="Contact Persons" value="contact-persons" id="institute-tab-contact-persons" />
          )}
          {hasPermission('view_institutelocation') && (
            <Tab label="Locations" value="locations" id="institute-tab-locations" />
          )}
          {hasPermission('view_course') && (
            <Tab label="Courses" value="courses" id="institute-tab-courses" />
          )}
          {hasPermission('view_instituteintake') && (
            <Tab label="Intakes" value="intakes" id="institute-tab-intakes" />
          )}
          {hasPermission('view_instituterequirement') && (
            <Tab label="Requirements" value="requirements" id="institute-tab-requirements" />
          )}
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value="overview" currentValue={activeTab}>
        <InstituteOverview institute={institute} loading={loading} />
      </TabPanel>

      <Protect permission="view_institutecontactperson">
        <TabPanel value="contact-persons" currentValue={activeTab}>
          <InstituteContactPersons instituteId={institute.id} />
        </TabPanel>
      </Protect>

      <Protect permission="view_institutelocation">
        <TabPanel value="locations" currentValue={activeTab}>
          <InstituteLocations instituteId={institute.id} />
        </TabPanel>
      </Protect>

      <Protect permission="view_course">
        <TabPanel value="courses" currentValue={activeTab}>
          <InstituteCourses instituteId={institute.id} />
        </TabPanel>
      </Protect>

      <Protect permission="view_instituteintake">
        <TabPanel value="intakes" currentValue={activeTab}>
          <InstituteIntakes instituteId={institute.id} />
        </TabPanel>
      </Protect>

      <Protect permission="view_instituterequirement">
        <TabPanel value="requirements" currentValue={activeTab}>
          <InstituteRequirements instituteId={institute.id} />
        </TabPanel>
      </Protect>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={formLoading ? undefined : handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Institute
          <IconButton
            onClick={handleCloseEditDialog}
            disabled={formLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
              }}
              required
              fullWidth
              disabled={formLoading}
              error={!!formErrors.name}
              helperText={formErrors.name}
              autoFocus
            />
            <TextField
              label="Short Name"
              value={formData.short_name}
              onChange={(e) => {
                setFormData({ ...formData, short_name: e.target.value });
                if (formErrors.short_name) setFormErrors({ ...formErrors, short_name: '' });
              }}
              required
              fullWidth
              disabled={formLoading}
              error={!!formErrors.short_name}
              helperText={formErrors.short_name}
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
              }}
              fullWidth
              disabled={formLoading}
              error={!!formErrors.phone}
              helperText={formErrors.phone || 'Optional'}
              placeholder="e.g., +1 234 567 8900"
            />
            <TextField
              label="Website"
              value={formData.website}
              onChange={(e) => {
                setFormData({ ...formData, website: e.target.value });
                if (formErrors.website) setFormErrors({ ...formErrors, website: '' });
              }}
              fullWidth
              disabled={formLoading}
              error={!!formErrors.website}
              helperText={formErrors.website || 'Optional (e.g., www.example.com)'}
              placeholder="www.example.com"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={handleCloseEditDialog} disabled={formLoading} size="small">
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveInstitute}
                disabled={formLoading || !formData.name?.trim() || !formData.short_name?.trim()}
                size="small"
              >
                {formLoading ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={formLoading ? undefined : handleCancelDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Institute?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete institute &quot;{institute.name}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={formLoading} size="small">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={formLoading}
            size="small"
            startIcon={formLoading ? <CircularProgress size={16} /> : null}
          >
            {formLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InstituteDetailPage;
