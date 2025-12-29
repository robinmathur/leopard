/**
 * TaskItem Component
 * Displays a single task
 */
import { useState } from 'react';
import { Box, Paper, Typography, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { TaskItemProps, STATUS_COLORS, PRIORITY_COLORS } from './types';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import type { User } from '@/types/user';
import { EntityTag } from './EntityTag';
import { useAuthStore } from '@/store/authStore';

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

export const TaskItem = ({ task, onClick, onStatusChange, onEdit, onDelete, onQuickAssign, isSelected = false }: TaskItemProps) => {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const { user: currentUser } = useAuthStore();

  /**
   * Check if the current user can delete this task
   * - Task creator can delete
   * - Branch admins and above can delete
   */
  const canDeleteTask = (): boolean => {
    if (!currentUser) return false;

    // Check if user is the task creator
    const isCreator = task.created_by && Number(currentUser.id) === task.created_by;

    // Check if user is a branch admin or higher
    const adminGroups = ['BRANCH_ADMIN', 'REGION_MANAGER', 'SUPER_ADMIN'];
    const isAdmin = currentUser.groups?.some((group: string) => adminGroups.includes(group));

    return isCreator || isAdmin;
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStatusChange && task.status !== 'COMPLETED') {
      onStatusChange(task.id, 'COMPLETED');
    }
  };

  const handleInProgress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStatusChange && task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && task.status !== 'CANCELLED') {
      onStatusChange(task.id, 'IN_PROGRESS');
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

  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignDialogOpen(true);
    setSelectedUser(null);
  };

  const handleAssignClose = () => {
    if (!isAssigning) {
      setAssignDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleAssignConfirm = async () => {
    if (!selectedUser || !onQuickAssign) return;
    
    setIsAssigning(true);
    try {
      await onQuickAssign(task.id, selectedUser.id);
      setAssignDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Failed to assign task:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!onQuickAssign) return;
    
    setIsAssigning(true);
    try {
      await onQuickAssign(task.id, null);
      setAssignDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Failed to unassign task:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 1.5,
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: isSelected ? 'action.selected' : 'background.paper',
        borderColor: isSelected ? 'primary.main' : 'divider',
        borderWidth: isSelected ? 2 : 1,
        '&:hover': onClick ? {
          backgroundColor: isSelected ? 'action.selected' : 'action.hover',
        } : {},
        transition: 'all 0.2s',
      }}
      onClick={onClick ? () => onClick(task) : undefined}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            {task.title}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              display: 'block', 
              mb: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {task.detail}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
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
            <EntityTag task={task} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Due: {formatDate(task.due_date)}
            </Typography>
            {task.assigned_to_full_name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                • {task.assigned_to_full_name}
              </Typography>
            )}
            {task.branch_name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                • Branch: {task.branch_name}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && onStatusChange && (
            <>
              {task.status === 'PENDING' && (
                <Tooltip title="Start task">
                  <IconButton
                    size="small"
                    color="info"
                    onClick={handleInProgress}
                  >
                    <PlayArrowIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Mark as complete">
                <IconButton
                  size="small"
                  color="success"
                  onClick={handleComplete}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {onQuickAssign && (
            <Tooltip title="Assign/Reassign task">
              <IconButton
                size="small"
                color="primary"
                onClick={handleAssignClick}
              >
                <PersonAddIcon fontSize="small" />
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
          {onDelete && canDeleteTask() && (
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
      {/* Assign Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={handleAssignClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Task</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Assign <strong>{task.title}</strong> to:
          </Typography>

          <Box sx={{ mb: 2 }}>
            <UserAutocomplete
              value={selectedUser}
              onChange={setSelectedUser}
              label="Select User"
              placeholder="Search for a user (type at least 2 characters)..."
              disabled={isAssigning}
              size="medium"
            />
          </Box>

          {task.assigned_to_full_name && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Currently assigned to: <strong>{task.assigned_to_full_name}</strong>
            </Typography>
          )}

          {!task.assigned_to_full_name && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              No user currently assigned.
            </Typography>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 2 }}
          >
            {selectedUser
              ? `Task will be assigned to ${selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name}`.trim()}.`
              : task.assigned_to_full_name
              ? 'Select a user to reassign, or leave empty to unassign.'
              : 'Please select a user to assign.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {task.assigned_to_full_name && (
            <Button
              onClick={handleUnassign}
              color="error"
              disabled={isAssigning}
              sx={{ mr: 'auto' }}
            >
              Unassign
            </Button>
          )}
          <Button onClick={handleAssignClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignConfirm}
            variant="contained"
            disabled={isAssigning || !selectedUser}
          >
            {isAssigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TaskItem;
