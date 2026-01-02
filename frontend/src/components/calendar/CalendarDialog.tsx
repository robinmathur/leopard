import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Button, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { FullCalendarView } from './FullCalendarView';

interface CalendarDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CalendarDialog: React.FC<CalendarDialogProps> = ({ open, onClose }) => {
  const navigate = useNavigate();

  const handleOpenFullCalendar = () => {
    onClose();
    navigate('/calendar');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        Calendar
        <Box>
          <Button
            size="small"
            startIcon={<OpenInNewIcon />}
            onClick={handleOpenFullCalendar}
            sx={{ mr: 1 }}
          >
            Open Full Calendar
          </Button>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ height: '70vh', p: 0 }}>
        <FullCalendarView height="100%" />
      </DialogContent>
    </Dialog>
  );
};
