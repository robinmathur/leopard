/**
 * VisaApplicationActivity
 * Activity tab component displaying filtered timeline activities for the visa application
 */
import { useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import type { VisaApplication } from '@/services/api/visaApplicationApi';
import { Timeline } from '@/components/shared/Timeline/Timeline';
import { useTimelineStore } from '@/store/timelineStore';
import { ClientActivity } from '@/services/api/timelineApi';

interface VisaApplicationActivityProps {
  application: VisaApplication;
}

export const VisaApplicationActivity = ({ application }: VisaApplicationActivityProps) => {
  const {
    activities,
    isLoading,
    error,
    hasMore,
    activeFilter,
    fetchTimeline,
    setFilter,
    loadMore,
    cancelFetchTimeline,
  } = useTimelineStore();

  // Fetch timeline when component mounts
  useEffect(() => {
    fetchTimeline(application.client, {
      activity_type: activeFilter || undefined,
    });
    return () => {
      cancelFetchTimeline();
    };
  }, [application.client, activeFilter, fetchTimeline, cancelFetchTimeline]);

  // Filter activities by visa_application_id in metadata
  const filteredActivities = activities.filter((activity: ClientActivity) => {
    const metadata = activity.metadata || {};
    const visaApplicationId = metadata.visa_application_id as number | undefined;
    return visaApplicationId === application.id;
  });

  // Handle filter change
  const handleFilterChange = (activityType: string | null) => {
    setFilter(activityType);
    fetchTimeline(application.client, {
      activity_type: activityType || undefined,
      page: 1,
    });
  };

  // Handle load more
  const handleLoadMore = () => {
    loadMore(application.client);
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Application Activity
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Timeline of activities related to this visa application
        </Typography>
        <Timeline
          activities={filteredActivities}
          isLoading={isLoading}
          error={error?.message || null}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          showFilters
        />
      </Paper>
    </Box>
  );
};

export default VisaApplicationActivity;

