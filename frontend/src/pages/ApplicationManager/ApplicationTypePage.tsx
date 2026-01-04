/**
 * ApplicationTypePage - Manage application types and their workflow stages
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ToggleOff,
  ToggleOn,
} from '@mui/icons-material';
import { ApplicationTypeForm } from '@/components/college/ApplicationTypeForm';
import { StageManager } from '@/components/college/StageManager';
import {
  listApplicationTypes,
  createApplicationType,
  updateApplicationType,
  deleteApplicationType,
  listStages,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
} from '@/services/api/collegeApplicationApi';
import type {
  ApplicationType,
  ApplicationTypeCreateRequest,
  Stage,
  StageCreateRequest,
  StageUpdateRequest,
} from '@/types/collegeApplication';

export const ApplicationTypePage: React.FC = () => {
  const [applicationTypes, setApplicationTypes] = React.useState<ApplicationType[]>([]);
  const [selectedType, setSelectedType] = React.useState<ApplicationType | null>(null);
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<ApplicationType | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [typeToDelete, setTypeToDelete] = React.useState<ApplicationType | null>(null);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const loadApplicationTypes = async () => {
    try {
      setLoading(true);
      const response = await listApplicationTypes();
      setApplicationTypes(response.results);

      // If a type is selected, update it with the refreshed data
      if (selectedType) {
        const updatedSelectedType = response.results.find((t) => t.id === selectedType.id);
        if (updatedSelectedType) {
          setSelectedType(updatedSelectedType); }}else if (response.results.length > 0) {
        // Auto-select first type if available and nothing is selected
        setSelectedType(response.results[0]); }}catch (error) {
      showSnackbar('Failed to load application types', 'error');
    } finally {
      setLoading(false); }};

  const loadStages = async (applicationTypeId: number) => {
    try {
      const stagesList = await listStages({ application_type_id: applicationTypeId });
      setStages(stagesList);
    } catch (error) {
      showSnackbar('Failed to load stages', 'error'); }};

  React.useEffect(() => {
    loadApplicationTypes();
  }, []);

  React.useEffect(() => {
    if (selectedType) {
      loadStages(selectedType.id); }}, [selectedType]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateClick = () => {
    setEditingType(undefined);
    setFormOpen(true);
  };

  const handleEditClick = (type: ApplicationType) => {
    setEditingType(type);
    setFormOpen(true);
  };

  const handleDeleteClick = (type: ApplicationType) => {
    setTypeToDelete(type);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: ApplicationTypeCreateRequest) => {
    try {
      if (editingType) {
        await updateApplicationType(editingType.id, data);
        showSnackbar('Application type updated successfully', 'success');
      } else {
        const newType = await createApplicationType(data);
        showSnackbar('Application type created successfully', 'success');
        setSelectedType(newType);
      }
      setFormOpen(false);
      await loadApplicationTypes();
    } catch (error: any) {
      showSnackbar(error.response?.data?.detail || 'Failed to save application type', 'error'); }};

  const handleDelete = async () => {
    if (!typeToDelete) return;

    try {
      await deleteApplicationType(typeToDelete.id);
      showSnackbar('Application type deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setTypeToDelete(null);

      // If deleted type was selected, clear selection
      if (selectedType?.id === typeToDelete.id) {
        setSelectedType(null);
        setStages([]);
      }

      await loadApplicationTypes();
    } catch (error: any) {
      showSnackbar(error.response?.data?.detail || 'Failed to delete application type', 'error'); }};

  const handleToggleActive = async (type: ApplicationType) => {
    try {
      await updateApplicationType(type.id, { is_active: !type.is_active });
      showSnackbar(`Application type ${type.is_active ? 'deactivated' : 'activated'}`, 'success');
      await loadApplicationTypes();
    } catch (error) {
      showSnackbar('Failed to update status', 'error'); }};

  const handleStageCreate = async (data: StageCreateRequest) => {
    try {
      await createStage(data);
      showSnackbar('Stage added successfully', 'success');
      if (selectedType) {
        await loadStages(selectedType.id);
        // Reload application types to update stages_count
        await loadApplicationTypes(); }}catch (error: any) {
      showSnackbar(error.response?.data?.detail || 'Failed to create stage', 'error');
      throw error; }};

  const handleStageUpdate = async (id: number, data: StageUpdateRequest) => {
    try {
      await updateStage(id, data);
      showSnackbar('Stage updated successfully', 'success');
      if (selectedType) {
        await loadStages(selectedType.id); }}catch (error: any) {
      showSnackbar(error.response?.data?.detail || 'Failed to update stage', 'error');
      throw error; }};

  const handleStageDelete = async (id: number) => {
    try {
      await deleteStage(id);
      showSnackbar('Stage deleted successfully', 'success');
      if (selectedType) {
        await loadStages(selectedType.id);
        // Reload application types to update stages_count
        await loadApplicationTypes(); }}catch (error: any) {
      showSnackbar(error.response?.data?.detail || 'Failed to delete stage', 'error');
      throw error; }};

  const handleStagesReorder = async (reorderedStages: Stage[]) => {
    try {
      if (!selectedType) return;

      const reorderData = {
        application_type_id: selectedType.id,
        stages: reorderedStages.map((stage, index) => ({
          stage_id: stage.id,
          new_position: index + 1,
        })),
      };

      await reorderStages(reorderData);
      setStages(reorderedStages);
      showSnackbar('Stages reordered successfully', 'success');
    } catch (error: any) {
      showSnackbar(error.response?.data?.detail || 'Failed to reorder stages', 'error');
      throw error; }};

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Application Types</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateClick} size="small">
          New Application Type
        </Button>
      </Box>

      {applicationTypes.length === 0 ? (
        <Alert severity="info">
          No application types found. Create one to get started.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {/* Left: Application Types List */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5 }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                Application Types ({applicationTypes.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {applicationTypes.map((type) => (
                  <Card
                    key={type.id}
                    variant={selectedType?.id === type.id ? 'elevation' : 'outlined'}
                    elevation={selectedType?.id === type.id ? 3 : 0}
                    sx={{
                      cursor: 'pointer',
                      borderWidth: selectedType?.id === type.id ? 2 : 1,
                      borderColor: selectedType?.id === type.id ? 'primary.main' : 'divider',
                      bgcolor: selectedType?.id === type.id ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: selectedType?.id === type.id ? 'rgba(25, 118, 210, 0.15)' : 'action.hover',
                        borderColor: 'primary.main',
                      }, }}onClick={() => setSelectedType(type)}
                  >
                    <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 }}}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {type.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                            <Chip label={type.currency} size="small" sx={{ height: 20, fontSize: '0.7rem' }}/>
                            <Chip label={`${type.stages_count} stages`} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }}/>
                            {type.is_active ? (
                              <Chip label="Active" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }}/>
                            ) : (
                              <Chip label="Inactive" size="small" sx={{ height: 20, fontSize: '0.7rem' }}/>
                            )}
                          </Box>
                          {type.tax_name && (
                            <Typography variant="caption" color="text.secondary">
                              {type.tax_name}: {type.tax_percentage}%
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ py: 0.5, px: 1 }}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleActive(type); }}>
                        {type.is_active ? <ToggleOn color="success" fontSize="small" /> : <ToggleOff fontSize="small" />}
                      </IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditClick(type); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(type); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Right: Stage Manager */}
          <Grid size={{ xs: 12, md: 8 }}>
            {selectedType ? (
              <StageManager
                applicationTypeId={selectedType.id}
                stages={stages}
                onStageCreate={handleStageCreate}
                onStageUpdate={handleStageUpdate}
                onStageDelete={handleStageDelete}
                onStagesReorder={handleStagesReorder}
              />
            ) : (
              <Alert severity="info">Select an application type to manage its stages</Alert>
            )}
          </Grid>
        </Grid>
      )}

      {/* Form Dialog */}
      <ApplicationTypeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingType}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Application Type</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{typeToDelete?.title}"?
          </DialogContentText>
          {typeToDelete?.has_applications && (
            <Alert severity="error" sx={{ mt: 2 }}>
              This application type has associated applications and cannot be deleted.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={typeToDelete?.has_applications}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};
