/**
 * TimelineFilters Component
 * Filter timeline by activity type
 */
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { TimelineFiltersProps, ACTIVITY_TYPE_CONFIG } from './types';

export const TimelineFilters = ({ activeFilter, onFilterChange }: TimelineFiltersProps) => {
  const activityTypes = Object.keys(ACTIVITY_TYPE_CONFIG);

  return (
    <Box sx={{ mb: 3 }}>
      <FormControl size="small" sx={{ minWidth: 250 }}>
        <InputLabel id="activity-filter-label">Filter by Activity Type</InputLabel>
        <Select
          labelId="activity-filter-label"
          id="activity-filter"
          value={activeFilter || ''}
          label="Filter by Activity Type"
          onChange={(e) => onFilterChange(e.target.value || null)}
          startAdornment={<FilterListIcon sx={{ mr: 1, color: 'action.active' }} />}
        >
          <MenuItem value="">
            <em>All Activities</em>
          </MenuItem>
          {activityTypes.map((type) => {
            const config = ACTIVITY_TYPE_CONFIG[type];
            return (
              <MenuItem key={type} value={type}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </Box>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {activeFilter && (
        <Chip
          label={`Filtered: ${ACTIVITY_TYPE_CONFIG[activeFilter]?.label || activeFilter}`}
          onDelete={() => onFilterChange(null)}
          sx={{ ml: 2 }}
          size="small"
        />
      )}
    </Box>
  );
};

export default TimelineFilters;
