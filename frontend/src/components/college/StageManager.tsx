/**
 * StageManager - Manages stages for an application type with drag-and-drop reordering
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Stage, StageCreateRequest, StageUpdateRequest } from '@/types/collegeApplication';

interface StageManagerProps {
  applicationTypeId: number;
  stages: Stage[];
  onStageCreate: (data: StageCreateRequest) => Promise<void>;
  onStageUpdate: (id: number, data: StageUpdateRequest) => Promise<void>;
  onStageDelete: (id: number) => Promise<void>;
  onStagesReorder: (stages: Stage[]) => Promise<void>;
  loading?: boolean;
}

interface SortableStageItemProps {
  stage: Stage;
  onEdit: (stage: Stage) => void;
  onDelete: (stage: Stage) => void;
}

const SortableStageItem: React.FC<SortableStageItemProps> = ({
  stage,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
      secondaryAction={
        <Box>
          <IconButton size="small" onClick={() => onEdit(stage)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(stage)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      <IconButton
        size="small"
        sx={{ cursor: 'grab', mr: 1 }}
        {...attributes}
        {...listeners}
      >
        <DragIcon />
      </IconButton>
      <Chip
        label={stage.position}
        size="small"
        sx={{ mr: 2, minWidth: 40 }}
        color="primary"
      />
      <ListItemText
        primary={stage.stage_name}
        secondary={stage.description || 'No description'}
        primaryTypographyProps={{ fontWeight: 500 }}
        sx={{ mr: 2 }}
      />
      {stage.is_final_stage && (
        <Chip label="Final" size="small" color="success" sx={{ mr: 8 }} />
      )}
    </ListItem>
  );
};

export const StageManager: React.FC<StageManagerProps> = ({
  applicationTypeId,
  stages,
  onStageCreate,
  onStageUpdate,
  onStageDelete,
  onStagesReorder,
  loading = false,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedStage, setSelectedStage] = React.useState<Stage | null>(null);
  const [formData, setFormData] = React.useState({
    stage_name: '',
    description: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over.id);

      const newStages = arrayMove(stages, oldIndex, newIndex);

      // Update positions and recalculate is_final_stage
      const maxPosition = newStages.length;
      const updatedStages = newStages.map((stage, index) => ({
        ...stage,
        position: index + 1,
        is_final_stage: (index + 1) === maxPosition, // Recalculate final stage
      }));

      await onStagesReorder(updatedStages);
    }
  };

  const handleCreateClick = () => {
    setFormData({ stage_name: '', description: '' });
    setCreateDialogOpen(true);
  };

  const handleEditClick = (stage: Stage) => {
    setSelectedStage(stage);
    setFormData({
      stage_name: stage.stage_name,
      description: stage.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (stage: Stage) => {
    setSelectedStage(stage);
    setDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    await onStageCreate({
      application_type_id: applicationTypeId,
      stage_name: formData.stage_name,
      description: formData.description || undefined,
    });
    setCreateDialogOpen(false);
  };

  const handleUpdate = async () => {
    if (selectedStage) {
      await onStageUpdate(selectedStage.id, {
        stage_name: formData.stage_name,
        description: formData.description || undefined,
      });
      setEditDialogOpen(false);
      setSelectedStage(null);
    }
  };

  const handleDelete = async () => {
    if (selectedStage) {
      await onStageDelete(selectedStage.id);
      setDeleteDialogOpen(false);
      setSelectedStage(null);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Workflow Stages</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
          disabled={loading}
          size="small"
        >
          Add Stage
        </Button>
      </Box>

      {stages.length === 0 ? (
        <Alert severity="info">
          No stages defined. Add at least one stage to enable application creation.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drag and drop stages to reorder. Position 1 is auto-assigned to new applications.
          </Typography>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <List sx={{ p: 0 }}>
                {stages.map((stage) => (
                  <SortableStageItem
                    key={stage.id}
                    stage={stage}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </List>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Stage</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Stage Name"
              value={formData.stage_name}
              onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
              required
              placeholder="e.g., Application Received, Documents Verified"
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={loading || !formData.stage_name}>
            {loading ? 'Adding...' : 'Add Stage'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Stage</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Stage Name"
              value={formData.stage_name}
              onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} variant="contained" disabled={loading || !formData.stage_name}>
            {loading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Stage</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the stage "{selectedStage?.stage_name}"?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. Make sure no applications are in this stage.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
