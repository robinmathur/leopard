/**
 * CollegeApplicationForm
 * Form component for creating and editing college applications
 * Features cascading dropdowns: Institute → Course/Location/Intake filtering
 */
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Grid,
  Button,
  CircularProgress,
  Typography,
  Autocomplete,
} from '@mui/material';
import { CollegeApplication } from '@/types/collegeApplication';
import {
  listApplicationTypes,
  listStages,
  ApplicationType,
  Stage,
} from '@/services/api/collegeApplicationApi';
import { instituteApi } from '@/services/api/instituteApi';
import { Institute, Course, InstituteLocation, InstituteIntake } from '@/types/institute';
import { agentApi } from '@/services/api/agentApi';
import { Agent } from '@/types/agent';
import { clientApi } from '@/services/api/clientApi';
import { Client } from '@/types/client';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import { User } from '@/services/api/userApi';

interface CollegeApplicationFormProps {
  mode: 'add' | 'edit';
  initialData?: CollegeApplication;
  onSave: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
  /** If true, client field is pre-selected and cannot be changed */
  clientLocked?: boolean;
}

export const CollegeApplicationForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  loading,
  clientLocked = false,
}: CollegeApplicationFormProps) => {
  // Dropdown data
  const [applicationTypes, setApplicationTypes] = useState<ApplicationType[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [locations, setLocations] = useState<InstituteLocation[]>([]);
  const [intakes, setIntakes] = useState<InstituteIntake[]>([]);
  const [superAgents, setSuperAgents] = useState<Agent[]>([]);
  const [subAgents, setSubAgents] = useState<Agent[]>([]);

  const [dropdownLoading, setDropdownLoading] = useState(false);

  // Client search state
  const [clientOptions, setClientOptions] = useState<Client[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // User selection state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    client: initialData?.client || '',
    application_type: initialData?.application_type || '',
    stage: initialData?.stage || '',
    institute: initialData?.institute || '',
    course: initialData?.course || '',
    start_date: initialData?.start_date || '',
    location: initialData?.location || '',
    finish_date: initialData?.finish_date || '',
    total_tuition_fee: initialData?.total_tuition_fee || '',
    student_id: initialData?.student_id || '',
    super_agent: initialData?.super_agent || '',
    sub_agent: initialData?.sub_agent || '',
    assigned_to: initialData?.assigned_to || '',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial client and user if in edit mode or client is locked
  useEffect(() => {
    const loadInitialData = async () => {
      if (initialData) {
        try {
          // Load client if we have a client ID
          if (initialData.client) {
            const client = await clientApi.getById(initialData.client);
            setSelectedClient(client);
          }

          // Load assigned user (only in edit mode)
          if (mode === 'edit' && initialData.assigned_to) {
            const userResponse = await clientApi.getById(initialData.assigned_to);
            setSelectedUser(userResponse as any); // Type mismatch workaround
          }
        } catch (err) {
          console.error('Failed to load initial data:', err);
        }
      }
    };

    loadInitialData();
  }, [initialData, mode]);

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
        setClientLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchClients, 300);
    return () => clearTimeout(debounceTimer);
  }, [clientSearchTerm]);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setDropdownLoading(true);

        // Load application types
        const appTypesResponse = await listApplicationTypes({ page_size: 1000 });
        setApplicationTypes(appTypesResponse.results);

        // Load institutes
        const institutesResponse = await instituteApi.list({ page_size: 1000 });
        setInstitutes(institutesResponse.results);

        // Load agents (SUPER_AGENT type)
        const superAgentsResponse = await agentApi.list({
          agent_type: 'SUPER_AGENT',
          page_size: 1000
        });
        setSuperAgents(superAgentsResponse.results);

        // Load agents (SUB_AGENT type)
        const subAgentsResponse = await agentApi.list({
          agent_type: 'SUB_AGENT',
          page_size: 1000
        });
        setSubAgents(subAgentsResponse.results);

      } catch (err: any) {
        console.error('Failed to fetch dropdown data:', err);
      } finally {
        setDropdownLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Fetch stages when application type changes
  useEffect(() => {
    const fetchStages = async () => {
      if (formData.application_type) {
        try {
          const stagesList = await listStages({
            application_type_id: Number(formData.application_type)
          });
          setStages(stagesList);

          // Auto-select first stage if not in edit mode
          if (mode === 'add' && stagesList.length > 0 && !formData.stage) {
            handleChange('stage', stagesList[0].id);
          }
        } catch (err) {
          console.error('Failed to fetch stages:', err);
        }
      } else {
        setStages([]);
      }
    };

    fetchStages();
  }, [formData.application_type]);

  // Fetch cascading dropdowns when institute changes
  useEffect(() => {
    const fetchInstituteRelatedData = async () => {
      if (formData.institute) {
        try {
          const instituteId = Number(formData.institute);

          // Fetch courses for this institute
          const coursesData = await instituteApi.listCourses(instituteId);
          setCourses(coursesData);

          // Fetch locations for this institute
          const locationsData = await instituteApi.listLocations(instituteId);
          setLocations(locationsData);

          // Fetch intakes for this institute
          const intakesData = await instituteApi.listIntakes(instituteId);
          setIntakes(intakesData);

          // Reset dependent fields if institute changed
          if (mode === 'add' ||
              (initialData && initialData.institute !== formData.institute)) {
            handleChange('course', '');
            handleChange('location', '');
            handleChange('start_date', '');
          }
        } catch (err) {
          console.error('Failed to fetch institute-related data:', err);
        }
      } else {
        // Clear cascading dropdowns
        setCourses([]);
        setLocations([]);
        setIntakes([]);
        handleChange('course', '');
        handleChange('location', '');
        handleChange('start_date', '');
      }
    };

    fetchInstituteRelatedData();
  }, [formData.institute]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.client) {
      newErrors.client = 'Client is required';
    }
    if (!formData.application_type) {
      newErrors.application_type = 'Application type is required';
    }
    if (!formData.stage) {
      newErrors.stage = 'Stage is required';
    }
    if (!formData.institute) {
      newErrors.institute = 'Institute is required';
    }
    if (!formData.course) {
      newErrors.course = 'Course is required';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Intake date is required';
    }
    if (!formData.location) {
      newErrors.location = 'Location is required';
    }
    if (!formData.total_tuition_fee) {
      newErrors.total_tuition_fee = 'Tuition fee is required';
    } else if (parseFloat(formData.total_tuition_fee) < 0) {
      newErrors.total_tuition_fee = 'Tuition fee must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const submitData: any = {
      client: formData.client,
      application_type: formData.application_type,
      stage: formData.stage,
      institute: formData.institute,
      course: formData.course,
      start_date: formData.start_date,
      location: formData.location,
      total_tuition_fee: formData.total_tuition_fee,
      finish_date: formData.finish_date || undefined,
      student_id: formData.student_id || undefined,
      super_agent: formData.super_agent || undefined,
      sub_agent: formData.sub_agent || undefined,
      assigned_to: formData.assigned_to || undefined,
      notes: formData.notes || undefined,
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
        <Grid item xs={12} sm={6}>
          <Autocomplete
            value={selectedClient}
            onChange={(_, newValue) => {
              setSelectedClient(newValue);
              handleChange('client', newValue?.id || '');
            }}
            inputValue={clientSearchTerm}
            onInputChange={(_, newInputValue) => {
              setClientSearchTerm(newInputValue);
            }}
            options={clientOptions}
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
                error={!!errors.client}
                helperText={
                  clientLocked
                    ? 'Client is pre-selected for this application'
                    : errors.client || 'Type to search for clients'
                }
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {clientLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
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

        {/* Application Type */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Application Type *"
            value={formData.application_type}
            onChange={(e) => handleChange('application_type', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            error={!!errors.application_type}
            helperText={errors.application_type}
          >
            <MenuItem value="">Select Application Type</MenuItem>
            {applicationTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.title}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Stage */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Stage *"
            value={formData.stage}
            onChange={(e) => handleChange('stage', e.target.value)}
            fullWidth
            size="small"
            disabled={loading || !formData.application_type}
            error={!!errors.stage}
            helperText={errors.stage || (!formData.application_type && 'Select application type first')}
          >
            <MenuItem value="">Select Stage</MenuItem>
            {stages.map((stage) => (
              <MenuItem key={stage.id} value={stage.id}>
                {stage.stage_name} {stage.is_final_stage && '(Final)'}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Institute - Cascading Parent */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Institute *"
            value={formData.institute}
            onChange={(e) => handleChange('institute', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            error={!!errors.institute}
            helperText={errors.institute}
          >
            <MenuItem value="">Select Institute</MenuItem>
            {institutes.map((institute) => (
              <MenuItem key={institute.id} value={institute.id}>
                {institute.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Course - Cascades from Institute */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Course *"
            value={formData.course}
            onChange={(e) => handleChange('course', e.target.value)}
            fullWidth
            size="small"
            disabled={loading || !formData.institute}
            error={!!errors.course}
            helperText={errors.course || (!formData.institute && 'Select institute first')}
          >
            <MenuItem value="">Select Course</MenuItem>
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Location - Cascades from Institute */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Location *"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            fullWidth
            size="small"
            disabled={loading || !formData.institute}
            error={!!errors.location}
            helperText={errors.location || (!formData.institute && 'Select institute first')}
          >
            <MenuItem value="">Select Location</MenuItem>
            {locations.map((location) => (
              <MenuItem key={location.id} value={location.id}>
                {location.title}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Intake Date - Cascades from Institute */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Intake Date *"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            fullWidth
            size="small"
            disabled={loading || !formData.institute}
            error={!!errors.start_date}
            helperText={errors.start_date || (!formData.institute && 'Select institute first')}
          >
            <MenuItem value="">Select Intake Date</MenuItem>
            {intakes.map((intake) => (
              <MenuItem key={intake.id} value={intake.id}>
                {intake.intake_date ? new Date(intake.intake_date).toLocaleDateString() : intake.title}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Finish Date */}
        <Grid item xs={12} sm={6}>
          <TextField
            type="date"
            label="Finish Date"
            value={formData.finish_date}
            onChange={(e) => handleChange('finish_date', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Tuition Fee */}
        <Grid item xs={12} sm={6}>
          <TextField
            type="number"
            label="Total Tuition Fee *"
            value={formData.total_tuition_fee}
            onChange={(e) => handleChange('total_tuition_fee', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            error={!!errors.total_tuition_fee}
            helperText={errors.total_tuition_fee}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>

        {/* Student ID */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Student ID"
            value={formData.student_id}
            onChange={(e) => handleChange('student_id', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            placeholder="Enter student ID"
          />
        </Grid>

        {/* Super Agent - Filtered by SUPER_AGENT type */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Super Agent"
            value={formData.super_agent}
            onChange={(e) => handleChange('super_agent', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
          >
            <MenuItem value="">Select Super Agent</MenuItem>
            {superAgents.map((agent) => (
              <MenuItem key={agent.id} value={agent.id}>
                {agent.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Sub Agent - Filtered by SUB_AGENT type */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Sub Agent"
            value={formData.sub_agent}
            onChange={(e) => handleChange('sub_agent', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
          >
            <MenuItem value="">Select Sub Agent</MenuItem>
            {subAgents.map((agent) => (
              <MenuItem key={agent.id} value={agent.id}>
                {agent.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Assigned To - Searchable */}
        <Grid item xs={12} sm={6}>
          <UserAutocomplete
            value={selectedUser}
            onChange={(user) => {
              setSelectedUser(user);
              handleChange('assigned_to', user?.id || '');
            }}
            label="Assigned To"
            placeholder="Search user by name, email..."
            disabled={loading}
            size="small"
          />
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
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

export default CollegeApplicationForm;
