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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { Add, Edit, Delete, Close, Visibility, Description } from '@mui/icons-material';
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
 * View Documents Dialog
 */
interface ViewDocumentsDialogProps {
  open: boolean;
  visaType: VisaType | null;
  onClose: () => void;
}

const ViewDocumentsDialog = ({ open, visaType, onClose }: ViewDocumentsDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description color="primary" />
          <Typography variant="h6">Document Checklist</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {visaType ? (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Visa Type
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {visaType.name}
              </Typography>
              {visaType.code && (
                <Typography variant="caption" color="text.secondary">
                  Code: {visaType.code}
                </Typography>
              )}
            </Box>
            <Divider sx={{ my: 2 }} />
            {visaType.checklist && visaType.checklist.length > 0 ? (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Required Documents ({visaType.checklist.length})
                </Typography>
                <List dense sx={{ mt: 1 }}>
                  {visaType.checklist.map((document, index) => (
                    <ListItem
                      key={index}
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
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            fontWeight: 600,
                          }}
                        >
                          {index + 1}
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={document}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 500,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ) : (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 4,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No documents added to this visa type yet
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <CircularProgress />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
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
  const [viewDocumentsDialogOpen, setViewDocumentsDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Fetch visa types with AbortController support
  const fetchVisaTypes = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getVisaTypes({
        page: page + 1,
        page_size: pageSize,
      }, signal);
      setVisaTypes(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'CanceledError' || signal?.aborted) {
        return;
      }
      setError(err.message || 'Failed to fetch visa types');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [page, pageSize]);

  // Fetch visa categories with AbortController support
  const fetchCategories = useCallback(async (signal?: AbortSignal) => {
    try {
      setCategoriesLoading(true);
      const data = await getVisaCategories(signal);
      if (!signal?.aborted) {
        setCategories(data);
      }
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'CanceledError' || signal?.aborted) {
        return;
      }
      console.error('Failed to fetch categories:', err);
    } finally {
      if (!signal?.aborted) {
        setCategoriesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    fetchVisaTypes(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [fetchVisaTypes]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchCategories(abortController.signal);
    return () => {
      abortController.abort();
    };
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

  const handleViewDocuments = (visaType: VisaType) => {
    setSelectedVisaType(visaType);
    setViewDocumentsDialogOpen(true);
  };

  const handleCloseViewDocuments = () => {
    setViewDocumentsDialogOpen(false);
    setSelectedVisaType(null);
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

      <Paper sx={{ p: 2 }}>
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
                        onClick={() => handleViewDocuments(visaType)}
                        sx={{
                          cursor: visaType.checklist.length > 0 ? 'pointer' : 'default',
                          '&:hover': visaType.checklist.length > 0 ? {
                            bgcolor: 'primary.dark',
                            color: 'primary.contrastText',
                          } : {},
                        }}
                        icon={visaType.checklist.length > 0 ? <Visibility fontSize="small" /> : undefined}
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
                      <Tooltip title="View Documents">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewDocuments(visaType)}
                          color="primary"
                          disabled={visaType.checklist.length === 0}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditVisaType(visaType)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteVisaType(visaType)} color="error">
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

      {/* View Documents Dialog */}
      <ViewDocumentsDialog
        open={viewDocumentsDialogOpen}
        visaType={selectedVisaType}
        onClose={handleCloseViewDocuments}
      />

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
