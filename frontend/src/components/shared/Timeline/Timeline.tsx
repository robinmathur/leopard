/**
 * Timeline Component
 * Reusable timeline component for displaying chronological activities
 * Uses Material-UI Timeline components
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
import {
  Timeline as MuiTimeline,
  TimelineItem as MuiTimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
  TimelineDot,
} from '@mui/lab';
import { TimelineProps } from './types';
import { TimelineItem } from './TimelineItem';
import { TimelineFilters } from './TimelineFilters';
import { TimelineDateHeader } from './TimelineDateHeader';
import { groupActivitiesBySmartDate, formatTimelineDate } from '@/utils/dateGrouping';
import { ACTIVITY_TYPE_CONFIG } from './types';
import { useRelativeTime } from '@/utils/useRelativeTime';
import { ClientActivity } from './types';
import NoteIcon from '@mui/icons-material/Note';
import { SvgIconComponent } from '@mui/icons-material';

/**
 * TimelineItemWithTimestamp Component
 * Wraps TimelineItem with Material-UI Timeline components and timestamp
 */
const TimelineItemWithTimestamp = ({
  activity,
  config,
  iconComponent: IconComponent,
  isLast,
}: {
  activity: ClientActivity;
  config: { color: string; icon: SvgIconComponent };
  iconComponent: SvgIconComponent;
  isLast: boolean;
}) => {
  const relativeTime = useRelativeTime(activity.created_at);
  const { time, date } = formatTimelineDate(activity.created_at);
  
  // Format date more compactly for timeline
  const formatCompactDate = (dateString: string): string => {
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }
    
    // Check if it's yesterday
    if (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }
    
    // Check if it's this year
    if (d.getFullYear() === today.getFullYear()) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
    
    // Otherwise show full date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const compactDate = formatCompactDate(activity.created_at);

  return (
    <MuiTimelineItem>
      {/* Timestamp on left */}
      <TimelineOppositeContent
        sx={{
          flex: 0.15,
          minWidth: '120px',
          maxWidth: '150px',
          pr: 3,
          textAlign: 'right',
          alignSelf: 'flex-start',
          pt: 0.5,
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600, 
            color: 'text.primary',
            fontSize: '0.875rem',
            lineHeight: 1.2,
            mb: 0.25,
          }}
        >
          {compactDate}
        </Typography>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          {time}
        </Typography>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block',
            fontSize: '0.7rem',
            mt: 0.125,
          }}
        >
          {relativeTime}
        </Typography>
      </TimelineOppositeContent>

      {/* Timeline separator with dot */}
      <TimelineSeparator>
        <TimelineDot
          sx={{
            bgcolor: config.color,
            color: 'white',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: 'none',
          }}
        >
          <IconComponent sx={{ fontSize: '1.125rem' }} />
        </TimelineDot>
        {!isLast && (
          <TimelineConnector 
            sx={{
              bgcolor: 'primary.main',
              opacity: 0.2,
            }}
          />
        )}
      </TimelineSeparator>

      {/* Activity content on right */}
      <TimelineContent 
        sx={{ 
          pl: 2, 
          pr: 0,
          py: 0,
          flex: 1,
        }}
      >
        <TimelineItem activity={activity} />
      </TimelineContent>
    </MuiTimelineItem>
  );
};

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
          {/* Timeline with date grouping */}
          <GroupedTimelineContent activities={activities} />

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

/**
 * GroupedTimelineContent Component
 * Renders grouped timeline activities with date headers using Material-UI Timeline
 */
const GroupedTimelineContent = ({ activities }: { activities: any[] }) => {
  // Group activities by smart date ranges (Today, This Week, This Month, This Year, then by year)
  const groupedActivities = groupActivitiesBySmartDate(activities);

  return (
    <Box>
      {groupedActivities.map((group, groupIndex) => (
        <Box key={group.key}>
          {/* Date Header */}
          <TimelineDateHeader label={group.label} date={group.date} />

          {/* Material-UI Timeline */}
          <MuiTimeline 
            position="right" 
            sx={{ 
              pl: 0, 
              pr: 0,
              '& .MuiTimelineItem-root': {
                minHeight: 'auto',
                '&:before': {
                  display: 'none',
                },
              },
            }}
          >
            {group.activities.map((activity, activityIndex) => {
              const config = ACTIVITY_TYPE_CONFIG[activity.activity_type] || {
                color: '#1976d2',
                icon: NoteIcon,
              };
              const isLast = activityIndex === group.activities.length - 1;
              const IconComponent = config.icon;

              return (
                <TimelineItemWithTimestamp
                  key={activity.id}
                  activity={activity}
                  config={config}
                  iconComponent={IconComponent}
                  isLast={isLast}
                />
              );
            })}
          </MuiTimeline>
        </Box>
      ))}
    </Box>
  );
};

export default Timeline;
