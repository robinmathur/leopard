/**
 * ChangeStageDialog - Dialog for changing the stage of a college application
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import { listStages, updateCollegeApplication } from '@/services/api/collegeApplicationApi';
import type { CollegeApplication, Stage } from '@/types/collegeApplication';

interface ChangeStageDialogProps {
  open: boolean;
  onClose: () => void;
  application: CollegeApplication | null;
  onSuccess: () => void;
}

export const ChangeStageDialog: React.FC<ChangeStageDialogProps> = ({
  open,
  onClose,
  application,
  onSuccess,
}) => {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingStages, setFetchingStages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stages for the application's type when dialog opens
  useEffect(() => {
    if (open && application) {
      fetchStages();
    }
  }, [open, application]);

  const fetchStages = async () => {
    if (!application) return;

    try {
      setFetchingStages(true);
      setError(null);
      const stagesList = await listStages({
        application_type_id: application.application_type,
      });
      setStages(stagesList);

      // Pre-select current stage
      const current = stagesList.find(s => s.id === application.stage);
      setSelectedStage(current || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load stages');
    } finally {
      setFetchingStages(false);
    }
  };

  const handleChangeStage = async () => {
    if (!selectedStage || !application) return;

    try {
      setLoading(true);
      setError(null);
      await updateCollegeApplication(application.id, {
        stage_id: selectedStage.id,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change stage');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSelectedStage(null);
      onClose();
    }
  };

  if (!application) return null;

  const isCurrentStage = selectedStage?.id === application.stage;
  const canSubmit = selectedStage && !isCurrentStage && !loading && !fetchingStages;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change Stage</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Application: <strong>{application.client_name}</strong> - {application.institute_name}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl fullWidth disabled={loading || fetchingStages}>
          <InputLabel>Stage</InputLabel>
          <Select
            value={selectedStage?.id || ''}
            onChange={(e) => {
              const stage = stages.find(s => s.id === e.target.value);
              setSelectedStage(stage || null);
            }}
            label="Stage"
          >
            {stages.map((stage) => (
              <MenuItem key={stage.id} value={stage.id}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {stage.stage_name}
                  {stage.is_final_stage && (
                    <Chip label="Final" size="small" color="success" sx={{ height: 20 }} />
                  )}
                  {stage.id === application.stage && (
                    <Chip label="Current" size="small" color="primary" sx={{ height: 20 }} />
                  )}
                </span>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isCurrentStage && selectedStage && (
          <Alert severity="info" sx={{ mt: 2 }}>
            This is the current stage. Select a different stage to proceed.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleChangeStage} variant="contained" disabled={!canSubmit}>
          {loading ? 'Changing...' : 'Change Stage'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
