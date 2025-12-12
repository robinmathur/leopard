/**
 * Timeline Component
 * Reusable timeline component for displaying chronological activities
 */
import {
  Box,
  Typography,
  Button,
  Alert,
  Skeleton,
  Divider,
  CircularProgress,
} from '@mui/material';
import { TimelineProps } from './types';
import { TimelineItem } from './TimelineItem';
import { TimelineFilters } from './TimelineFilters';

/**
 * Loading skeleton for timeline
 */
const TimelineSkeleton = () => (
  <Box>
    {[...Array(5)].map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Timeline Component
 */
export const Timeline = ({
  activities,
  isLoading = false,
  error = null,
  hasMore = false,
  onLoadMore,
  activeFilter = null,
  onFilterChange,
  showFilters = true,
}: TimelineProps) => {
  // Loading state (initial load)
  if (isLoading && activities.length === 0) {
    return <TimelineSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filters */}
      {showFilters && onFilterChange && (
        <TimelineFilters
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
      )}

      {/* Timeline Items */}
      {activities.length === 0 ? (
        <Box
          sx={{
            py: 6,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" gutterBottom>
            No activities yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeFilter
              ? 'No activities match the selected filter.'
              : 'Activities will appear here as actions are performed.'}
          </Typography>
        </Box>
      ) : (
        <>
          <Divider sx={{ mb: 2 }} />
          <Box>
            {activities.map((activity) => (
              <TimelineItem key={activity.id} activity={activity} />
            ))}
          </Box>

          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={onLoadMore}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={16} /> : null}
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </Button>
            </Box>
          )}

          {/* Activity Count */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: 'block', textAlign: 'center' }}
          >
            Showing {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
            {hasMore && ' • More available'}
          </Typography>
        </>
      )}
    </Box>
  );
};

export default Timeline;
