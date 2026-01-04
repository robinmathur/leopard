import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * High-Density Corporate Theme for Immigration CRM
 * Explicitly synchronized for 32px height across all form controls.
 */
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#424242',
      light: '#6d6d6d',
      dark: '#1b1b1b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    divider: '#e0e0e0',
    error: { main: '#d32f2f' },
    warning: { main: '#f57c00' },
    success: { main: '#388e3c' },
    info: { main: '#1976d2' },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 13,
    h1: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2 },
    h2: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.2 },
    h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: '0.8125rem', lineHeight: 1.5 },
    body2: { fontSize: '0.75rem', lineHeight: 1.5 },
    button: {
      fontSize: '0.8125rem',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      defaultProps: {
        size: 'small',
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: '32px',
          height: '32px',
        },
        sizeSmall: {
          minHeight: '32px',
          height: '32px',
          padding: '0px 12px',
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          // Perfectly centers label vertically inside 32px height
          transform: 'translate(14px, 7px) scale(1)',
        },
        shrink: {
          // Positions label on the top border correctly when focused
          transform: 'translate(14px, -8px) scale(0.75) !important',
        },
        sizeSmall: {
          transform: 'translate(14px, 7px) scale(1)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          backgroundColor: '#ffffff',
          height: '32px', // Forces container to match buttons
        },
        inputSizeSmall: {
          padding: '0px 12px',
          height: '32px',
          lineHeight: '32px',
          boxSizing: 'border-box',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          // Ensures text in Select aligns with TextField and Buttons
          paddingTop: '0px !important',
          paddingBottom: '0px !important',
          height: '32px !important',
          lineHeight: '32px !important',
          display: 'flex',
          alignItems: 'center',
          minHeight: '32px !important',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        multiline: {
          // Fixes padding for Description/Textarea fields
          padding: '0px !important',
          height: 'auto !important', // Let multiline grow vertically
          '& textarea': {
            padding: '8px 12px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 12px',
          fontSize: '0.8125rem',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#fafafa',
          color: '#555',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.1rem',
          fontWeight: 600,
          padding: '12px 16px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: '4px', // Tighter spacing for checklists
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);