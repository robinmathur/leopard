/**
 * VisaTypePage
 * Page for managing visa types with CRUD operations
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Add, Edit, Delete, Close } from '@mui/icons-material';
import {
  getVisaTypes,
  getVisaCategories,
  createVisaType,
  updateVisaType,
  deleteVisaType,
} from '@/services/api/visaTypeApi';
import {
  VisaType,
  VisaCategory,
  VisaTypeCreateRequest,
  VisaTypeUpdateRequest,
} from '@/types/visaType';

/**
 * Visa Type Form Component
 */
interface VisaTypeFormProps {
  mode: 'add' | 'edit';
  initialData?: VisaType;
  categories: VisaCategory[];
  onSave: (data: VisaTypeCreateRequest | VisaTypeUpdateRequest) => void;
  onCancel: () => void;
  loading: boolean;
}

const VisaTypeForm = ({
  mode,
  initialData,
  categories,
  onSave,
  onCancel,
  loading,
}: VisaTypeFormProps) => {
  const [formData, setFormData] = useState<{
    visa_category_id: number | '';
    name: string;
    code: string;
    description: string;
    checklist: string[];
  }>({
    visa_category_id: initialData?.visa_category.id || '',
    name: initialData?.name || '',
    code: initialData?.code || '',
    description: initialData?.description || '',
    checklist: initialData?.checklist || [],
  });
  const [checklistInput, setChecklistInput] = useState('');

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddChecklistItem = () => {
    if (checklistInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        checklist: [...prev.checklist, checklistInput.trim()],
      }));
      setChecklistInput('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (formData.visa_category_id === '') {
      return;
    }

    const data: any = {
      visa_category_id: formData.visa_category_id as number,
      name: formData.name,
      code: formData.code || undefined,
      description: formData.description || undefined,
      checklist: formData.checklist,
    };

    onSave(data);
  };

  return (
    <Box sx={{ pt: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          select
          label="Visa Category *"
          value={formData.visa_category_id}
          onChange={(e) => handleChange('visa_category_id', e.target.value)}
          fullWidth
          size="small"
          disabled={loading}
        >
          <MenuItem value="">Select Category</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Visa Type *"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          fullWidth
          size="small"
          disabled={loading}
          placeholder="e.g., Student Visa"
        />

        <TextField
          label="Sub Class / Code"
          value={formData.code}
          onChange={(e) => handleChange('code', e.target.value)}
          fullWidth
          size="small"
          disabled={loading}
          placeholder="e.g., Subclass 500"
        />

        <TextField
          label="Description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          fullWidth
          size="small"
          disabled={loading}
          multiline
          rows={3}
          placeholder="Enter visa type description"
        />

        <Box>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
            Document Checklist
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              value={checklistInput}
              onChange={(e) => setChecklistInput(e.target.value)}
              fullWidth
              size="small"
              disabled={loading}
              placeholder="Enter document name"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
            />
            <Button
              variant="contained"
              onClick={handleAddChecklistItem}
              disabled={loading || !checklistInput.trim()}
              startIcon={<Add />}
            >
              Add
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {formData.checklist.map((item, index) => (
              <Chip
                key={index}
                label={item}
                onDelete={() => handleRemoveChecklistItem(index)}
                disabled={loading}
                size="small"
              />
            ))}
            {formData.checklist.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                No documents added yet
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !formData.name || formData.visa_category_id === ''}
        >
          {loading ? <CircularProgress size={20} /> : mode === 'add' ? 'Create' : 'Update'}
        </Button>
      </Box>
    </Box>
  );
};

/**
 * Delete Confirmation Dialog
 */
interface DeleteConfirmDialogProps {
  open: boolean;
  visaType: VisaType | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteConfirmDialog = ({
  open,
  visaType,
  onConfirm,
  onCancel,
  loading,
}: DeleteConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Visa Type</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete <strong>{visaType?.name}</strong>?
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Main VisaTypePage Component
 */
export const VisaTypePage = () => {
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [categories, setCategories] = useState<VisaCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
  const [selectedVisaType, setSelectedVisaType] = useState<VisaType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Fetch visa types
  const fetchVisaTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getVisaTypes({
        page: page + 1,
        page_size: pageSize,
      });
      setVisaTypes(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visa types');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Fetch visa categories
  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const data = await getVisaCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisaTypes();
  }, [fetchVisaTypes]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddVisaType = () => {
    setDialogMode('add');
    setSelectedVisaType(null);
  };

  const handleEditVisaType = (visaType: VisaType) => {
    setDialogMode('edit');
    setSelectedVisaType(visaType);
  };

  const handleDeleteVisaType = (visaType: VisaType) => {
    setSelectedVisaType(visaType);
    setDeleteDialogOpen(true);
  };

  const handleSaveVisaType = async (data: VisaTypeCreateRequest | VisaTypeUpdateRequest) => {
    try {
      setFormLoading(true);

      if (dialogMode === 'add') {
        await createVisaType(data as VisaTypeCreateRequest);
        setSnackbar({
          open: true,
          message: 'Visa type created successfully',
          severity: 'success',
        });
      } else if (dialogMode === 'edit' && selectedVisaType) {
        await updateVisaType(selectedVisaType.id, data as VisaTypeUpdateRequest);
        setSnackbar({
          open: true,
          message: 'Visa type updated successfully',
          severity: 'success',
        });
      }

      setDialogMode(null);
      setSelectedVisaType(null);
      fetchVisaTypes();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to save visa type',
        severity: 'error',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedVisaType) return;

    try {
      setFormLoading(true);
      await deleteVisaType(selectedVisaType.id);
      setSnackbar({
        open: true,
        message: 'Visa type deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setSelectedVisaType(null);
      fetchVisaTypes();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete visa type',
        severity: 'error',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedVisaType(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedVisaType(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Visa Type Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage visa types and their document checklists
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddVisaType}
          size="small"
        >
          Add Visa Type
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Visa Type</TableCell>
                <TableCell>Code / Subclass</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Documents</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : visaTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No visa types found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visaTypes.map((visaType) => (
                  <TableRow key={visaType.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {visaType.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{visaType.code || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{visaType.visa_category_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${visaType.checklist.length} documents`}
                        size="small"
                        color={visaType.checklist.length > 0 ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {visaType.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditVisaType(visaType)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteVisaType(visaType)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && visaTypes.length > 0 && (
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => {
              setPageSize(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={formLoading ? undefined : handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {dialogMode === 'add' ? 'Add Visa Type' : 'Edit Visa Type'}
          <IconButton onClick={handleCloseDialog} disabled={formLoading} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {categoriesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <VisaTypeForm
              mode={dialogMode || 'add'}
              initialData={selectedVisaType || undefined}
              categories={categories}
              onSave={handleSaveVisaType}
              onCancel={handleCloseDialog}
              loading={formLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        visaType={selectedVisaType}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={formLoading}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VisaTypePage;
