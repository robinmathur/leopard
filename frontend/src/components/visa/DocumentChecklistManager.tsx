/**
 * DocumentChecklistManager Component
 * Manages document checklist with received status tracking
 */
import { useState } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DocumentChecklistItem } from '@/services/api/visaApplicationApi';

interface DocumentChecklistManagerProps {
  /** Current document list */
  documents: DocumentChecklistItem[];
  /** Callback when documents are updated */
  onChange: (documents: DocumentChecklistItem[]) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether to show the add custom document feature */
  allowCustomDocuments?: boolean;
  /** Title for the component */
  title?: string;
}

/**
 * DocumentChecklistManager Component
 * Displays document checklist with ability to mark as received
 */
export const DocumentChecklistManager = ({
  documents,
  onChange,
  disabled = false,
  allowCustomDocuments = true,
  title = 'Document Checklist',
}: DocumentChecklistManagerProps) => {
  const [customDocument, setCustomDocument] = useState('');

  const handleToggleReceived = (index: number) => {
    const updated = [...documents];
    updated[index] = {
      ...updated[index],
      received: !updated[index].received,
    };
    onChange(updated);
  };

  const handleRemoveDocument = (index: number) => {
    const updated = documents.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAddCustomDocument = () => {
    if (customDocument.trim() && !documents.some((doc) => doc.name === customDocument.trim())) {
      const updated = [...documents, { name: customDocument.trim(), received: false }];
      onChange(updated);
      setCustomDocument('');
    }
  };

  const receivedCount = documents.filter((doc) => doc.received).length;
  const totalCount = documents.length;
  const progressPercentage = totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {receivedCount} of {totalCount} documents received ({progressPercentage}%)
          </Typography>
        </Box>
        {totalCount > 0 && (
          <Chip
            icon={<CheckCircleIcon />}
            label={`${progressPercentage}%`}
            color={progressPercentage === 100 ? 'success' : progressPercentage > 0 ? 'primary' : 'default'}
            size="small"
          />
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Document List */}
      {documents.length === 0 ? (
        <Box
          sx={{
            py: 3,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">No documents in checklist</Typography>
          {allowCustomDocuments && (
            <Typography variant="caption" color="text.secondary">
              Add documents using the field below
            </Typography>
          )}
        </Box>
      ) : (
        <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
          {documents.map((doc, index) => (
            <ListItem
              key={index}
              sx={{
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                borderRadius: 1,
                mb: 0.5,
              }}
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleRemoveDocument(index)}
                  disabled={disabled}
                  color="error"
                  aria-label={`Remove ${doc.name}`}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={doc.received}
                  onChange={() => handleToggleReceived(index)}
                  disabled={disabled}
                  color="success"
                  tabIndex={-1}
                />
              </ListItemIcon>
              <ListItemText
                primary={doc.name}
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: {
                    textDecoration: doc.received ? 'line-through' : 'none',
                    color: doc.received ? 'text.secondary' : 'text.primary',
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Add Custom Document */}
      {allowCustomDocuments && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={customDocument}
              onChange={(e) => setCustomDocument(e.target.value)}
              placeholder="Add custom document..."
              size="small"
              fullWidth
              disabled={disabled}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomDocument();
                }
              }}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddCustomDocument}
              disabled={disabled || !customDocument.trim()}
              sx={{ minWidth: 100 }}
            >
              Add
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default DocumentChecklistManager;
