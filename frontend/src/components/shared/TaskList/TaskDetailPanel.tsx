/**
 * TaskDetailPanel Component
 * Inline panel that shows complete task details with comments
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Button,
  Stack,
  Paper,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SortIcon from '@mui/icons-material/Sort';
import { Task, getTask, addComment, completeTask, cancelTask, claimTask } from '@/services/api/taskApi';
import { CommentInput } from './CommentInput';
import { EntityTag } from './EntityTag';
import { PRIORITY_COLORS, STATUS_COLORS } from './types';
import { useAuthStore } from '@/store/authStore';

interface TaskDetailPanelProps {
  open: boolean;
  taskId: number | null;
  onClose: () => void;
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: number) => void;
  onEdit?: (task: Task) => void;
}

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

/**
 * Format relative time
 */
const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
};

/**
 * Highlight @mentions in comment text and replace with full name chips
 */
const highlightMentions = (text: string, mentions: Array<{ start_pos: number; end_pos: number; username: string; full_name?: string }>) => {
  if (!mentions || mentions.length === 0) return text;

  // Sort mentions by position (descending) to avoid index shifting
  const sortedMentions = [...mentions].sort((a, b) => b.start_pos - a.start_pos);
  
  let result = text;
  sortedMentions.forEach((mention) => {
    const before = result.substring(0, mention.start_pos);
    const after = result.substring(mention.end_pos);
    // Replace @username with full name in a styled chip-like format
    const displayName = mention.full_name || mention.username;
    result = `${before}<span style="display: inline-block; background-color: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-weight: 500; font-size: 0.875rem; margin: 0 2px;">@${displayName}</span>${after}`;
  });

  return result;
};

export const TaskDetailPanel = ({
  open,
  taskId,
  onClose,
  onTaskUpdate,
  onTaskDelete,
  onEdit,
}: TaskDetailPanelProps) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentSortOrder, setCommentSortOrder] = useState<'newest' | 'oldest'>('newest');
  const { user: currentUser } = useAuthStore();

  /**
   * Check if the current user can delete this task
   * - Task creator can delete
   * - Branch admins and above can delete
   */
  const canDeleteTask = (): boolean => {
    if (!currentUser || !task) return false;

    // Check if user is the task creator
    const isCreator = task.created_by && Number(currentUser.id) === task.created_by;

    // Check if user is a branch admin or higher
    const adminGroups = ['BRANCH_ADMIN', 'REGION_MANAGER', 'SUPER_ADMIN'];
    const isAdmin = currentUser.groups?.some((group: string) => adminGroups.includes(group));

    return isCreator || isAdmin;
  };

  // Fetch task when panel opens
  useEffect(() => {
    if (open && taskId) {
      fetchTask();
    } else {
      setTask(null);
      setError(null);
    }
  }, [open, taskId]);

  const fetchTask = async () => {
    if (!taskId) return;

    setLoading(true);
    setError(null);
    try {
      const taskData = await getTask(taskId);
      setTask(taskData);
    } catch (err: any) {
      setError(err.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (comment: string) => {
    if (!taskId) return;

    setSubmittingComment(true);
    try {
      const updatedTask = await addComment(taskId, comment);
      setTask(updatedTask);
      onTaskUpdate?.(updatedTask);
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
      throw err;
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleComplete = async () => {
    if (!taskId) return;

    setActionLoading(true);
    try {
      const updatedTask = await completeTask(taskId);
      setTask(updatedTask);
      onTaskUpdate?.(updatedTask);
    } catch (err: any) {
      setError(err.message || 'Failed to complete task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!taskId) return;

    setActionLoading(true);
    try {
      const updatedTask = await cancelTask(taskId);
      setTask(updatedTask);
      onTaskUpdate?.(updatedTask);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!taskId) return;

    setActionLoading(true);
    try {
      const updatedTask = await claimTask(taskId);
      setTask(updatedTask);
      onTaskUpdate?.(updatedTask);
    } catch (err: any) {
      setError(err.message || 'Failed to claim task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId || !task) return;
    onTaskDelete?.(taskId);
  };

  const handleEdit = () => {
    if (task) {
      onEdit?.(task);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
      }}
    >
      <Box sx={{ p: 3, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : task ? (
          <>
            {/* Header with Title and Close Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="h5" sx={{ flex: 1, pr: 2 }}>
                {task.title}
              </Typography>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Task Status */}
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
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
                {task.linked_entity_type && <EntityTag task={task} />}
              </Stack>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Task Details */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Description
              </Typography>
              <Typography variant="body2" sx={{ mb: 1.5, whiteSpace: 'pre-wrap' }}>
                {task.detail}
              </Typography>

              <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                    Due Date
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{formatDate(task.due_date)}</Typography>
                </Box>

                {task.assigned_to_branch ? (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                      Assigned To Branch
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{task.branch_name || 'Branch'}</Typography>
                  </Box>
                ) : task.assigned_to_name ? (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                      Assigned To
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                      {task.assigned_to_full_name || task.assigned_to_name}
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                      Assigned To
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                      Unassigned
                    </Typography>
                  </Box>
                )}

                {task.assigned_by_name && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                      Assigned By
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                      {task.assigned_by_full_name || task.assigned_by_name}
                    </Typography>
                  </Box>
                )}

                {task.status === 'COMPLETED' && task.completed_at && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                      Completed
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                      {formatDate(task.completed_at)}
                      {task.updated_by_full_name && ` by ${task.updated_by_full_name}`}
                      {!task.updated_by_full_name && task.updated_by_name && ` by ${task.updated_by_name}`}
                    </Typography>
                  </Box>
                )}

                {task.status === 'CANCELLED' && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                      Cancelled
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                      {task.updated_by_full_name || task.updated_by_name || 'Unknown user'}
                    </Typography>
                  </Box>
                )}

                {task.tags && task.tags.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                      Tags
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {task.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Action Buttons */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {task.assigned_to_branch && (
                <Button
                  variant="outlined"
                  onClick={handleClaim}
                  disabled={actionLoading}
                  size="small"
                >
                  Claim Task
                </Button>
              )}
              {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                <Button
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleComplete}
                  disabled={actionLoading}
                  size="small"
                >
                  Complete
                </Button>
              )}
              {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={actionLoading}
                  size="small"
                >
                  Cancel
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                disabled={actionLoading}
                size="small"
              >
                Edit
              </Button>
              {canDeleteTask() && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                  disabled={actionLoading}
                  size="small"
                >
                  Delete
                </Button>
              )}
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {/* Comments Section */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  Comments ({task.comments?.length || 0})
                </Typography>
                {task.comments && task.comments.length > 0 && (
                  <Button
                    size="small"
                    startIcon={<SortIcon />}
                    onClick={() => setCommentSortOrder(commentSortOrder === 'newest' ? 'oldest' : 'newest')}
                    sx={{ textTransform: 'none' }}
                  >
                    {commentSortOrder === 'oldest' ? 'Newest First' : 'Oldest First'}
                  </Button>
                )}
              </Box>

              {/* Comment Input - Moved to top */}
              <Box sx={{ mb: 3 }}>
                <CommentInput
                  onSubmit={handleAddComment}
                  disabled={submittingComment || actionLoading}
                />
              </Box>

              {/* Comments List - Scrollable */}
              {task.comments && task.comments.length > 0 ? (
                <Box
                  sx={{
                    maxHeight: 400,
                    overflowY: 'auto',
                    pr: 1,
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.3)',
                      },
                    },
                  }}
                >
                  <Stack spacing={2}>
                    {[...task.comments]
                      .sort((a, b) => {
                        const timeA = new Date(a.created_at).getTime();
                        const timeB = new Date(b.created_at).getTime();
                        return commentSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
                      })
                      .map((comment, index) => (
                        <Paper key={index} sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                              {(comment.full_name || comment.username || 'U')[0].toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2">
                                {comment.full_name || comment.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatRelativeTime(comment.created_at)}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{
                              __html: highlightMentions(comment.text, comment.mentions || []),
                            }}
                          />
                        </Paper>
                      ))}
                  </Stack>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No comments yet. Be the first to comment!
                </Typography>
              )}
            </Box>
          </>
        ) : null}
      </Box>
    </Paper>
  );
};

export default TaskDetailPanel;

