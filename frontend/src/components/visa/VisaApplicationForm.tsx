/**
 * VisaApplicationForm
 * Form component for creating and editing visa applications
 */
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Typography,
  FormControlLabel,
  Switch,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Autocomplete,
  Grid,
} from '@mui/material';
import { ArrowForward, ArrowBack, Close } from '@mui/icons-material';
import { VisaApplication } from '@/services/api/visaApplicationApi';
import { getVisaTypes, getVisaType } from '@/services/api/visaTypeApi';
import { User } from '@/services/api/userApi';
import { clientApi } from '@/services/api/clientApi';
import { Client } from '@/types/client';
import { VISA_STATUS_LABELS, VisaType } from '@/types/visaType';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import httpClient from '@/services/api/httpClient';

interface VisaApplicationFormProps {
  mode: 'add' | 'edit';
  initialData?: VisaApplication;
  onSave: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
  /** If true, client field is pre-selected and cannot be changed */
  clientLocked?: boolean;
}

export const VisaApplicationForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  loading,
  clientLocked = false,
}: VisaApplicationFormProps) => {
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  
  // Client search state
  const [clientOptions, setClientOptions] = useState<Client[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // User selection state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Document selection state
  const [availableDocuments, setAvailableDocuments] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(
    initialData?.required_documents?.map((doc) => (typeof doc === 'string' ? doc : doc.name)) || []
  );
  const [customDocument, setCustomDocument] = useState('');

  // Load initial client and user if in edit mode or client is locked
  useEffect(() => {
    const loadInitialData = async () => {
      if (initialData) {
        try {
          // Load client if we have a client ID (edit mode or locked client)
          if (initialData.client) {
            const client = await clientApi.getById(initialData.client);
            setSelectedClient(client);
          }

          // Load assigned user (only in edit mode)
          if (mode === 'edit' && initialData.assigned_to) {
            const response = await httpClient.get<User>(`/v1/users/${initialData.assigned_to}/`);
            setSelectedUser(response.data); }}catch (err) {
          console.error('Failed to load initial data:', err); }}};

    loadInitialData();
  }, [initialData, mode]);

  const [formData, setFormData] = useState({
    client_id: initialData?.client || '',
    visa_type_id: initialData?.visa_type || '',
    immigration_fee: initialData?.immigration_fee || '',
    immigration_fee_currency: initialData?.immigration_fee_currency || 'USD',
    service_fee: initialData?.service_fee || '',
    service_fee_currency: initialData?.service_fee_currency || 'USD',
    transaction_reference_no: initialData?.transaction_reference_no || '',
    dependent: initialData?.dependent || false,
    notes: initialData?.notes || '',
    assigned_to_id: initialData?.assigned_to || '',
    status: initialData?.status || 'TO_BE_APPLIED',
    date_applied: initialData?.date_applied || '',
    date_opened: initialData?.date_opened || '',
    date_granted: initialData?.date_granted || '',
    date_rejected: initialData?.date_rejected || '',
    date_withdrawn: initialData?.date_withdrawn || '',
    expiry_date: initialData?.expiry_date || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Search clients with debouncing
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearchTerm.length < 2) {
        setClientOptions([]);
        return;
      }

      try {
        setClientLoading(true);
        const response = await clientApi.list({
          search: clientSearchTerm,
          page_size: 20,
        });
        setClientOptions(response.results);
      } catch (err) {
        console.error('Failed to search clients:', err);
        setClientOptions([]);
      } finally {
        setClientLoading(false); }};

    const debounceTimer = setTimeout(searchClients, 300);
    return () => clearTimeout(debounceTimer);
  }, [clientSearchTerm]);

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setDropdownLoading(true);
        const typesResponse = await getVisaTypes({ page_size: 1000 });
        setVisaTypes(typesResponse.results);
      } catch (err: any) {
        console.error('Failed to fetch dropdown data:', err);
      } finally {
        setDropdownLoading(false); }};

    fetchDropdownData();
  }, []);

  // Fetch visa type checklist when visa type changes
  useEffect(() => {
    const fetchVisaTypeChecklist = async () => {
      if (formData.visa_type_id) {
        try {
          const visaTypeData = await getVisaType(Number(formData.visa_type_id));
          const checklist = visaTypeData.checklist || [];
          
          // Set available documents (those not already selected)
          setAvailableDocuments(
            checklist.filter(doc => !selectedDocuments.includes(doc))
          );
        } catch (err) {
          console.error('Failed to fetch visa type checklist:', err); }}else {
        setAvailableDocuments([]); }};

    fetchVisaTypeChecklist();
  }, [formData.visa_type_id]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }); }};

  // Document selection handlers
  const handleMoveToSelected = (document: string) => {
    setAvailableDocuments(prev => prev.filter(doc => doc !== document));
    setSelectedDocuments(prev => [...prev, document]);
  };

  const handleMoveToAvailable = (document: string) => {
    setSelectedDocuments(prev => prev.filter(doc => doc !== document));
    setAvailableDocuments(prev => [...prev, document]);
  };

  const handleAddCustomDocument = () => {
    if (customDocument.trim() && !selectedDocuments.includes(customDocument.trim())) {
      setSelectedDocuments(prev => [...prev, customDocument.trim()]);
      setCustomDocument(''); }};


  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_id) {
      newErrors.client_id = 'Client is required';
    }
    if (!formData.visa_type_id) {
      newErrors.visa_type_id = 'Visa type is required';
    }
    if (!formData.immigration_fee) {
      newErrors.immigration_fee = 'Immigration fee is required';
    } else if (parseFloat(formData.immigration_fee) < 0) {
      newErrors.immigration_fee = 'Immigration fee must be positive';
    }
    if (!formData.service_fee) {
      newErrors.service_fee = 'Service fee is required';
    } else if (parseFloat(formData.service_fee) < 0) {
      newErrors.service_fee = 'Service fee must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const submitData: any = {
      client_id: formData.client_id,
      visa_type_id: formData.visa_type_id,
      immigration_fee: formData.immigration_fee,
      immigration_fee_currency: formData.immigration_fee_currency,
      service_fee: formData.service_fee,
      service_fee_currency: formData.service_fee_currency,
      transaction_reference_no: formData.transaction_reference_no || undefined,
      dependent: formData.dependent,
      notes: formData.notes || undefined,
      assigned_to_id: formData.assigned_to_id || undefined,
      required_documents: selectedDocuments,
      status: formData.status,
      date_applied: formData.date_applied || undefined,
      date_opened: formData.date_opened || undefined,
      date_granted: formData.date_granted || undefined,
      date_rejected: formData.date_rejected || undefined,
      date_withdrawn: formData.date_withdrawn || undefined,
      expiry_date: formData.expiry_date || undefined,
    };

    onSave(submitData);
  };

  if (dropdownLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 2 }}>
      <Grid container spacing={2}>
        {/* Client Selection - Searchable Autocomplete */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            value={selectedClient}
            onChange={(_, newValue) => {
              setSelectedClient(newValue);
              handleChange('client_id', newValue?.id || ''); }}inputValue={clientSearchTerm}
            onInputChange={(_, newInputValue) => {
              setClientSearchTerm(newInputValue); }}options={clientOptions}
            getOptionLabel={(option) =>
              `${option.first_name} ${option.last_name}${option.email ? ` (${option.email})` : ''}`
            }
            loading={clientLoading}
            disabled={loading || mode === 'edit' || clientLocked}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText={
              clientSearchTerm.length < 2
                ? "Type at least 2 characters to search..."
                : "No clients found"
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Client *"
                placeholder={clientLocked ? "" : "Search by name or email..."}
                size="small"
                error={!!errors.client_id}
                helperText={
                  clientLocked
                    ? 'Client is pre-selected for this application'
                    : errors.client_id || 'Type to search for clients'
                }
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {clientLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ), }}/>
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography variant="body2">
                    {option.first_name} {option.last_name}
                  </Typography>
                  {option.email && (
                    <Typography variant="caption" color="text.secondary">
                      {option.email}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
          />
        </Grid>

        {/* Visa Type */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Visa Type *"
            value={formData.visa_type_id}
            onChange={(e) => handleChange('visa_type_id', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            error={!!errors.visa_type_id}
            helperText={errors.visa_type_id}
          >
            <MenuItem value="">Select Visa Type</MenuItem>
            {visaTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name} {type.code ? `(${type.code})` : ''}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Status */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
          >
            {Object.entries(VISA_STATUS_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Assigned To - Searchable */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <UserAutocomplete
            value={selectedUser}
            onChange={(user) => {
              setSelectedUser(user);
              handleChange('assigned_to_id', user?.id || '');
            }}
            label="Assigned To"
            placeholder="Search user by name, email..."
            disabled={loading}
            size="small"
          />
        </Grid>

        {/* Immigration Fee */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="number"
            label="Immigration Fee *"
            value={formData.immigration_fee}
            onChange={(e) => handleChange('immigration_fee', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            error={!!errors.immigration_fee}
            helperText={errors.immigration_fee}
            inputProps={{ min: 0, step: 0.01 }}/>
        </Grid>

        {/* Immigration Fee Currency */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Immigration Fee Currency"
            value={formData.immigration_fee_currency}
            onChange={(e) => handleChange('immigration_fee_currency', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
          >
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="EUR">EUR</MenuItem>
            <MenuItem value="GBP">GBP</MenuItem>
            <MenuItem value="CAD">CAD</MenuItem>
            <MenuItem value="AUD">AUD</MenuItem>
            <MenuItem value="INR">INR</MenuItem>
          </TextField>
        </Grid>

        {/* Service Fee */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="number"
            label="Service Fee *"
            value={formData.service_fee}
            onChange={(e) => handleChange('service_fee', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            error={!!errors.service_fee}
            helperText={errors.service_fee}
            inputProps={{ min: 0, step: 0.01 }}/>
        </Grid>

        {/* Service Fee Currency */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Service Fee Currency"
            value={formData.service_fee_currency}
            onChange={(e) => handleChange('service_fee_currency', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
          >
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="EUR">EUR</MenuItem>
            <MenuItem value="GBP">GBP</MenuItem>
            <MenuItem value="CAD">CAD</MenuItem>
            <MenuItem value="AUD">AUD</MenuItem>
            <MenuItem value="INR">INR</MenuItem>
          </TextField>
        </Grid>

        {/* Transaction Reference No */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Transaction Reference No"
            value={formData.transaction_reference_no}
            onChange={(e) => handleChange('transaction_reference_no', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            placeholder="Enter reference number"
          />
        </Grid>

        {/* Dependent Switch */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.dependent}
                onChange={(e) => handleChange('dependent', e.target.checked)}
                disabled={loading}
              />
            }
            label="Dependent Application"
          />
        </Grid>

        {/* Date Applied */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="date"
            label="Date Applied"
            value={formData.date_applied}
            onChange={(e) => handleChange('date_applied', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>

        {/* Date Opened */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="date"
            label="Date Opened"
            value={formData.date_opened}
            onChange={(e) => handleChange('date_opened', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>

        {/* Date Granted */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="date"
            label="Date Granted"
            value={formData.date_granted}
            onChange={(e) => handleChange('date_granted', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>

        {/* Expiry Date */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="date"
            label="Expiry Date"
            value={formData.expiry_date}
            onChange={(e) => handleChange('expiry_date', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>

        {/* Notes */}
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            multiline
            rows={3}
            placeholder="Enter any additional notes"
          />
        </Grid>

        {/* Document Selection */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
            Required Documents
          </Typography>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 2 }}>
            {formData.visa_type_id 
              ? 'Select documents from the visa type checklist or add custom documents'
              : 'Please select a visa type first to see available documents'}
          </Typography>

          {formData.visa_type_id && (
            <Grid container spacing={2}>
              {/* Available Documents */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Paper variant="outlined" sx={{ p: 2, minHeight: 200, maxHeight: 300 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Available Documents ({availableDocuments.length})
                  </Typography>
                  <Divider sx={{ my: 1 }}/>
                  <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {availableDocuments.length === 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block', textAlign: 'center' }}>
                        All documents selected
                      </Typography>
                    ) : (
                      availableDocuments.map((doc, index) => (
                        <ListItem
                          key={index}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleMoveToSelected(doc)}
                              disabled={loading}
                              color="primary"
                            >
                              <ArrowForward fontSize="small" />
                            </IconButton>
                          }
                          sx={{ 
                            py: 0.5,
                            '&:hover': { backgroundColor: 'action.hover' }}}
                        >
                          <ListItemText
                            primary={doc}
                            primaryTypographyProps={{ variant: 'body2' }}/>
                        </ListItem>
                      ))
                    )}
                  </List>
                </Paper>
              </Grid>

              {/* Center Arrow */}
              <Grid sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} size={{ xs: 12, md: 2 }}>
                <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Move
                  </Typography>
                  <Box>
                    <ArrowForward sx={{ display: 'block', my: 0.5 }}/>
                    <ArrowBack sx={{ display: 'block', my: 0.5 }}/>
                  </Box>
                </Box>
              </Grid>

              {/* Selected Documents */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Paper variant="outlined" sx={{ p: 2, minHeight: 200, maxHeight: 300 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Selected Documents ({selectedDocuments.length})
                  </Typography>
                  <Divider sx={{ my: 1 }}/>
                  <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {selectedDocuments.length === 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block', textAlign: 'center' }}>
                        No documents selected
                      </Typography>
                    ) : (
                      selectedDocuments.map((doc, index) => (
                        <ListItem
                          key={index}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleMoveToAvailable(doc)}
                              disabled={loading}
                              color="error"
                            >
                              <Close fontSize="small" />
                            </IconButton>
                          }
                          sx={{
                            py: 0.5,
                            '&:hover': { backgroundColor: 'action.hover' }}}
                        >
                          <ListItemText
                            primary={doc}
                            primaryTypographyProps={{ variant: 'body2' }}/>
                        </ListItem>
                      ))
                    )}
                  </List>
                </Paper>
              </Grid>

              {/* Add Custom Document */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField
                    value={customDocument}
                    onChange={(e) => setCustomDocument(e.target.value)}
                    placeholder="Add custom document..."
                    size="small"
                    fullWidth
                    disabled={loading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomDocument(); }}}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddCustomDocument}
                    disabled={loading || !customDocument.trim()}
                    sx={{ minWidth: 100 }}>
                    Add
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : mode === 'add' ? 'Create' : 'Update'}
        </Button>
      </Box>
    </Box>
  );
};

export default VisaApplicationForm;
