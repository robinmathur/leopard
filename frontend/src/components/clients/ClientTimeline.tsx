/**
 * ClientTimeline Component
 * Client-specific timeline component using shared Timeline
 */
import { useEffect } from 'react';
import { Paper } from '@mui/material';
import { Timeline } from '@/components/shared/Timeline';
import { useTimelineStore } from '@/store/timelineStore';

export interface ClientTimelineProps {
  /** Client ID */
  clientId: number;
}

/**
 * ClientTimeline Component
 * Displays timeline of activities for a specific client
 */
export const ClientTimeline = ({ clientId }: ClientTimelineProps) => {
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

  // Fetch timeline when component mounts or clientId/filter changes
  useEffect(() => {
    fetchTimeline(clientId, {
      activity_type: activeFilter || undefined,
    });
    return () => {
      cancelFetchTimeline();
    };
  }, [clientId, activeFilter, fetchTimeline, cancelFetchTimeline]);

  // Handle filter change
  const handleFilterChange = (activityType: string | null) => {
    setFilter(activityType);
    fetchTimeline(clientId, {
      activity_type: activityType || undefined,
      page: 1,
    });
  };

  // Handle load more
  const handleLoadMore = () => {
    loadMore(clientId);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Timeline
        activities={activities}
        isLoading={isLoading}
        error={error?.message || null}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        showFilters
      />
    </Paper>
  );
};

export default ClientTimeline;
