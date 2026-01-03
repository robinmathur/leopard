/**
 * ClientActions Component
 * Action buttons for client row operations
 */
import { IconButton, Tooltip, Box } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Client, NEXT_STAGE, STAGE_LABELS } from '@/types/client';

interface ClientActionsProps {
  client: Client;
  onMove: (client: Client) => void;
  onAssign: (client: Client) => void;
  disabled?: boolean;
}

export const ClientActions = ({
  client,
  onMove,
  onAssign,
  disabled = false,
}: ClientActionsProps) => {
  const nextStage = NEXT_STAGE[client.stage];
  const isInCloseStage = client.stage === 'CLOSE';
  // Allow moving if there's a next stage OR if client is in CLOSE stage (can move back)
  const canMove = nextStage !== null || isInCloseStage;
  const nextStageLabel = nextStage ? STAGE_LABELS[nextStage] : isInCloseStage ? 'Change Stage' : null;

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {/* Assign Client */}
      <Tooltip title="Assign">
        <IconButton
          size="small"
          onClick={() => onAssign(client)}
          disabled={disabled}
          color="primary"
        >
          <PersonAddIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Move to Next Stage or Change Stage */}
      <Tooltip title={canMove ? (isInCloseStage ? 'Change Stage' : `Move to ${nextStageLabel}`) : 'Already in final stage'}>
        <span>
          <IconButton
            size="small"
            onClick={() => onMove(client)}
            disabled={disabled || !canMove}
            color="info"
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default ClientActions;
