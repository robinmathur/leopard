/**
 * ClientSummaryPanel Component
 * Compact left panel showing key information and quick actions
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Button,
  IconButton,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Client, STAGE_LABELS, NEXT_STAGE, ClientStage } from '@/types/client';
import { MoveStageDialog } from './MoveStageDialog';
import { AssignClientDialog } from './AssignClientDialog';
import { clientApi } from '@/services/api/clientApi';
import { getVisaCategories } from '@/services/api/visaTypeApi';
import { VisaCategory } from '@/types/visaType';
import { listReminders, Reminder, CLIENT_CONTENT_TYPE_ID } from '@/services/api/reminderApi';

export interface ClientSummaryPanelProps {
  client: Client;
  onClientUpdate?: () => void;
}

/**
 * Format date for display
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Format date and time for display
 */
const formatDateTime = (dateString?: string, timeString?: string): string => {
  if (!dateString) return '-';

  const dateStr = formatDate(dateString);

  if (!timeString) return dateStr;

  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${dateStr} ${displayHour}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
};

/**
 * Check if reminder is upcoming
 */
const isUpcoming = (dateString?: string, timeString?: string): boolean => {
  if (!dateString) return false;

  try {
    const now = new Date();
    const reminderDate = new Date(dateString);

    if (timeString) {
      const [hours, minutes] = timeString.split(':');
      reminderDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    } else {
      reminderDate.setHours(23, 59, 59, 999);
    }

    return reminderDate > now;
  } catch {
    return false;
  }
};

/**
 * DetailRow component for compact display
 */
const DetailRow = ({ label, value, action }: { label: string; value: React.ReactNode; action?: React.ReactNode }) => (
  <Box sx={{ mb: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {action}
    </Box>
    <Typography variant="body2" sx={{ fontWeight: 500 }}>
      {value || '-'}
    </Typography>
  </Box>
);

export const ClientSummaryPanel = ({ client, onClientUpdate }: ClientSummaryPanelProps) => {
  // Dialog states
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [visaCategoryDialogOpen, setVisaCategoryDialogOpen] = useState(false);

  // Loading states
  const [stageLoading, setStageLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [visaCategoryLoading, setVisaCategoryLoading] = useState(false);

  // Data states
  const [visaCategories, setVisaCategories] = useState<VisaCategory[]>([]);
  const [visaCategoriesLoaded, setVisaCategoriesLoaded] = useState(false);
  const [selectedVisaCategory, setSelectedVisaCategory] = useState<number | null>(client.visa_category || null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);

  // Fetch upcoming reminders
  useEffect(() => {
    const fetchReminders = async () => {
      setRemindersLoading(true);
      try {
        const data = await listReminders({
          content_type: CLIENT_CONTENT_TYPE_ID,
          object_id: client.id,
        });

        // Filter to non-completed reminders (both due and upcoming) and sort by date
        const activeReminders = data.results
          .filter((r) => !r.is_completed)
          .sort((a, b) => {
            const dateA = new Date(a.reminder_date + 'T' + (a.reminder_time || '00:00'));
            const dateB = new Date(b.reminder_date + 'T' + (b.reminder_time || '00:00'));
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5); // Show up to 5 reminders

        setReminders(activeReminders);
      } catch (err) {
        console.error('Failed to load reminders:', err);
      } finally {
        setRemindersLoading(false);
      }
    };
    fetchReminders();
  }, [client.id]);

  // Handle stage change
  const handleStageChange = async (targetStage: ClientStage) => {
    setStageLoading(true);
    try {
      await clientApi.update(client.id, { stage: targetStage });
      setStageDialogOpen(false);
      if (onClientUpdate) {
        onClientUpdate();
      }
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setStageLoading(false);
    }
  };

  // Handle assign
  const handleAssign = async (userId: number | null) => {
    setAssignLoading(true);
    try {
      await clientApi.update(client.id, { assigned_to_id: userId });
      setAssignDialogOpen(false);
      if (onClientUpdate) {
        onClientUpdate();
      }
    } catch (err) {
      console.error('Failed to assign client:', err);
    } finally {
      setAssignLoading(false);
    }
  };

  // Load visa categories when dialog opens
  const handleVisaCategoryDialogOpen = async () => {
    setVisaCategoryDialogOpen(true);

    if (!visaCategoriesLoaded) {
      try {
        const data = await getVisaCategories();
        setVisaCategories(data);
        setVisaCategoriesLoaded(true);
      } catch (err) {
        console.error('Failed to load visa categories:', err);
      }
    }
  };

  // Handle visa category change
  const handleVisaCategoryChange = async () => {
    setVisaCategoryLoading(true);
    try {
      await clientApi.update(client.id, { visa_category_id: selectedVisaCategory || undefined });
      setVisaCategoryDialogOpen(false);
      if (onClientUpdate) {
        onClientUpdate();
      }
    } catch (err) {
      console.error('Failed to update visa category:', err);
    } finally {
      setVisaCategoryLoading(false);
    }
  };

  const nextStage = NEXT_STAGE[client.stage];
  const canMoveStage = nextStage || client.stage === 'CLOSE';

  return (
    <>
      <Paper sx={{ p: 2.5, position: 'sticky', top: 20 }}>
        {/* Stage Action */}
        {canMoveStage && (
          <>
            <DetailRow
              label="Move Stage"
              value={`To ${nextStage ? STAGE_LABELS[nextStage] : 'New Stage'}`}
              action={
                <IconButton
                  size="small"
                  onClick={() => setStageDialogOpen(true)}
                  title={`Move to ${nextStage ? STAGE_LABELS[nextStage] : 'new stage'}`}
                  color="primary"
                >
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              }
            />
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Assigned To Section */}
        <DetailRow
          label="Assigned To"
          value={client.assigned_to_name || 'Unassigned'}
          action={
            <IconButton
              size="small"
              onClick={() => setAssignDialogOpen(true)}
              title="Reassign"
              color="primary"
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
          }
        />

        {/* Visa Category Section */}
        <DetailRow
          label="Preferred Visa Category"
          value={client.visa_category_name || 'Not set'}
          action={
            <IconButton
              size="small"
              onClick={handleVisaCategoryDialogOpen}
              title="Change visa category"
              color="primary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          }
        />

        <Divider sx={{ my: 2 }} />

        {/* Basic Information */}
        <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 1.5 }}>
          Basic Information
        </Typography>

        <DetailRow label="Client ID" value={`#${client.id}`} />
        <DetailRow label="Created Date" value={formatDate(client.created_at)} />
        <DetailRow label="Created By" value={client.created_by_name} />
        <DetailRow label="Branch" value={client.branch_name} />
        <DetailRow label="Agent" value={client.agent_name} />
        <DetailRow label="Referred By" value={client.referred_by} />

        <Divider sx={{ my: 2 }} />

        {/* Due & Upcoming Reminders */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 1 }}>
            Due & Upcoming Reminders
          </Typography>

          {remindersLoading ? (
            <Box>
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
            </Box>
          ) : reminders.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No reminders
            </Typography>
          ) : (
            <List dense disablePadding>
              {reminders.map((reminder) => {
                const isDue = !isUpcoming(reminder.reminder_date, reminder.reminder_time);
                return (
                  <ListItem
                    key={reminder.id}
                    disablePadding
                    sx={{
                      mb: 1,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      borderLeft: isDue ? 3 : 0,
                      borderColor: isDue ? 'warning.main' : 'transparent',
                    }}
                  >
                    <AccessTimeIcon
                      sx={{
                        fontSize: 16,
                        mr: 1,
                        color: isDue ? 'warning.main' : 'primary.main',
                      }}
                    />
                    <ListItemText
                      primary={
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {reminder.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(reminder.reminder_date, reminder.reminder_time)}
                        </Typography>
                      }
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </Paper>

      {/* Move Stage Dialog */}
      <MoveStageDialog
        open={stageDialogOpen}
        client={client}
        onConfirm={handleStageChange}
        onCancel={() => setStageDialogOpen(false)}
        loading={stageLoading}
      />

      {/* Assign Client Dialog */}
      <AssignClientDialog
        open={assignDialogOpen}
        client={client}
        onConfirm={handleAssign}
        onCancel={() => setAssignDialogOpen(false)}
        loading={assignLoading}
      />

      {/* Visa Category Dialog */}
      <Dialog
        open={visaCategoryDialogOpen}
        onClose={visaCategoryLoading ? undefined : () => setVisaCategoryDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Change Visa Category</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a preferred visa category for this client:
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Visa Category</InputLabel>
            <Select
              value={selectedVisaCategory || ''}
              onChange={(e) => setSelectedVisaCategory(e.target.value as number)}
              label="Visa Category"
              disabled={visaCategoryLoading}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {visaCategories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVisaCategoryDialogOpen(false)} disabled={visaCategoryLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleVisaCategoryChange}
            variant="contained"
            disabled={visaCategoryLoading}
            startIcon={visaCategoryLoading ? <CircularProgress size={16} /> : undefined}
          >
            {visaCategoryLoading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ClientSummaryPanel;
