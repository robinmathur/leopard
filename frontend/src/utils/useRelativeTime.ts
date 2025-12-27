/**
 * Hook for auto-updating relative time display
 * Updates the time display every minute to show accurate "time ago" information
 */
import { useState, useEffect } from 'react';

/**
 * Format date as relative time (e.g., "2 minutes ago", "3 hours ago")
 * This function calculates the difference and formats it in a human-readable way
 */
const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    if (diffYears >= 1) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    
    // Fallback to formatted date for older items
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
};

/**
 * Calculate update interval based on how old the date is
 * More recent dates need more frequent updates
 */
const getUpdateInterval = (dateString: string): number => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Update every 30 seconds for items less than 1 hour old
    if (diffMins < 60) return 30000;
    // Update every minute for items less than 24 hours old
    if (diffHours < 24) return 60000;
    // Update every 5 minutes for items less than 7 days old
    if (diffDays < 7) return 300000;
    // Update every hour for older items
    return 3600000;
  } catch {
    return 60000; // Default to 1 minute
  }
};

/**
 * Hook that returns auto-updating relative time string
 * @param dateString - ISO date string
 * @returns Formatted relative time string that updates automatically
 */
export const useRelativeTime = (dateString: string): string => {
  const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(dateString));

  useEffect(() => {
    // Initial update
    setRelativeTime(formatRelativeTime(dateString));

    // Calculate update interval based on date age
    const interval = getUpdateInterval(dateString);

    // Set up interval to update the time
    const timer = setInterval(() => {
      setRelativeTime(formatRelativeTime(dateString));
    }, interval);

    // Cleanup on unmount
    return () => clearInterval(timer);
  }, [dateString]);

  return relativeTime;
};

