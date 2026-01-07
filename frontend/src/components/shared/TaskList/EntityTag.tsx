/**
 * EntityTag Component
 * Displays linked entity (Client/Visa Application) as a clickable chip/tag
 */
import { useState, useEffect } from 'react';
import { Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Task } from '@/services/api/taskApi';
import { getVisaApplication } from '@/services/api/visaApplicationApi';

interface EntityTagProps {
  task: Task;
}

export const EntityTag = ({ task }: EntityTagProps) => {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Don't show if no linked entity
  if (!task.linked_entity_type || !task.linked_entity_id) {
    return null;
  }

  // Normalize entity type (handle variations like 'visaapplication', etc.)
  const normalizedEntityType = task.linked_entity_type?.toLowerCase() || '';
  const isClient = normalizedEntityType === 'client';
  const isVisaApp = normalizedEntityType === 'visaapplication';

  // Only fetch client ID for visa applications (needed for navigation)
  useEffect(() => {
    if (isVisaApp && task.linked_entity_id) {
      setLoading(true);
      getVisaApplication(task.linked_entity_id)
        .then((app) => {
          if (app.client) {
            setClientId(app.client);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch visa application:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [task.linked_entity_type, task.linked_entity_id, isVisaApp]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent task click
    if (isClient && task.linked_entity_id) {
      navigate(`/clients/${task.linked_entity_id}`);
    } else if (isVisaApp && task.linked_entity_id) {
      // Navigate to visa application detail page
      navigate(`/visa-applications/${task.linked_entity_id}`, {
        state: { from: clientId ? `/clients/${clientId}` : '/tasks' }
      });
    }
  };

  const getLabel = () => {
    // Use linked_entity_name from task data (no fetch needed)
    if (task.linked_entity_name) {
      return task.linked_entity_name;
    }

    // Fallback to ID-based labels
    if (isClient) {
      return `Client #${task.linked_entity_id}`;
    } else if (isVisaApp) {
      return `Visa App #${task.linked_entity_id}`;
    }

    // Fallback for unknown entity types
    return `${task.linked_entity_type} #${task.linked_entity_id}`;
  };

  return (
    <Chip
      label={getLabel()}
      onClick={handleClick}
      size="small"
      color="primary"
      variant="outlined"
      sx={{
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
        },
      }}
    />
  );
};

export default EntityTag;

