/**
 * CollegeApplicationCard
 * Card component for displaying college application summary with expandable details
 */
import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Grid,
  Collapse,
  IconButton,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { CollegeApplication } from '@/types/collegeApplication';
import { CollegeApplicationForm } from '@/components/college/CollegeApplicationForm';
import { deleteCollegeApplication, updateCollegeApplication, getCollegeApplication } from '@/services/api/collegeApplicationApi';
import { Protect } from '@/components/protected/Protect';

interface CollegeApplicationCardProps {
  application: CollegeApplication;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onEdit?: (application: CollegeApplication) => void;
  onDelete?: (applicationId: number) => void;
  onUpdate?: () => void;
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

/**
 * Format currency for display
 */
const formatCurrency = (amount: string): string => {
  if (!amount) return '-';
  try {
    const value = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  } catch {
    return amount;
  }
};

/**
 * Detail row component
 */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2">{value || '-'}</Typography>
  </Box>
);

/**
 * Expanded detail row component
 */
const ExpandedDetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
      {label}
    </Typography>
    <Typography variant="body1">{value || '-'}</Typography>
  </Box>
);

/**
 * CollegeApplicationCard Component
 */
export const CollegeApplicationCard = ({
  application,
  isExpanded = false,
  onExpand,
  onCollapse,
  onEdit,
  onDelete,
  onUpdate,
}: CollegeApplicationCardProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [addDocumentDialogOpen, setAddDocumentDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]); // Placeholder for documents

  const handleHeaderClick = () => {
    if (isExpanded) {
      onCollapse?.();
    } else {
      onExpand?.();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCollapse?.();
  };

  const handleSaveApplication = async (data: any) => {
    try {
      setFormLoading(true);
      await updateCollegeApplication(application.id, data);
      
      // Refresh application data
      const updated = await getCollegeApplication(application.id);
      
      setEditDialogOpen(false);
      onUpdate?.();
    } catch (err: any) {
      console.error('Failed to update college application:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setFormLoading(true);
      await deleteCollegeApplication(application.id);
      setDeleteDialogOpen(false);
      onDelete?.(application.id);
      onUpdate?.();
    } catch (err: any) {
      console.error('Failed to delete college application:', err);
      alert('Failed to delete college application. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddDocument = () => {
    // Placeholder - upload functionality to be implemented later
    setAddDocumentDialogOpen(true);
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 2,
          border: isExpanded ? 2 : 1,
          borderColor: isExpanded ? 'primary.main' : 'divider',
          bgcolor: isExpanded ? 'action.selected' : 'background.paper',
          '&:hover': {
            boxShadow: 2,
            cursor: 'pointer',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {/* Header Section - Clickable */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1.5,
          }}
          onClick={handleHeaderClick}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1 }}>
            <SchoolIcon color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {application.course_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {application.institute_name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={application.stage_name}
              color={application.is_final_stage ? 'success' : 'primary'}
              size="small"
            />
            {isExpanded ? (
              <IconButton
                size="small"
                onClick={handleCollapseClick}
                sx={{ ml: 1 }}
                aria-label="Collapse"
              >
                <ExpandLessIcon />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                sx={{ ml: 1 }}
                aria-label="Expand"
              >
                <ExpandMoreIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Summary Section - Always Visible */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Application Type" value={application.application_type_title} />
          </Grid>
          {application.location_display && (
            <Grid size={{ xs: 6, sm: 4 }}>
              <DetailRow label="Location" value={application.location_display} />
            </Grid>
          )}
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Intake Date" value={formatDate(application.intake_date)} />
          </Grid>
          {application.finish_date && (
            <Grid size={{ xs: 6, sm: 4 }}>
              <DetailRow label="Finish Date" value={formatDate(application.finish_date)} />
            </Grid>
          )}
          <Grid size={{ xs: 6, sm: 4 }}>
            <DetailRow label="Tuition Fee" value={formatCurrency(application.total_tuition_fee)} />
          </Grid>
          {application.assigned_to_name && (
            <Grid size={{ xs: 6, sm: 4 }}>
              <DetailRow label="Assigned To" value={application.assigned_to_name} />
            </Grid>
          )}
        </Grid>

        {/* Expanded Section */}
        <Collapse in={isExpanded}>
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            {/* Action Buttons in Header */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 3 }}>
              <Protect permission="change_collegeapplication">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={handleEditClick}
                >
                  Edit
                </Button>
              </Protect>
              <Protect permission="delete_collegeapplication">
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteClick}
                >
                  Delete
                </Button>
              </Protect>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Additional Details */}
            <Grid container spacing={3}>
              {/* Student ID & Agents */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Additional Information
                </Typography>
                {application.student_id && (
                  <ExpandedDetailRow label="Student ID" value={application.student_id} />
                )}
                {application.super_agent_name && (
                  <ExpandedDetailRow label="Super Agent" value={application.super_agent_name} />
                )}
                {application.sub_agent_name && (
                  <ExpandedDetailRow label="Sub Agent" value={application.sub_agent_name} />
                )}
                {!application.student_id && !application.super_agent_name && !application.sub_agent_name && (
                  <Typography variant="body2" color="text.secondary">No additional information</Typography>
                )}
              </Grid>

              {/* Metadata */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Metadata
                </Typography>
                <ExpandedDetailRow label="Created At" value={formatDate(application.created_at)} />
                <ExpandedDetailRow label="Last Updated" value={formatDate(application.updated_at)} />
              </Grid>

              {/* Notes */}
              {application.notes && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Notes
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {application.notes}
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {/* Documents Section */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Documents
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddDocument}
                  >
                    Add Document
                  </Button>
                </Box>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {documents.length === 0 ? (
                    <Box
                      sx={{
                        py: 3,
                        textAlign: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                      <Typography variant="body2" gutterBottom>
                        No documents uploaded yet
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Upload functionality will be available soon
                      </Typography>
                    </Box>
                  ) : (
                    <List dense>
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
                              color="error"
                              aria-label={`Delete ${doc.name}`}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemIcon>
                            <AttachFileIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={doc.name}
                            secondary={doc.uploadDate ? formatDate(doc.uploadDate) : 'No date'}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '90vh',
            },
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Edit College Application</Typography>
            <IconButton onClick={() => setEditDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <CollegeApplicationForm
            mode="edit"
            initialData={application}
            onSave={handleSaveApplication}
            onCancel={() => setEditDialogOpen(false)}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this college application? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={formLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={formLoading}
          >
            {formLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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
    </>
  );
};

export default CollegeApplicationCard;
