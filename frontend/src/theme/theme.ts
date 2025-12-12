import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * Corporate theme optimized for high data density (compact mode)
 * Designed for Immigration CRM SaaS application
 */
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Professional blue
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#424242', // Dark gray
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
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#f57c00',
    },
    success: {
      main: '#388e3c',
    },
    info: {
      main: '#1976d2',
    },
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
    fontSize: 13, // Reduced from default 14 for compact mode
    h1: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.1rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '0.8125rem', // 13px
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.75rem', // 12px
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.8125rem',
      fontWeight: 500,
      textTransform: 'none', // More modern, less shouty
    },
  },
  spacing: 8, // Default, but we'll reduce it in component overrides
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
          padding: '4px 12px',
          minHeight: '28px',
        },
        sizeSmall: {
          padding: '2px 8px',
          fontSize: '0.75rem',
          minHeight: '24px',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
        },
        input: {
          padding: '6px 10px',
        },
        inputSizeSmall: {
          padding: '4px 8px',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
        },
        sizeSmall: {
          fontSize: '0.75rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '6px 12px',
          fontSize: '0.8125rem',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#fafafa',
          padding: '8px 12px',
        },
        sizeSmall: {
          padding: '4px 8px',
        },
      },
    },
    MuiChip: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          height: '22px',
          fontSize: '0.75rem',
        },
        sizeSmall: {
          height: '18px',
          fontSize: '0.6875rem',
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          padding: '6px',
        },
        sizeSmall: {
          padding: '4px',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 1,
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '12px',
          '&:last-child': {
            paddingBottom: '12px',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e0e0e0',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          paddingTop: '4px',
          paddingBottom: '4px',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          paddingTop: '6px',
          paddingBottom: '6px',
          borderRadius: '4px',
          marginBottom: '2px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.12)',
            },
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.8125rem',
          fontWeight: 500,
        },
        secondary: {
          fontSize: '0.75rem',
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: '36px',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          padding: '4px 8px',
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          minHeight: '42px',
          padding: '6px 12px',
          textTransform: 'none',
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        maxWidth: 'md',
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
          padding: '16px',
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
  },
};

export const theme = createTheme(themeOptions);

