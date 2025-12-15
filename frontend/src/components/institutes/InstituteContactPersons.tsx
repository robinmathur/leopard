/**
 * InstituteContactPersons Component
 * Displays and manages contact persons for an institute
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { instituteApi } from '@/services/api/instituteApi';
import {
  InstituteContactPerson,
  InstituteContactPersonCreateRequest,
  InstituteContactPersonUpdateRequest,
  GENDER_LABELS,
  Gender,
} from '@/types/institute';
import { usePermission } from '@/auth/hooks/usePermission';
import {Protect} from "@/components/protected/Protect.tsx";

interface InstituteContactPersonsProps {
  instituteId: number;
}

export const InstituteContactPersons = ({ instituteId }: InstituteContactPersonsProps) => {
  const { hasAnyPermission } = usePermission();
  const hasAnyAction = hasAnyPermission(['change_institutecontactperson', 'delete_institutecontactperson']);

  const [contactPersons, setContactPersons] = useState<InstituteContactPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<InstituteContactPerson | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    gender: '' as Gender | '',
    position: '',
    phone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContactPersons();
  }, [instituteId]);

  const loadContactPersons = async () => {
    setLoading(true);
    try {
      const data = await instituteApi.listContactPersons(instituteId);
      setContactPersons(data);
    } catch (err) {
      setError('Failed to load contact persons');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingContact(null);
    setFormData({ name: '', gender: '', position: '', phone: '', email: '' });
    setDialogOpen(true);
  };

  const handleEdit = (contact: InstituteContactPerson) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      gender: contact.gender || '',
      position: contact.position || '',
      phone: contact.phone || '',
      email: contact.email || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this contact person?')) {
      return;
    }
    try {
      await instituteApi.deleteContactPerson(id);
      loadContactPersons();
    } catch (err) {
      setError('Failed to delete contact person');
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingContact) {
        const updateData: InstituteContactPersonUpdateRequest = {
          name: formData.name,
          gender: formData.gender || undefined,
          position: formData.position || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
        };
        await instituteApi.updateContactPerson(editingContact.id, updateData);
      } else {
        const createData: InstituteContactPersonCreateRequest = {
          institute: instituteId,
          name: formData.name,
          gender: formData.gender || undefined,
          position: formData.position || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
        };
        await instituteApi.createContactPerson(createData);
      }
      setDialogOpen(false);
      loadContactPersons();
    } catch (err) {
      setError('Failed to save contact person');
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
        <Typography variant="h6">Contact Persons</Typography>
        <Protect permission={'add_institutecontactperson'}>
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={handleAdd}>
            Add Contact Person
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
              <TableCell>Name</TableCell>
              <TableCell>Gender</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              {hasAnyAction && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {contactPersons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasAnyAction ? 6 : 5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No contact persons found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              contactPersons.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>{contact.name}</TableCell>
                  <TableCell>{contact.gender ? GENDER_LABELS[contact.gender] : '-'}</TableCell>
                  <TableCell>{contact.position || '-'}</TableCell>
                  <TableCell>{contact.phone || '-'}</TableCell>
                  <TableCell>{contact.email || '-'}</TableCell>
                  {hasAnyAction && (
                    <TableCell align="right">
                      <Protect permission={'change_institutecontactperson'}>
                        <IconButton size="small" onClick={() => handleEdit(contact)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Protect>
                      <Protect permission={'delete_institutecontactperson'}>
                        <IconButton size="small" onClick={() => handleDelete(contact.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Protect>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingContact ? 'Edit Contact Person' : 'Add Contact Person'}
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              disabled={saving}
            />
            <TextField
              label="Gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender | '' })}
              select
              fullWidth
              disabled={saving}
            >
              <MenuItem value="">None</MenuItem>
              {Object.entries(GENDER_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              fullWidth
              disabled={saving}
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
              disabled={saving}
            />
            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              type="email"
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
                disabled={saving || !formData.name}
              >
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
