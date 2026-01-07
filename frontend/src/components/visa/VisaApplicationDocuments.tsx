/**
 * VisaApplicationDocuments
 * Documents tab component for document checklist management
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
} from '@mui/material';
import type { VisaApplication, DocumentChecklistItem } from '@/services/api/visaApplicationApi';
import { DocumentChecklistManager } from '@/components/visa/DocumentChecklistManager';
import { updateVisaApplication } from '@/services/api/visaApplicationApi';

interface VisaApplicationDocumentsProps {
  application: VisaApplication;
}

export const VisaApplicationDocuments = ({ application }: VisaApplicationDocumentsProps) => {
  const [documents, setDocuments] = useState<DocumentChecklistItem[]>(application.required_documents || []);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update documents when application changes
  useEffect(() => {
    setDocuments(application.required_documents || []);
  }, [application.required_documents]);

  // Handle document checklist changes
  const handleDocumentsChange = async (updatedDocuments: DocumentChecklistItem[]) => {
    try {
      setIsUpdating(true);
      // Update the visa application with new document checklist
      await updateVisaApplication(application.id, {
        required_documents: updatedDocuments,
      });
      setDocuments(updatedDocuments);
    } catch (err: any) {
      console.error('Failed to update document checklist:', err);
      // Revert to previous state on error
      setDocuments(application.required_documents || []);
      alert('Failed to update document checklist. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Documents
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage required documents checklist for this visa application
        </Typography>
        <DocumentChecklistManager
          documents={documents}
          onChange={handleDocumentsChange}
          disabled={isUpdating}
          allowCustomDocuments={true}
          title="Required Documents Checklist"
        />
      </Paper>
    </Box>
  );
};

export default VisaApplicationDocuments;

