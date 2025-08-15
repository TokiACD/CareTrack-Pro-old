import { createTheme } from '@mui/material/styles';

// Professional Healthcare Design System
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0a223c',
      light: '#2c4866',
      dark: '#041017',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      light: '#66bb6a',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02',
      light: '#ffb74d',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1',
      light: '#4fc3f7',
      dark: '#01579b',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.4,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
    '0px 3px 6px rgba(0, 0, 0, 0.16), 0px 3px 6px rgba(0, 0, 0, 0.23)',
    '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)',
    '0px 14px 28px rgba(0, 0, 0, 0.25), 0px 10px 10px rgba(0, 0, 0, 0.22)',
    '0px 19px 38px rgba(0, 0, 0, 0.30), 0px 15px 12px rgba(0, 0, 0, 0.22)',
    '0px 24px 48px rgba(0, 0, 0, 0.35), 0px 20px 20px rgba(0, 0, 0, 0.20)',
    '0px 2px 4px rgba(10, 34, 60, 0.08)',
    '0px 4px 8px rgba(10, 34, 60, 0.12)',
    '0px 8px 16px rgba(10, 34, 60, 0.16)',
    '0px 12px 24px rgba(10, 34, 60, 0.20)',
    '0px 16px 32px rgba(10, 34, 60, 0.24)',
    '0px 20px 40px rgba(10, 34, 60, 0.28)',
    '0px 24px 48px rgba(10, 34, 60, 0.32)',
    '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
    '0px 3px 6px rgba(0, 0, 0, 0.16), 0px 3px 6px rgba(0, 0, 0, 0.23)',
    '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)',
    '0px 14px 28px rgba(0, 0, 0, 0.25), 0px 10px 10px rgba(0, 0, 0, 0.22)',
    '0px 19px 38px rgba(0, 0, 0, 0.30), 0px 15px 12px rgba(0, 0, 0, 0.22)',
    '0px 24px 48px rgba(10, 34, 60, 0.15)',
    '0px 32px 64px rgba(10, 34, 60, 0.20)',
    '0px 40px 80px rgba(10, 34, 60, 0.25)',
    '0px 48px 96px rgba(10, 34, 60, 0.30)',
    '0px 56px 112px rgba(10, 34, 60, 0.35)',
    '0px 64px 128px rgba(10, 34, 60, 0.40)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: '100%',
          overflowX: 'hidden', // Prevent horizontal scroll
        },
        body: {
          backgroundColor: '#f8fafc',
          fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif',
          height: '100%',
          margin: 0,
          // Prevent over-scroll on mobile devices
          overscrollBehavior: 'none',
          // Ensure smooth scrolling
          scrollBehavior: 'smooth',
        },
        '#root': {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '12px 20px', // Increased for touch targets
          minHeight: 44, // Touch-friendly minimum height
          boxShadow: 'none',
          '@media (max-width:600px)': {
            padding: '14px 24px', // Larger padding on mobile
            fontSize: '0.9375rem', // Slightly larger text on mobile
            minHeight: 48, // Larger touch target on mobile
          },
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(10, 34, 60, 0.16)',
          },
          // Prevent double-tap zoom on iOS
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
            transition: 'all 0.2s ease-in-out',
          },
        },
        sizeLarge: {
          padding: '16px 32px',
          fontSize: '1rem',
          minHeight: 52,
          '@media (max-width:600px)': {
            padding: '18px 36px',
            minHeight: 56,
          },
        },
        sizeSmall: {
          padding: '8px 16px',
          fontSize: '0.8125rem',
          minHeight: 40,
          '@media (max-width:600px)': {
            padding: '10px 20px',
            minHeight: 44,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 2px 4px rgba(10, 34, 60, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          '@media (max-width:600px)': {
            borderRadius: 12, // Slightly smaller radius on mobile
          },
          '&:hover': {
            boxShadow: '0px 8px 16px rgba(10, 34, 60, 0.12)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          // Improve touch interaction
          '&:active': {
            transform: 'scale(0.98)',
            transition: 'transform 0.1s ease-in-out',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '@media (max-width:600px)': {
            padding: '16px', // Reduced padding on mobile for more content space
          },
          '&:last-child': {
            paddingBottom: '24px',
            '@media (max-width:600px)': {
              paddingBottom: '16px',
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#ffffff',
            minHeight: 48, // Touch-friendly input height
            '@media (max-width:600px)': {
              minHeight: 52, // Larger touch target on mobile
              fontSize: '16px', // Prevent zoom on iOS
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(10, 34, 60, 0.3)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: '2px',
              borderColor: '#0a223c',
            },
          },
          '& .MuiInputBase-input': {
            padding: '14px',
            '@media (max-width:600px)': {
              padding: '16px', // More padding on mobile
              fontSize: '16px', // Prevent zoom on mobile browsers
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 500,
            '@media (max-width:600px)': {
              fontSize: '1rem', // Larger labels on mobile
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
          fontSize: '0.8125rem',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a223c',
          boxShadow: '0px 1px 3px rgba(10, 34, 60, 0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          '&:hover': {
            backgroundColor: 'rgba(10, 34, 60, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(10, 34, 60, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(10, 34, 60, 0.12)',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44, // Touch-friendly minimum size
          minHeight: 44,
          '@media (max-width:600px)': {
            minWidth: 48, // Larger on mobile
            minHeight: 48,
            padding: '12px',
          },
          // Improve touch feedback
          '&:active': {
            transform: 'scale(0.95)',
            transition: 'transform 0.1s ease-in-out',
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '@media (max-width:900px)': {
            // Enable horizontal scroll on mobile with better touch scrolling
            minWidth: 'auto',
            overflowX: 'auto',
            display: 'block',
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch', // Smooth touch scrolling
          },
          '& .MuiTableHead-root': {
            '& .MuiTableCell-head': {
              backgroundColor: '#f8fafc',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'rgba(0, 0, 0, 0.87)',
              // Better mobile typography and touch targets
              '@media (max-width:600px)': {
                fontSize: '0.8125rem',
                padding: '16px 12px', // Increased touch target
                minHeight: 48,
              },
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '16px',
          '@media (max-width:600px)': {
            padding: '16px 12px', // Improved touch targets
            fontSize: '0.8125rem',
            minHeight: 44, // Minimum touch target height
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '& .MuiAlert-icon': {
            fontSize: '1.25rem',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: '0px 24px 48px rgba(10, 34, 60, 0.15)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '1.25rem',
          padding: '24px 24px 16px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  // Mobile-first responsive utilities - extending default mixins
  mixins: {
    toolbar: {
      minHeight: 56,
      '@media (min-width:0px) and (orientation: landscape)': {
        minHeight: 48,
      },
      '@media (min-width:600px)': {
        minHeight: 64,
      },
    },
  },
});

// Professional healthcare color palette
export const healthcareColors = {
  primary: '#0a223c',
  primaryLight: '#2c4866',
  primaryDark: '#041017',
  secondary: '#dc004e',
  accent: '#0288d1',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#0288d1',
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

// Professional spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Professional elevation scale
export const elevation = {
  card: '0px 2px 4px rgba(10, 34, 60, 0.08)',
  cardHover: '0px 8px 16px rgba(10, 34, 60, 0.12)',
  modal: '0px 24px 48px rgba(10, 34, 60, 0.15)',
  dropdown: '0px 4px 8px rgba(10, 34, 60, 0.12)',
};

// Professional border radius scale
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
};

declare module '@mui/material/styles' {
  interface Palette {
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  }

  interface PaletteOptions {
    neutral?: {
      50?: string;
      100?: string;
      200?: string;
      300?: string;
      400?: string;
      500?: string;
      600?: string;
      700?: string;
      800?: string;
      900?: string;
    };
  }
}
// Add neutral colors to theme palette
theme.palette.neutral = healthcareColors.neutral;

export default theme;