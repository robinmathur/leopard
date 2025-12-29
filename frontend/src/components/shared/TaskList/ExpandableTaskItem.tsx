/**
 * ExpandableTaskItem Component
 * Task item with inline expansion for entity views (shows comments in expanded state)
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Avatar,
  Stack,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CancelIcon from '@mui/icons-material/Cancel';
import SortIcon from '@mui/icons-material/Sort';
import { Button } from '@mui/material';
import { TaskItemProps, STATUS_COLORS, PRIORITY_COLORS } from './types';
import { CommentInput } from './CommentInput';
import { addComment } from '@/services/api/taskApi';

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

  const sortedMentions = [...mentions].sort((a, b) => b.start_pos - a.start_pos);
  
  let result = text;
  sortedMentions.forEach((mention) => {
    const before = result.substring(0, mention.start_pos);
    const mentionText = result.substring(mention.start_pos, mention.end_pos);
    const after = result.substring(mention.end_pos);
    // Replace @username with full name in a styled chip-like format
    const displayName = mention.full_name || mention.username;
    result = `${before}<span style="display: inline-block; background-color: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-weight: 500; font-size: 0.875rem; margin: 0 2px;">@${displayName}</span>${after}`;
  });

  return result;
};

export const ExpandableTaskItem = ({
  task,
  onClick,
  onStatusChange,
  onEdit,
  onDelete,
  onQuickAssign,
  onTaskUpdate,
  isSelected = false,
}: TaskItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localTask, setLocalTask] = useState(task);
  const [commentSortOrder, setCommentSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Update local task when prop changes
  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
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

  const handleAddComment = async (comment: string) => {
    setSubmittingComment(true);
    try {
      const updatedTask = await addComment(localTask.id, comment);
      setLocalTask(updatedTask);
      onTaskUpdate?.(updatedTask);
    } catch (err) {
      console.error('Failed to add comment:', err);
      throw err;
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 1.5,
        cursor: 'default',
        backgroundColor: isSelected ? 'action.selected' : 'background.paper',
        borderColor: isSelected ? 'primary.main' : 'divider',
        borderWidth: isSelected ? 2 : 1,
        transition: 'all 0.2s',
      }}
    >
      {/* Collapsed View */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={handleExpand}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <IconButton size="small" onClick={handleExpand}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="subtitle2" fontWeight={600}>
              {localTask.title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', ml: 5 }}>
            <Chip
              label={localTask.status_display}
              size="small"
              color={STATUS_COLORS[localTask.status]}
            />
            <Chip
              label={localTask.priority_display}
              size="small"
              color={PRIORITY_COLORS[localTask.priority]}
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Due: {formatDate(localTask.due_date)}
            </Typography>
            {localTask.assigned_to_full_name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                • {localTask.assigned_to_full_name}
              </Typography>
            )}
            {localTask.branch_name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                • {localTask.branch_name}
              </Typography>
            )}
            {localTask.comments && localTask.comments.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                • {localTask.comments.length} comment{localTask.comments.length !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {localTask.status !== 'COMPLETED' && localTask.status !== 'CANCELLED' && onStatusChange && (
            <>
              {localTask.status === 'PENDING' && (
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
              <Tooltip title="Cancel task">
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange?.(localTask.id, 'CANCELLED');
                  }}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {onQuickAssign && (
            <Tooltip title="Assign/Reassign task">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  // Quick assign would open a dialog - for now just trigger the handler
                  // This would need to be implemented similar to TaskItem
                }}
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

      {/* Expanded View */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 2, ml: 5 }}>
          <Divider sx={{ mb: 2 }} />
          
          {/* Task Details */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Description
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {localTask.detail}
            </Typography>

            <Stack spacing={1}>
              {localTask.assigned_by_full_name && (
                <Typography variant="caption" color="text.secondary">
                  Assigned by: {localTask.assigned_by_full_name}
                </Typography>
              )}
              {localTask.tags && localTask.tags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Tags:
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {localTask.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Comments Section */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2">
                Comments ({localTask.comments?.length || 0})
              </Typography>
              {localTask.comments && localTask.comments.length > 0 && (
                <Button
                  size="small"
                  startIcon={<SortIcon />}
                  onClick={() => setCommentSortOrder(commentSortOrder === 'newest' ? 'oldest' : 'newest')}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  {commentSortOrder === 'oldest' ? 'Newest First' : 'Oldest First'}
                </Button>
              )}
            </Box>

            {/* Comment Input - Moved to top */}
            <Box sx={{ mb: 2 }}>
              <CommentInput
                onSubmit={handleAddComment}
                disabled={submittingComment}
              />
            </Box>

            {/* Comments List - Scrollable */}
            {localTask.comments && localTask.comments.length > 0 ? (
              <Box
                sx={{
                  maxHeight: 300,
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
                  {[...localTask.comments]
                    .sort((a, b) => {
                      const timeA = new Date(a.created_at).getTime();
                      const timeB = new Date(b.created_at).getTime();
                      return commentSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
                    })
                    .map((comment, index) => (
                      <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                            {(comment.full_name || comment.username || 'U')[0].toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" fontWeight={600}>
                              {comment.full_name || comment.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              {formatRelativeTime(comment.created_at)}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}
                          dangerouslySetInnerHTML={{
                            __html: highlightMentions(comment.text, comment.mentions || []),
                          }}
                        />
                      </Paper>
                    ))}
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No comments yet. Be the first to comment!
              </Typography>
            )}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ExpandableTaskItem;

