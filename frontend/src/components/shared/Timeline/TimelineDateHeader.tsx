/**
 * TimelineDateHeader Component
 * Displays date header for grouped timeline activities
 */
import { Box, Typography } from '@mui/material';

interface TimelineDateHeaderProps {
  label: string;
  date: Date;
}

export const TimelineDateHeader = ({ label, date }: TimelineDateHeaderProps) => {
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (date: Date): boolean => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  let displayLabel = label;
  if (isToday(date)) {
    displayLabel = 'Today';
  } else if (isYesterday(date)) {
    displayLabel = 'Yesterday';
  }

  return (
    <Box
      sx={{
        mb: 2,
        mt: 3,
        '&:first-of-type': {
          mt: 0,
        },
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: 'primary.main',
          fontSize: '1rem',
          mb: 2,
        }}
      >
        {displayLabel}
      </Typography>
    </Box>
  );
};

export default TimelineDateHeader;

