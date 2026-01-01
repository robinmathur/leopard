/**
 * ClientVisaApplications Component
 * Displays visa applications for a client
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Skeleton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { getVisaApplications, createVisaApplication, VisaApplication, VisaApplicationStatus } from '@/services/api/visaApplicationApi';
import {Protect} from "@/components/protected/Protect.tsx";
import { VisaApplicationDetail } from './VisaApplicationDetail';
import { VisaApplicationForm } from '@/components/visa/VisaApplicationForm';

export interface ClientVisaApplicationsProps {
  /** Client ID */
  clientId: number;
  /** Optional: Pre-selected visa application ID (from URL params) */
  selectedApplicationId?: number;
  /** Callback when application is updated */
  onApplicationUpdate?: () => void;
  /** Callback when detail view is closed (to update URL) */
  onDetailClose?: () => void;
  /** Callback when a card is clicked (to update URL) */
  onCardClick?: (applicationId: number) => void;
}

/**
 * Status color mapping
 */
const STATUS_COLORS: Record<VisaApplicationStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  TO_BE_APPLIED: 'default',
  VISA_APPLIED: 'info',
  CASE_OPENED: 'warning',
  GRANTED: 'success',
  REJECTED: 'error',
  WITHDRAWN: 'default',
};

/**
 * Status labels
 */
const STATUS_LABELS: Record<VisaApplicationStatus, string> = {
  TO_BE_APPLIED: 'To Be Applied',
  VISA_APPLIED: 'Visa Applied',
  CASE_OPENED: 'Case Opened',
  GRANTED: 'Granted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

/**
 * Format date for display
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString; }};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2">{value || '-'}</Typography>
  </Box>
);

/**
 * Loading skeleton
 */
const VisaApplicationsSkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }}/>
      </Box>
    ))}
  </Box>
);

/**
 * Visa application card
 */
const VisaApplicationCard = ({ 
  application, 
  isSelected, 
  onClick 
}: { 
  application: VisaApplication;
  isSelected?: boolean;
  onClick: () => void;
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        bgcolor: isSelected ? 'action.selected' : 'background.paper',
        '&:hover': {
          boxShadow: 2,
          cursor: 'pointer',
        },
        transition: 'all 0.2s ease-in-out', }} onClick={onClick}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <FlightTakeoffIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {application.visa_type_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {application.visa_category_name}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={STATUS_LABELS[application.status]}
          color={STATUS_COLORS[application.status]}
          size="small"
        />
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {application.date_applied && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Date Applied" value={formatDate(application.date_applied)} />
          </Grid>
        )}
        {application.date_granted && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Date Granted" value={formatDate(application.date_granted)} />
          </Grid>
        )}
        {application.date_rejected && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Date Rejected" value={formatDate(application.date_rejected)} />
          </Grid>
        )}
        {application.expiry_date && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Expiry Date" value={formatDate(application.expiry_date)} />
          </Grid>
        )}
        {application.assigned_to_name && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Assigned To" value={application.assigned_to_name} />
          </Grid>
        )}
        {application.transaction_reference_no && (
          <Grid size={{ xs: 12 }}>
            <DetailRow label="Reference Number" value={application.transaction_reference_no} />
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

/**
 * ClientVisaApplications Component
 */
export const ClientVisaApplications = ({
  clientId,
  selectedApplicationId: initialSelectedId,
  onApplicationUpdate,
  onDetailClose,
  onCardClick
}: ClientVisaApplicationsProps) => {
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | undefined>(initialSelectedId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch visa application data
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getVisaApplications(clientId, abortController.signal);
        if (isMounted) {
          // Sort by created_at (most recent first)
          const sorted = data.sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setApplications(sorted); }}catch (err) {
        if ((err as Error).name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError((err as Error).message || 'Failed to load visa applications'); }}finally {
        if (isMounted) {
          setIsLoading(false); }}};

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [clientId]);

  // Update selected application when prop changes (from URL params)
  useEffect(() => {
    if (initialSelectedId !== undefined) {
      setSelectedApplicationId(initialSelectedId); }}, [initialSelectedId]);

  const handleCardClick = (applicationId: number) => {
    setSelectedApplicationId(applicationId);
    if (onCardClick) {
      onCardClick(applicationId); }};

  const handleCloseDetail = () => {
    setSelectedApplicationId(undefined);
    if (onDetailClose) {
      onDetailClose(); }};

  const handleApplicationUpdate = () => {
    // Refresh the applications list
    const fetchData = async () => {
      try {
        const data = await getVisaApplications(clientId);
        const sorted = data.sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setApplications(sorted);
      } catch (err) {
        console.error('Failed to refresh applications:', err); }};
    fetchData();

    if (onApplicationUpdate) {
      onApplicationUpdate(); }};

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleCreateApplication = async (data: any) => {
    try {
      setFormLoading(true);
      // Ensure client_id is set
      const applicationData = { ...data, client_id: clientId };
      await createVisaApplication(applicationData);

      // Refresh the applications list
      handleApplicationUpdate();

      // Close the dialog
      setCreateDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to create visa application:', err);
      throw err; // Let the form handle the error
    } finally {
      setFormLoading(false); }};

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visa Applications
        </Typography>
        <VisaApplicationsSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visa Applications
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Visa Applications</Typography>
        <Protect permission="add_client">
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            New Visa Application
          </Button>
        </Protect>
      </Box>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary', }}>
          <Typography variant="body1" gutterBottom>
            No visa applications yet
          </Typography>
          <Protect permission={'add_client'}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a visa application for this client
            </Typography>
          </Protect>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {applications.length} visa application
            {applications.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {applications.map((application) => (
            <VisaApplicationCard 
              key={application.id} 
              application={application}
              isSelected={selectedApplicationId === application.id}
              onClick={() => handleCardClick(application.id)}
            />
          ))}
        </>
      )}

      {/* Visa Application Detail Panel */}
      {selectedApplicationId && (
        <VisaApplicationDetail
          visaApplicationId={selectedApplicationId}
          initialApplication={applications.find((app) => app.id === selectedApplicationId)}
          onClose={handleCloseDetail}
          onUpdate={handleApplicationUpdate}
        />
      )}

      {/* Create Visa Application Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
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
            <Typography variant="h6">New Visa Application</Typography>
            <IconButton onClick={handleCloseCreateDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <VisaApplicationForm
            mode="add"
            initialData={{ client: clientId } as any}
            onSave={handleCreateApplication}
            onCancel={handleCloseCreateDialog}
            loading={formLoading}
            clientLocked={true}
          />
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default ClientVisaApplications;
