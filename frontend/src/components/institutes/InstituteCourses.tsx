/**
 * InstituteCourses Component
 * Displays and manages courses for an institute
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { instituteApi } from '@/services/api/instituteApi';
import {
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
  CourseLevel,
  BroadField,
  NarrowField,
} from '@/types/institute';
import { Protect } from '@/components/protected/Protect';
import { usePermission } from '@/auth/hooks/usePermission';

interface InstituteCoursesProps {
  instituteId: number;
}

export const InstituteCourses = ({ instituteId }: InstituteCoursesProps) => {
  const { hasAnyPermission } = usePermission();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Check if user has any action permissions
  const hasAnyAction = hasAnyPermission(['change_institute','delete_institute']);
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    total_tuition_fee: '',
    coe_fee: '',
    broad_field: '',
    narrow_field: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dropdown options - only loaded when needed
  const [courseLevels, setCourseLevels] = useState<CourseLevel[]>([]);
  const [broadFields, setBroadFields] = useState<BroadField[]>([]);
  const [narrowFields, setNarrowFields] = useState<NarrowField[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Dialogs for adding Course Level, Broad/Narrow fields
  const [courseLevelDialogOpen, setCourseLevelDialogOpen] = useState(false);
  const [broadFieldDialogOpen, setBroadFieldDialogOpen] = useState(false);
  const [narrowFieldDialogOpen, setNarrowFieldDialogOpen] = useState(false);
  const [newCourseLevelName, setNewCourseLevelName] = useState('');
  const [newBroadFieldName, setNewBroadFieldName] = useState('');
  const [newNarrowFieldName, setNewNarrowFieldName] = useState('');
  const [savingField, setSavingField] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const data = await instituteApi.listCourses(instituteId, abortController.signal);
        setCourses(data);
      } catch (err) {
        // Ignore abort errors
        if ((err as Error).name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        setError('Failed to load courses');
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      abortController.abort();
    };
  }, [instituteId]);

  // Load options only when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      loadOptions();
    }
  }, [dialogOpen]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const [levels, broads] = await Promise.all([
        instituteApi.listCourseLevels(),
        instituteApi.listBroadFields(),
      ]);
      setCourseLevels(levels);
      setBroadFields(broads);
    } catch (err) {
      setError('Failed to load course options');
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadNarrowFields = async (broadFieldId: number) => {
    try {
      const fields = await instituteApi.listNarrowFields(broadFieldId);
      setNarrowFields(fields);
    } catch (err) {
      setError('Failed to load narrow fields');
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await instituteApi.listCourses(instituteId);
      setCourses(data);
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (courseId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const getLevelName = (course: Course): string => {
    if (course.level_name) {
      return course.level_name;
    }
    if (typeof course.level === 'object' && course.level !== null && 'name' in course.level) {
      return course.level.name;
    }
    // Find in loaded levels
    const levelId = typeof course.level === 'object' && course.level !== null && 'id' in course.level
      ? course.level.id
      : course.level;
    const level = courseLevels.find((l) => l.id === levelId);
    return level?.name || `Level ${levelId}`;
  };

  const getBroadFieldName = (course: Course): string => {
    if (course.broad_field_name) {
      return course.broad_field_name;
    }
    if (typeof course.broad_field === 'object' && course.broad_field !== null && 'name' in course.broad_field) {
      return course.broad_field.name;
    }
    const fieldId = typeof course.broad_field === 'object' && course.broad_field !== null && 'id' in course.broad_field
      ? course.broad_field.id
      : course.broad_field;
    const field = broadFields.find((f) => f.id === fieldId);
    return field?.name || `Field ${fieldId}`;
  };

  const getNarrowFieldName = (course: Course): string => {
    if (course.narrow_field_name) {
      return course.narrow_field_name;
    }
    if (typeof course.narrow_field === 'object' && course.narrow_field !== null && 'name' in course.narrow_field) {
      return course.narrow_field.name;
    }
    const fieldId = typeof course.narrow_field === 'object' && course.narrow_field !== null && 'id' in course.narrow_field
      ? course.narrow_field.id
      : course.narrow_field;
    const field = narrowFields.find((f) => f.id === fieldId);
    return field?.name || `Field ${fieldId}`;
  };

  const handleAdd = () => {
    setEditingCourse(null);
    setFormData({
      name: '',
      level: '',
      total_tuition_fee: '',
      coe_fee: '',
      broad_field: '',
      narrow_field: '',
      description: '',
    });
    setNarrowFields([]);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = async (course: Course) => {
    setEditingCourse(course);
    
    // Ensure options are loaded before setting form data
    if (courseLevels.length === 0 || broadFields.length === 0) {
      await loadOptions();
    }

    // Extract IDs - handle both object and number
    let levelId = course.level;
    if (typeof course.level === 'object' && course.level !== null && 'id' in course.level) {
      levelId = course.level.id;
    }

    let broadFieldId = course.broad_field;
    if (typeof course.broad_field === 'object' && course.broad_field !== null && 'id' in course.broad_field) {
      broadFieldId = course.broad_field.id;
    }

    let narrowFieldId = course.narrow_field;
    if (typeof course.narrow_field === 'object' && course.narrow_field !== null && 'id' in course.narrow_field) {
      narrowFieldId = course.narrow_field.id;
    }

    setFormData({
      name: course.name,
      level: levelId.toString(),
      total_tuition_fee: course.total_tuition_fee,
      coe_fee: course.coe_fee,
      broad_field: broadFieldId.toString(),
      narrow_field: narrowFieldId.toString(),
      description: course.description || '',
    });

    // Load narrow fields for the selected broad field
    await loadNarrowFields(broadFieldId as number);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }
    try {
      await instituteApi.deleteCourse(id);
      loadCourses();
    } catch (err) {
      setError('Failed to delete course');
    }
  };

  const handleBroadFieldChange = async (broadFieldId: string) => {
    setFormData({ ...formData, broad_field: broadFieldId, narrow_field: '' });
    setNarrowFields([]);
    if (broadFieldId) {
      await loadNarrowFields(parseInt(broadFieldId, 10));
    }
  };

  const handleAddCourseLevel = () => {
    setNewCourseLevelName('');
    setCourseLevelDialogOpen(true);
  };

  const handleSaveCourseLevel = async () => {
    if (!newCourseLevelName.trim()) {
      return;
    }

    setSavingField(true);
    try {
      const newLevel = await instituteApi.createCourseLevel({ name: newCourseLevelName.trim() });
      // Reload course levels and select the new one
      await loadOptions();
      setFormData({ ...formData, level: newLevel.id.toString() });
      setCourseLevelDialogOpen(false);
      setNewCourseLevelName('');
    } catch (err) {
      setError('Failed to create course level');
    } finally {
      setSavingField(false);
    }
  };

  const handleAddBroadField = () => {
    setNewBroadFieldName('');
    setBroadFieldDialogOpen(true);
  };

  const handleSaveBroadField = async () => {
    if (!newBroadFieldName.trim()) {
      return;
    }

    setSavingField(true);
    try {
      const newField = await instituteApi.createBroadField({ name: newBroadFieldName.trim() });
      // Reload broad fields and select the new one
      await loadOptions();
      setFormData({ ...formData, broad_field: newField.id.toString() });
      setBroadFieldDialogOpen(false);
      setNewBroadFieldName('');
    } catch (err) {
      setError('Failed to create broad field');
    } finally {
      setSavingField(false);
    }
  };

  const handleAddNarrowField = () => {
    if (!formData.broad_field) {
      setError('Please select a Broad Field first');
      return;
    }
    setNewNarrowFieldName('');
    setNarrowFieldDialogOpen(true);
  };

  const handleSaveNarrowField = async () => {
    if (!newNarrowFieldName.trim() || !formData.broad_field) {
      return;
    }

    setSavingField(true);
    try {
      const newField = await instituteApi.createNarrowField({
        name: newNarrowFieldName.trim(),
        broad_field: parseInt(formData.broad_field, 10),
      });
      // Reload narrow fields and select the new one
      await loadNarrowFields(parseInt(formData.broad_field, 10));
      setFormData({ ...formData, narrow_field: newField.id.toString() });
      setNarrowFieldDialogOpen(false);
      setNewNarrowFieldName('');
    } catch (err) {
      setError('Failed to create narrow field');
    } finally {
      setSavingField(false);
    }
  };

  const handleSave = async () => {
    setFormErrors({});
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Name is required';
    }
    if (!formData.level) {
      errors.level = 'Course level is required';
    }
    if (!formData.total_tuition_fee || parseFloat(formData.total_tuition_fee) < 0) {
      errors.total_tuition_fee = 'Valid tuition fee is required';
    }
    if (!formData.coe_fee || parseFloat(formData.coe_fee) < 0) {
      errors.coe_fee = 'Valid COE fee is required';
    }
    if (!formData.broad_field) {
      errors.broad_field = 'Broad field is required';
    }
    if (!formData.narrow_field) {
      errors.narrow_field = 'Narrow field is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingCourse) {
        const updateData: CourseUpdateRequest = {
          name: formData.name.trim(),
          level: parseInt(formData.level, 10),
          total_tuition_fee: formData.total_tuition_fee,
          coe_fee: formData.coe_fee,
          broad_field: parseInt(formData.broad_field, 10),
          narrow_field: parseInt(formData.narrow_field, 10),
          description: formData.description?.trim() || undefined,
        };
        await instituteApi.updateCourse(editingCourse.id, updateData);
      } else {
        const createData: CourseCreateRequest = {
          institute: instituteId,
          name: formData.name.trim(),
          level: parseInt(formData.level, 10),
          total_tuition_fee: formData.total_tuition_fee,
          coe_fee: formData.coe_fee,
          broad_field: parseInt(formData.broad_field, 10),
          narrow_field: parseInt(formData.narrow_field, 10),
          description: formData.description?.trim() || undefined,
        };
        await instituteApi.createCourse(createData);
      }
      setDialogOpen(false);
      loadCourses();
    } catch (err) {
      setError('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Courses</Typography>
        <Protect permission="add_course">
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={handleAdd}>
            Add Course
          </Button>
        </Protect>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Name</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Tuition Fee</TableCell>
              <TableCell>COE Fee</TableCell>
              <TableCell>Description</TableCell>
              {hasAnyAction && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasAnyAction ? 7 : 6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No courses found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => {
                const isExpanded = expandedRows.has(course.id);
                return (
                  <>
                    <TableRow key={course.id}>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpansion(course.id)}
                          disabled={loading}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>{getLevelName(course)}</TableCell>
                      <TableCell>${course.total_tuition_fee}</TableCell>
                      <TableCell>${course.coe_fee}</TableCell>
                      <TableCell>{course.description || '-'}</TableCell>
                      {hasAnyAction && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Protect permission={'change_course'}>
                            <IconButton size="small" onClick={() => handleEdit(course)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Protect>
                          <Protect permission={'delete_course'}>
                            <IconButton size="small" onClick={() => handleDelete(course.id)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Protect>
                        </TableCell>
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={hasAnyAction ? 7 : 6} sx={{ py: 0, border: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Course Details
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Broad Field
                                </Typography>
                                <Typography variant="body2">{getBroadFieldName(course)}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Narrow Field
                                </Typography>
                                <Typography variant="body2">{getNarrowFieldName(course)}</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingCourse ? 'Edit Course' : 'Add Course'}
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Course Name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
              }}
              required
              fullWidth
              disabled={saving}
              error={!!formErrors.name}
              helperText={formErrors.name}
              autoFocus
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <FormControl fullWidth required error={!!formErrors.level} disabled={saving || loadingOptions}>
                <InputLabel>Course Level</InputLabel>
                <Select
                  value={formData.level}
                  onChange={(e) => {
                    setFormData({ ...formData, level: e.target.value });
                    if (formErrors.level) setFormErrors({ ...formErrors, level: '' });
                  }}
                  label="Course Level"
                >
                  {courseLevels.map((level) => (
                    <MenuItem key={level.id} value={level.id.toString()}>
                      {level.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.level && <FormHelperText>{formErrors.level}</FormHelperText>}
              </FormControl>
              <Protect permission="add_courselevel">
                <IconButton
                  onClick={handleAddCourseLevel}
                  disabled={saving || loadingOptions}
                  sx={{ mt: 1 }}
                  color="primary"
                  title="Add Course Level"
                >
                  <AddIcon />
                </IconButton>
              </Protect>
            </Box>

            <TextField
              label="Total Tuition Fee"
              type="number"
              value={formData.total_tuition_fee}
              onChange={(e) => {
                setFormData({ ...formData, total_tuition_fee: e.target.value });
                if (formErrors.total_tuition_fee) setFormErrors({ ...formErrors, total_tuition_fee: '' });
              }}
              required
              fullWidth
              disabled={saving}
              error={!!formErrors.total_tuition_fee}
              helperText={formErrors.total_tuition_fee}
              inputProps={{ min: 0, step: 0.01 }}
            />

            <TextField
              label="COE Fee"
              type="number"
              value={formData.coe_fee}
              onChange={(e) => {
                setFormData({ ...formData, coe_fee: e.target.value });
                if (formErrors.coe_fee) setFormErrors({ ...formErrors, coe_fee: '' });
              }}
              required
              fullWidth
              disabled={saving}
              error={!!formErrors.coe_fee}
              helperText={formErrors.coe_fee}
              inputProps={{ min: 0, step: 0.01 }}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <FormControl fullWidth required error={!!formErrors.broad_field} disabled={saving || loadingOptions}>
                <InputLabel>Broad Field</InputLabel>
                <Select
                  value={formData.broad_field}
                  onChange={(e) => handleBroadFieldChange(e.target.value)}
                  label="Broad Field"
                >
                  {broadFields.map((field) => (
                    <MenuItem key={field.id} value={field.id.toString()}>
                      {field.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.broad_field && <FormHelperText>{formErrors.broad_field}</FormHelperText>}
              </FormControl>
              <Protect permission="add_broadfield">
                <IconButton
                  onClick={handleAddBroadField}
                  disabled={saving || loadingOptions}
                  sx={{ mt: 1 }}
                  color="primary"
                  title="Add Broad Field"
                >
                  <AddIcon />
                </IconButton>
              </Protect>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <FormControl
                fullWidth
                required
                error={!!formErrors.narrow_field}
                disabled={saving || loadingOptions || !formData.broad_field}
              >
                <InputLabel>Narrow Field</InputLabel>
                <Select
                  value={formData.narrow_field}
                  onChange={(e) => {
                    setFormData({ ...formData, narrow_field: e.target.value });
                    if (formErrors.narrow_field) setFormErrors({ ...formErrors, narrow_field: '' });
                  }}
                  label="Narrow Field"
                >
                  {narrowFields.map((field) => (
                    <MenuItem key={field.id} value={field.id.toString()}>
                      {field.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.narrow_field && <FormHelperText>{formErrors.narrow_field}</FormHelperText>}
                {!formData.broad_field && (
                  <FormHelperText>Please select a Broad Field first</FormHelperText>
                )}
              </FormControl>
              <Protect permission="add_narrowfield">
                <IconButton
                  onClick={handleAddNarrowField}
                  disabled={saving || loadingOptions || !formData.broad_field}
                  sx={{ mt: 1 }}
                  color="primary"
                  title="Add Narrow Field"
                >
                  <AddIcon />
                </IconButton>
              </Protect>
            </Box>

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              disabled={saving}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || loadingOptions}
              >
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Add Course Level Dialog */}
      <Dialog open={courseLevelDialogOpen} onClose={() => setCourseLevelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add Course Level
          <IconButton onClick={() => setCourseLevelDialogOpen(false)} size="small" disabled={savingField}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Course Level Name"
              value={newCourseLevelName}
              onChange={(e) => setNewCourseLevelName(e.target.value)}
              required
              fullWidth
              disabled={savingField}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newCourseLevelName.trim() && !savingField) {
                  handleSaveCourseLevel();
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={() => setCourseLevelDialogOpen(false)} disabled={savingField}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveCourseLevel}
                disabled={savingField || !newCourseLevelName.trim()}
              >
                {savingField ? <CircularProgress size={20} /> : 'Add'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Add Broad Field Dialog */}
      <Dialog open={broadFieldDialogOpen} onClose={() => setBroadFieldDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add Broad Field
          <IconButton onClick={() => setBroadFieldDialogOpen(false)} size="small" disabled={savingField}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Broad Field Name"
              value={newBroadFieldName}
              onChange={(e) => setNewBroadFieldName(e.target.value)}
              required
              fullWidth
              disabled={savingField}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newBroadFieldName.trim() && !savingField) {
                  handleSaveBroadField();
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={() => setBroadFieldDialogOpen(false)} disabled={savingField}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveBroadField}
                disabled={savingField || !newBroadFieldName.trim()}
              >
                {savingField ? <CircularProgress size={20} /> : 'Add'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Add Narrow Field Dialog */}
      <Dialog open={narrowFieldDialogOpen} onClose={() => setNarrowFieldDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add Narrow Field
          <IconButton onClick={() => setNarrowFieldDialogOpen(false)} size="small" disabled={savingField}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Narrow Field Name"
              value={newNarrowFieldName}
              onChange={(e) => setNewNarrowFieldName(e.target.value)}
              required
              fullWidth
              disabled={savingField}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newNarrowFieldName.trim() && !savingField) {
                  handleSaveNarrowField();
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={() => setNarrowFieldDialogOpen(false)} disabled={savingField}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveNarrowField}
                disabled={savingField || !newNarrowFieldName.trim()}
              >
                {savingField ? <CircularProgress size={20} /> : 'Add'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
