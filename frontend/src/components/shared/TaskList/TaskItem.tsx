/**
 * TaskItem Component
 * Displays a single task
 */
import { Box, Paper, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { TaskItemProps, STATUS_COLORS, PRIORITY_COLORS } from './types';

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const isOverdue = date < now;
    
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
    
    return isOverdue && !dateString.includes('completed') ? `⚠️ ${formatted}` : formatted;
  } catch {
    return dateString;
  }
};

export const TaskItem = ({ task, onClick, onStatusChange, onEdit, onDelete }: TaskItemProps) => {
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStatusChange && task.status !== 'COMPLETED') {
      onStatusChange(task.id, 'COMPLETED');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(task);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(task.id);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 1.5,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          boxShadow: 1,
          bgcolor: 'action.hover',
        } : {},
      }}
      onClick={() => onClick?.(task)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            {task.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {task.detail}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={task.status_display}
              size="small"
              color={STATUS_COLORS[task.status]}
            />
            <Chip
              label={task.priority_display}
              size="small"
              color={PRIORITY_COLORS[task.priority]}
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
              Due: {formatDate(task.due_date)}
            </Typography>
            {task.assigned_to_full_name && (
              <Typography variant="caption" color="text.secondary">
                • Assigned to: {task.assigned_to_full_name}
              </Typography>
            )}
            {task.assigned_by_full_name && (
              <Typography variant="caption" color="text.secondary">
                • Assigned by: {task.assigned_by_full_name}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && onStatusChange && (
            <Tooltip title="Mark as complete">
              <IconButton
                size="small"
                color="success"
                onClick={handleComplete}
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="Edit task">
              <IconButton
                size="small"
                onClick={handleEdit}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete task">
              <IconButton
                size="small"
                color="error"
                onClick={handleDelete}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default TaskItem;
