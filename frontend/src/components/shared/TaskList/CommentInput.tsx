/**
 * CommentInput Component
 * Text input with @mention autocomplete support
 */
import { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
} from '@mui/material';
import { User } from '@/types/user';
import httpClient from '@/services/api/httpClient';

interface CommentInputProps {
  onSubmit: (comment: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export const CommentInput = ({
  onSubmit,
  disabled = false,
  placeholder = 'Add a comment... Type @ to mention someone',
}: CommentInputProps) => {
  const [comment, setComment] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textFieldRef = useRef<HTMLInputElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // Search users when @ is typed
  useEffect(() => {
    const searchUsers = async (searchTerm: string) => {
      if (searchTerm.length < 1) {
        setMentionUsers([]);
        setShowMentionList(false);
        return;
      }

      try {
        setLoadingUsers(true);
        const response = await httpClient.get<{ count: number; results: User[] }>(
          '/v1/users/',
          {
            params: {
              search: searchTerm,
              page_size: 10,
              is_active: true,
            },
          }
        );
        setMentionUsers(response.data.results);
        setShowMentionList(true);
        setSelectedMentionIndex(0);
      } catch (err) {
        console.error('Failed to search users:', err);
        setMentionUsers([]);
        setShowMentionList(false);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (mentionStartPos >= 0) {
      const textAfterAt = comment.substring(mentionStartPos + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      const searchTerm = spaceIndex >= 0 ? textAfterAt.substring(0, spaceIndex) : textAfterAt;
      searchUsers(searchTerm);
    } else {
      setShowMentionList(false);
      setMentionUsers([]);
    }
  }, [comment, mentionStartPos]);

  const handleCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setComment(newValue);

    // Find @ symbol position
    const cursorPos = event.target.selectionStart || 0;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    // Check if @ is followed by whitespace or is at the end
    // Also check if we're in the middle of a word (not a mention)
    if (lastAtPos >= 0) {
      const textAfterAt = textBeforeCursor.substring(lastAtPos + 1);
      // Check if there's a space before @ (meaning it's a new mention)
      const charBeforeAt = lastAtPos > 0 ? textBeforeCursor[lastAtPos - 1] : ' ';
      
      // Check if we're already past a completed mention (has space after username)
      // Username pattern: alphanumeric and underscore, followed by space
      const mentionPattern = /@[a-zA-Z0-9_]+\s/;
      const textUpToCursor = textBeforeCursor;
      const lastMentionMatch = textUpToCursor.match(mentionPattern);
      
      // If there's a completed mention before cursor and we're typing after it, don't show mention list
      if (lastMentionMatch && lastMentionMatch.index !== undefined) {
        const mentionEndPos = lastMentionMatch.index + lastMentionMatch[0].length;
        if (cursorPos > mentionEndPos) {
          // We're after a completed mention, check if this is a new @
          if (lastAtPos < mentionEndPos) {
            // This @ is part of the old mention, ignore it
            setMentionStartPos(-1);
            return;
          }
        }
      }
      
      // Only show mention list if @ is followed by non-space and we're not in the middle of a word
      if (textAfterAt.length === 0 || (!textAfterAt.match(/^\s/) && (charBeforeAt === ' ' || charBeforeAt === '@' || lastAtPos === 0))) {
        setMentionStartPos(lastAtPos);
        return;
      }
    }

    setMentionStartPos(-1);
  };

  const handleInsertMention = (user: User) => {
    if (mentionStartPos < 0) return;

    const textBefore = comment.substring(0, mentionStartPos);
    const textAfter = comment.substring(mentionStartPos + 1);
    const spaceIndex = textAfter.indexOf(' ');
    const textToReplace = spaceIndex >= 0 ? textAfter.substring(0, spaceIndex) : textAfter;
    const remainingText = spaceIndex >= 0 ? textAfter.substring(spaceIndex) : '';

    // Add space after mention if there's no space already
    const spaceAfter = remainingText.startsWith(' ') ? '' : ' ';
    const newComment = `${textBefore}@${user.username}${spaceAfter}${remainingText}`;
    setComment(newComment);
    setShowMentionList(false);
    setMentionStartPos(-1);
    setMentionUsers([]);

    // Focus back on text field and set cursor position after mention + space
    setTimeout(() => {
      textFieldRef.current?.focus();
      const newCursorPos = textBefore.length + 1 + user.username.length + spaceAfter.length;
      textFieldRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (showMentionList && mentionUsers.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % mentionUsers.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + mentionUsers.length) % mentionUsers.length);
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        handleInsertMention(mentionUsers[selectedMentionIndex]);
      } else if (event.key === 'Escape') {
        setShowMentionList(false);
        setMentionStartPos(-1);
      }
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      // Cmd/Ctrl + Enter to submit
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim() || disabled) return;

    try {
      await onSubmit(comment.trim());
      setComment('');
      setMentionStartPos(-1);
      setShowMentionList(false);
    } catch (err) {
      console.error('Failed to submit comment:', err);
    }
  };

  // Calculate position for mention list
  const getMentionListPosition = () => {
    if (!textFieldRef.current || mentionStartPos < 0) return { top: 0, left: 0 };
    // Simple positioning - could be improved
    return { top: 40, left: 0 };
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          inputRef={textFieldRef}
          fullWidth
          multiline
          maxRows={4}
          value={comment}
          onChange={handleCommentChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!comment.trim() || disabled}
          sx={{ alignSelf: 'flex-start' }}
        >
          Post
        </Button>
      </Box>

      {showMentionList && (
        <Paper
          ref={mentionListRef}
          sx={{
            position: 'absolute',
            ...getMentionListPosition(),
            zIndex: 1000,
            maxHeight: 200,
            overflow: 'auto',
            width: '100%',
            mt: 1,
          }}
        >
          {loadingUsers ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={20} />
            </Box>
          ) : mentionUsers.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No users found
              </Typography>
            </Box>
          ) : (
            <List dense>
              {mentionUsers.map((user, index) => (
                <ListItem
                  key={user.id}
                  button
                  selected={index === selectedMentionIndex}
                  onClick={() => handleInsertMention(user)}
                  sx={{
                    backgroundColor: index === selectedMentionIndex ? 'action.selected' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        {user.full_name || `${user.first_name} ${user.last_name}`.trim()}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        @{user.username}
                        {user.email && ` • ${user.email}`}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CommentInput;

