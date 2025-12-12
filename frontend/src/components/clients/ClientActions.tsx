/**
 * ClientActions Component
 * Action buttons for client row operations
 */
import { IconButton, Tooltip, Box } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Client, NEXT_STAGE, STAGE_LABELS } from '@/types/client';

interface ClientActionsProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onView: (client: Client) => void;
  onMove: (client: Client) => void;
  disabled?: boolean;
}

export const ClientActions = ({
  client,
  onEdit,
  onDelete,
  onView,
  onMove,
  disabled = false,
}: ClientActionsProps) => {
  const nextStage = NEXT_STAGE[client.stage];
  const canMove = nextStage !== null;
  const nextStageLabel = nextStage ? STAGE_LABELS[nextStage] : null;

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {/* View Details */}
      <Tooltip title="View Details">
        <IconButton
          size="small"
          onClick={() => onView(client)}
          disabled={disabled}
          color="primary"
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Edit Client */}
      <Tooltip title="Edit Client">
        <IconButton
          size="small"
          onClick={() => onEdit(client)}
          disabled={disabled}
          color="default"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Move to Next Stage */}
      <Tooltip title={canMove ? `Move to ${nextStageLabel}` : 'Already in final stage'}>
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

      {/* Delete Client */}
      <Tooltip title="Delete Client">
        <IconButton
          size="small"
          onClick={() => onDelete(client)}
          disabled={disabled}
          color="error"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ClientActions;
