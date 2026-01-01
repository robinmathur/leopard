/**
 * ApplicationTracker - Track applications by stage with dynamic tabs
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  listApplicationTypes,
  listStages,
  listCollegeApplications,
  getStageCounts,
} from '@/services/api/collegeApplicationApi';
import type {
  ApplicationType,
  Stage,
  CollegeApplication,
  StageCountsResponse,
} from '@/types/collegeApplication';

export const ApplicationTracker: React.FC = () => {
  const navigate = useNavigate();
  const [applicationTypes, setApplicationTypes] = React.useState<ApplicationType[]>([]);
  const [selectedType, setSelectedType] = React.useState<number | null>(null);
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [selectedStageIndex, setSelectedStageIndex] = React.useState(0);
  const [applications, setApplications] = React.useState<CollegeApplication[]>([]);
  const [stageCounts, setStageCounts] = React.useState<StageCountsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Load application types on mount
  React.useEffect(() => {
    const loadApplicationTypes = async () => {
      try {
        const response = await listApplicationTypes({ is_active: true });
        setApplicationTypes(response.results);
        if (response.results.length > 0) {
          setSelectedType(response.results[0].id);
        }
      } catch (error) {
        console.error('Failed to load application types:', error);
      } finally {
        setLoading(false);
      }
    };
    loadApplicationTypes();
  }, []);

  // Load stages when application type changes
  React.useEffect(() => {
    if (selectedType) {
      const loadStages = async () => {
        try {
          const stagesList = await listStages({ application_type_id: selectedType });
          setStages(stagesList);
          setSelectedStageIndex(0);

          // Load stage counts
          const counts = await getStageCounts({ application_type_id: selectedType });
          setStageCounts(counts);
        } catch (error) {
          console.error('Failed to load stages:', error);
        }
      };
      loadStages();
    }
  }, [selectedType]);

  // Load applications when stage changes
  React.useEffect(() => {
    if (selectedType && stages.length > 0) {
      const selectedStage = stages[selectedStageIndex];
      if (selectedStage) {
        const loadApplications = async () => {
          try {
            const response = await listCollegeApplications({
              application_type_id: selectedType,
              stage_id: selectedStage.id,
              page: page + 1,
              page_size: rowsPerPage,
            });
            setApplications(response.results);
          } catch (error) {
            console.error('Failed to load applications:', error);
          }
        };
        loadApplications();
      }
    }
  }, [selectedType, selectedStageIndex, stages, page, rowsPerPage]);

  const handleViewApplication = (applicationId: number, clientId: number) => {
    // Navigate to client detail page with application tab selected
    navigate(`/clients/${clientId}?tab=applications&collegeApplicationId=${applicationId}`);
  };

  const getStageCount = (stageId: number): number => {
    if (!stageCounts) return 0;
    const stageData = stageCounts.by_stage.find((s) => s.stage_id === stageId);
    return stageData?.count || 0;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (applicationTypes.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No active application types found. Create an application type to start tracking applications.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Application Tracker
      </Typography>

      {/* Application Type Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Application Type</InputLabel>
          <Select
            value={selectedType || ''}
            onChange={(e) => setSelectedType(e.target.value as number)}
            label="Application Type"
          >
            {applicationTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.title} ({type.stages_count} stages)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {selectedType && stages.length > 0 ? (
        <>
          {/* Stage Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={selectedStageIndex}
              onChange={(_, newValue) => {
                setSelectedStageIndex(newValue);
                setPage(0);
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              {stages.map((stage, index) => (
                <Tab
                  key={stage.id}
                  label={
                    <Badge badgeContent={getStageCount(stage.id)} color="primary">
                      <Box sx={{ px: 1 }}>
                        {stage.stage_name}
                        {stage.is_final_stage && (
                          <Chip label="Final" size="small" color="success" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </Badge>
                  }
                />
              ))}
            </Tabs>
          </Paper>

          {/* Applications Table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Institute</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Intake Date</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Tuition Fee</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">
                          No applications in this stage
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((app) => (
                      <TableRow key={app.id} hover>
                        <TableCell>{app.client_name}</TableCell>
                        <TableCell>{app.institute_name}</TableCell>
                        <TableCell>{app.course_name}</TableCell>
                        <TableCell>
                          {new Date(app.intake_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{app.location_display}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(parseFloat(app.total_tuition_fee))}
                        </TableCell>
                        <TableCell>
                          {app.assigned_to_name || (
                            <Chip label="Unassigned" size="small" color="warning" />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleViewApplication(app.id, app.client)}
                            title="View Application"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={getStageCount(stages[selectedStageIndex]?.id)}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        </>
      ) : selectedType ? (
        <Alert severity="warning">
          No stages defined for this application type. Add stages to start tracking.
        </Alert>
      ) : null}
    </Box>
  );
};
