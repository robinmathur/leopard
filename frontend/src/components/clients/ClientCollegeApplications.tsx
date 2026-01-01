/**
 * ClientCollegeApplications Component
 * Displays college applications for a client
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Skeleton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import {
  listCollegeApplications,
  createCollegeApplication,
  CollegeApplication,
} from '@/services/api/collegeApplicationApi';
import { Protect } from '@/components/protected/Protect';
import { CollegeApplicationCard } from '@/components/college/CollegeApplicationCard';
import { CollegeApplicationDetail } from '@/components/college/CollegeApplicationDetail';
import { CollegeApplicationForm } from '@/components/college/CollegeApplicationForm';

export interface ClientCollegeApplicationsProps {
  /** Client ID */
  clientId: number;
  /** Optional: Pre-selected college application ID (from URL params) */
  selectedApplicationId?: number;
  /** Callback when application is updated */
  onApplicationUpdate?: () => void;
  /** Callback when detail view is closed (to update URL) */
  onDetailClose?: () => void;
  /** Callback when a card is clicked (to update URL) */
  onCardClick?: (applicationId: number) => void;
}

/**
 * Loading skeleton
 */
const ApplicationsSkeleton = () => (
  <Box>
    {[...Array(2)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * ClientCollegeApplications Component
 */
export const ClientCollegeApplications = ({
  clientId,
  selectedApplicationId: initialSelectedId,
  onApplicationUpdate,
  onDetailClose,
  onCardClick
}: ClientCollegeApplicationsProps) => {
  const [applications, setApplications] = useState<CollegeApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | undefined>(initialSelectedId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch college application data
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await listCollegeApplications({
          client_id: clientId
        }, abortController.signal);

        if (isMounted) {
          // Sort by created_at (most recent first)
          const sorted = response.results.sort((a: CollegeApplication, b: CollegeApplication) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setApplications(sorted);
        }
      } catch (err) {
        if ((err as Error).name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError((err as Error).message || 'Failed to load college applications');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [clientId]);

  // Update selected application when prop changes (from URL params)
  useEffect(() => {
    if (initialSelectedId !== undefined) {
      setSelectedApplicationId(initialSelectedId);
    }
  }, [initialSelectedId]);

  const handleCardClick = (applicationId: number) => {
    setSelectedApplicationId(applicationId);
    if (onCardClick) {
      onCardClick(applicationId);
    }
  };

  const handleCloseDetail = () => {
    setSelectedApplicationId(undefined);
    if (onDetailClose) {
      onDetailClose();
    }
  };

  const handleApplicationUpdate = () => {
    // Refresh the applications list
    const fetchData = async () => {
      try {
        const response = await listCollegeApplications({ client_id: clientId });
        const sorted = response.results.sort((a: CollegeApplication, b: CollegeApplication) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setApplications(sorted);
      } catch (err) {
        console.error('Failed to refresh applications:', err);
      }
    };
    fetchData();

    if (onApplicationUpdate) {
      onApplicationUpdate();
    }
  };

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleCreateApplication = async (data: any) => {
    try {
      setFormLoading(true);
      // Ensure client is set
      const applicationData = { ...data, client: clientId };
      await createCollegeApplication(applicationData);

      // Refresh the applications list
      handleApplicationUpdate();

      // Close the dialog
      setCreateDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to create college application:', err);
      throw err; // Let the form handle the error
    } finally {
      setFormLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          College Applications
        </Typography>
        <ApplicationsSkeleton />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          College Applications
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">College Applications</Typography>
        <Protect permission="add_collegeapplication">
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            New Application
          </Button>
        </Protect>
      </Box>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No college applications yet
          </Typography>
          <Protect permission="add_collegeapplication">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a college application for this client
            </Typography>
          </Protect>
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Showing {applications.length} college application
            {applications.length !== 1 ? 's' : ''} (most recent first)
          </Typography>
          {applications.map((application) => (
            <CollegeApplicationCard
              key={application.id}
              application={application}
              isSelected={selectedApplicationId === application.id}
              onClick={() => handleCardClick(application.id)}
            />
          ))}
        </>
      )}

      {/* College Application Detail Panel */}
      {selectedApplicationId && (
        <CollegeApplicationDetail
          collegeApplicationId={selectedApplicationId}
          initialApplication={applications.find((app) => app.id === selectedApplicationId)}
          onClose={handleCloseDetail}
          onUpdate={handleApplicationUpdate}
        />
      )}

      {/* Create College Application Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">New College Application</Typography>
            <IconButton onClick={handleCloseCreateDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <CollegeApplicationForm
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

export default ClientCollegeApplications;
