/**
 * Date grouping utilities for timeline
 * Groups activities by day, week, month, or year
 */

export type GroupingLevel = 'day' | 'week' | 'month' | 'year';

export interface DateGroup {
  key: string;
  label: string;
  date: Date;
  activities: any[];
}

/**
 * Format date for display in timeline
 */
export const formatTimelineDate = (dateString: string): { time: string; date: string; fullDate: string } => {
  const date = new Date(dateString);
  
  // Format time (e.g., "9:15 am", "1:30 pm")
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase();

  // Format date (e.g., "24 April 2022")
  const dateStr = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Full date for grouping key
  const fullDate = date.toISOString().split('T')[0];

  return { time, date: dateStr, fullDate };
};

/**
 * Get grouping key based on level
 */
const getGroupKey = (date: Date, level: GroupingLevel): string => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Get week number (ISO week)
  const getWeekNumber = (d: Date): number => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  switch (level) {
    case 'day':
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'week':
      const week = getWeekNumber(date);
      return `${year}-W${String(week).padStart(2, '0')}`;
    case 'month':
      return `${year}-${String(month + 1).padStart(2, '0')}`;
    case 'year':
      return String(year);
    default:
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
};

/**
 * Get group label based on level
 */
const getGroupLabel = (date: Date, level: GroupingLevel): string => {
  const year = date.getFullYear();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  
  // Get week number and range
  const getWeekRange = (d: Date): string => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(date.setDate(diff + 6));
    
    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${formatDate(monday)} - ${formatDate(sunday)}, ${year}`;
  };

  switch (level) {
    case 'day':
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    case 'week':
      return getWeekRange(date);
    case 'month':
      return `${month} ${year}`;
    case 'year':
      return String(year);
    default:
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
  }
};

/**
 * Group activities by date
 */
export const groupActivitiesByDate = (
  activities: any[],
  level: GroupingLevel = 'day'
): DateGroup[] => {
  const groups = new Map<string, DateGroup>();

  activities.forEach((activity) => {
    const date = new Date(activity.created_at);
    const key = getGroupKey(date, level);
    const label = getGroupLabel(date, level);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        date,
        activities: [],
      });
    }

    groups.get(key)!.activities.push(activity);
  });

  // Sort groups by date (newest first)
  return Array.from(groups.values()).sort((a, b) => {
    return b.date.getTime() - a.date.getTime();
  });
};

/**
 * Determine grouping level based on date range
 */
export const getOptimalGroupingLevel = (activities: any[]): GroupingLevel => {
  if (activities.length === 0) return 'day';

  const dates = activities.map((a) => new Date(a.created_at).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return 'day';
  if (diffDays <= 7) return 'day'; // Still show by day for week
  if (diffDays <= 30) return 'week';
  if (diffDays <= 365) return 'month';
  return 'year';
};

/**
 * Check if a date is today
 */
const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a date is in the current week (Monday to Sunday)
 */
const isThisWeek = (date: Date): boolean => {
  const today = new Date();
  const todayDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (todayDay === 0 ? 6 : todayDay - 1));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return date >= monday && date <= sunday;
};

/**
 * Check if a date is in the current month
 */
const isThisMonth = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a date is in the current year
 */
const isThisYear = (date: Date): boolean => {
  const today = new Date();
  return date.getFullYear() === today.getFullYear();
};

/**
 * Get smart group key and label for a date
 */
const getSmartGroupInfo = (date: Date): { key: string; label: string } => {
  if (isToday(date)) {
    return { key: 'today', label: 'Today' };
  }
  
  if (isThisWeek(date)) {
    return { key: 'this-week', label: 'This Week' };
  }
  
  if (isThisMonth(date)) {
    return { key: 'this-month', label: 'This Month' };
  }
  
  if (isThisYear(date)) {
    return { key: 'this-year', label: 'This Year' };
  }
  
  // Otherwise, group by year
  const year = date.getFullYear();
  return { key: `year-${year}`, label: String(year) };
};

/**
 * Get sort order for smart groups
 */
const getSmartGroupSortOrder = (key: string): number => {
  if (key === 'today') return 0;
  if (key === 'this-week') return 1;
  if (key === 'this-month') return 2;
  if (key === 'this-year') return 3;
  // Years get higher numbers, sorted by year descending
  if (key.startsWith('year-')) {
    const year = parseInt(key.replace('year-', ''), 10);
    return 10000 - year; // Higher years get lower sort numbers
  }
  return 9999;
};

/**
 * Group activities by smart date ranges
 * Groups into: Today, This Week, This Month, This Year, then by year
 */
export const groupActivitiesBySmartDate = (activities: any[]): DateGroup[] => {
  const groups = new Map<string, DateGroup>();

  activities.forEach((activity) => {
    const date = new Date(activity.created_at);
    const { key, label } = getSmartGroupInfo(date);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        date,
        activities: [],
      });
    }

    groups.get(key)!.activities.push(activity);
  });

  // Sort groups: Today first, then This Week, This Month, This Year, then years descending
  // Within each group, sort activities by date (newest first)
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      activities: group.activities.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }))
    .sort((a, b) => {
      const orderA = getSmartGroupSortOrder(a.key);
      const orderB = getSmartGroupSortOrder(b.key);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // If same group type, sort by date (newest first)
      return b.date.getTime() - a.date.getTime();
    });
};

