/**
 * MoveStageDialog Component
 * Dialog for moving client to next stage in workflow
 * When client is in CLOSE stage, allows selecting any stage
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Client, STAGE_LABELS, NEXT_STAGE, ClientStage } from '@/types/client';
import { useState, useEffect } from 'react';

interface MoveStageDialogProps {
  open: boolean;
  client: Client | null;
  onConfirm: (targetStage: ClientStage) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Get stage chip color
 */
const getStageColor = (stage: ClientStage): string => {
  const colors: Record<ClientStage, string> = {
    LEAD: '#9e9e9e', // grey
    FOLLOW_UP: '#2196f3', // blue
    CLIENT: '#4caf50', // green
    CLOSE: '#ff9800', // orange
  };
  return colors[stage];
};

/**
 * Stage badge component
 */
const StageBadge = ({ stage }: { stage: ClientStage }) => (
  <Box
    sx={{
      px: 2,
      py: 1,
      borderRadius: 1,
      bgcolor: getStageColor(stage),
      color: 'white',
      fontWeight: 600,
      display: 'inline-block',
    }}
  >
    {STAGE_LABELS[stage]}
  </Box>
);

export const MoveStageDialog = ({
  open,
  client,
  onConfirm,
  onCancel,
  loading = false,
}: MoveStageDialogProps) => {
  if (!client) return null;

  const currentStage = client.stage;
  const nextStage = NEXT_STAGE[currentStage];
  const isInCloseStage = currentStage === 'CLOSE';
  
  // When in CLOSE stage, allow selecting any stage
  const availableStages: ClientStage[] = isInCloseStage 
    ? ['LEAD', 'FOLLOW_UP', 'CLIENT', 'CLOSE']
    : nextStage 
      ? [nextStage]
      : [];

  const [selectedStage, setSelectedStage] = useState<ClientStage | null>(
    isInCloseStage ? 'LEAD' : nextStage || null
  );

  // Reset selected stage when dialog opens or client changes
  useEffect(() => {
    if (open && client) {
      if (isInCloseStage) {
        setSelectedStage('LEAD');
      } else {
        setSelectedStage(nextStage || null);
      }
    }
  }, [open, client, isInCloseStage, nextStage]);

  const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ');

  const handleConfirm = () => {
    if (selectedStage) {
      onConfirm(selectedStage);
    }
  };

  // If no next stage and not in CLOSE stage, show error
  if (!nextStage && !isInCloseStage) {
    return (
      <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
        <DialogTitle>Cannot Move Stage</DialogTitle>
        <DialogContent>
          <Typography>
            This client is already in the final stage ({STAGE_LABELS[currentStage]}).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Move Client Stage</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {isInCloseStage ? (
            <>Select a new stage for <strong>{clientName}</strong>:</>
          ) : (
            <>Move <strong>{clientName}</strong> to the next stage in the workflow?</>
          )}
        </Typography>

        {isInCloseStage ? (
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Select Stage</InputLabel>
              <Select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value as ClientStage)}
                label="Select Stage"
                disabled={loading}
              >
                {availableStages.map((stage) => (
                  <MenuItem key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              py: 2,
            }}
          >
            <StageBadge stage={currentStage} />
            <ArrowForwardIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
            <StageBadge stage={nextStage!} />
          </Box>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 2 }}
        >
          This action will update the client's stage from{' '}
          <strong>{STAGE_LABELS[currentStage]}</strong> to{' '}
          <strong>{selectedStage ? STAGE_LABELS[selectedStage] : ''}</strong>.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={loading || !selectedStage}
          startIcon={loading ? <CircularProgress size={16} /> : <ArrowForwardIcon />}
        >
          {loading ? 'Moving...' : `Move to ${selectedStage ? STAGE_LABELS[selectedStage] : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MoveStageDialog;
