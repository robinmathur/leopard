/**
 * CollegeApplicationDocuments
 * Documents tab component for document list and management
 */
import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import type { CollegeApplication } from '@/types/collegeApplication';

interface CollegeApplicationDocumentsProps {
  application: CollegeApplication;
}

/**
 * Format date for display
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const CollegeApplicationDocuments = ({ application }: CollegeApplicationDocumentsProps) => {
  const [addDocumentDialogOpen, setAddDocumentDialogOpen] = useState(false);
  const [documents] = useState<any[]>([]); // Placeholder for documents

  const handleAddDocument = () => {
    // Placeholder - upload functionality to be implemented later
    setAddDocumentDialogOpen(true);
  };

  const handleDeleteDocument = (docId: number) => {
    // Placeholder - delete functionality to be implemented later
    console.log('Delete document:', docId);
  };

  const handleDownloadDocument = (docId: number) => {
    // Placeholder - download functionality to be implemented later
    console.log('Download document:', docId);
  };

  const handleViewDocument = (docId: number) => {
    // Placeholder - view functionality to be implemented later
    console.log('View document:', docId);
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Documents
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage documents for this college application
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddDocument}
          >
            Add Document
          </Button>
        </Box>

        {/* Document List */}
        {documents.length === 0 ? (
          <Box
            sx={{
              py: 6,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            <AttachFileIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
            <Typography variant="body1" gutterBottom>
              No documents uploaded yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload functionality will be available soon
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddDocument}
            >
              Upload Document
            </Button>
          </Box>
        ) : (
          <List>
            {documents.map((doc) => (
              <ListItem
                key={doc.id}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  borderRadius: 1,
                  mb: 0.5,
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleViewDocument(doc.id)}
                      aria-label={`View ${doc.name}`}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDownloadDocument(doc.id)}
                      aria-label={`Download ${doc.name}`}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      onClick={() => handleDeleteDocument(doc.id)}
                      aria-label={`Delete ${doc.name}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemIcon>
                  <AttachFileIcon />
                </ListItemIcon>
                <ListItemText
                  primary={doc.name}
                  secondary={`Uploaded ${formatDate(doc.uploadDate)} • ${doc.category || 'Uncategorized'}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Add Document Dialog - Placeholder */}
      <Dialog
        open={addDocumentDialogOpen}
        onClose={() => setAddDocumentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Add Document</Typography>
            <IconButton onClick={() => setAddDocumentDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Document upload functionality will be implemented in the future.
            <br />
            This dialog will allow you to upload and manage documents for this application.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDocumentDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollegeApplicationDocuments;

