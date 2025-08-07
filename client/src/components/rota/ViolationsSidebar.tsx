import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Fade,
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ClearAll as ClearAllIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

interface ViolationItem {
  id?: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  carerId?: string;
  carerName?: string;
  date?: string;
  shiftType?: string;
  uniqueKey?: string;
  isPersistent?: boolean; // Can't be dismissed individually
}

interface ViolationsSidebarProps {
  violations: ViolationItem[];
  onDismissViolation: (index: number) => void;
  onClearAll: () => void;
  showToggleButton?: boolean;
  isShowingAll?: boolean;
  onToggleShow?: () => void;
}

export const ViolationsSidebar: React.FC<ViolationsSidebarProps> = ({
  violations,
  onDismissViolation,
  onClearAll,
  showToggleButton = false,
  isShowingAll = false,
  onToggleShow
}) => {
  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <ErrorIcon fontSize="small" />;
      case 'warning': return <WarningIcon fontSize="small" />;
      default: return <InfoIcon fontSize="small" />;
    }
  };

  const getColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  if (violations.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 120,
        right: 16,
        width: 320,
        maxHeight: 'calc(100vh - 140px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: 4
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderRadius: 2
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: 2
        }
      }}
    >
      {/* Header */}
      <Card sx={{ backgroundColor: 'background.paper', boxShadow: 3 }}>
        <CardContent sx={{ py: 1, px: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight="bold">
              {isShowingAll ? 'All Issues' : 'Recent Issues'} ({violations.length})
            </Typography>
            <Box display="flex" gap={0.5}>
              {showToggleButton && onToggleShow && (
                <IconButton 
                  size="small" 
                  onClick={onToggleShow} 
                  title={isShowingAll ? "Show only recent" : "Show all issues"}
                  color={isShowingAll ? "primary" : "default"}
                >
                  {isShowingAll ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
              )}
              <IconButton size="small" onClick={onClearAll} title="Clear recent">
                <ClearAllIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Violation Cards */}
      {violations.map((violation, index) => (
        <Fade key={violation.uniqueKey || index} in timeout={300}>
          <Card 
            sx={{ 
              backgroundColor: 'background.paper',
              borderLeft: '4px solid',
              borderLeftColor: `${getColor(violation.severity)}.main`,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4
              }
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    {getIcon(violation.severity)}
                    <Chip
                      size="small"
                      label={violation.severity.toUpperCase()}
                      color={getColor(violation.severity) as any}
                      sx={{ 
                        height: 18, 
                        fontSize: '9px',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {violation.carerName && (
                      <Box component="span" sx={{ fontWeight: 'bold', mr: 0.5 }}>
                        {violation.carerName}:
                      </Box>
                    )}
                    {violation.message}
                  </Typography>

                  {(violation.date || violation.shiftType) && (
                    <Typography variant="caption" color="text.secondary">
                      {violation.date && new Date(violation.date).toLocaleDateString('en-GB', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                      {violation.date && violation.shiftType && ' • '}
                      {violation.shiftType && `${violation.shiftType} shift`}
                    </Typography>
                  )}
                </Box>

                {!violation.isPersistent && (
                  <IconButton 
                    size="small" 
                    onClick={() => onDismissViolation(index)}
                    sx={{ 
                      ml: 1,
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'error.main'
                      }
                    }}
                    title="Dismiss violation"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </CardContent>
          </Card>
        </Fade>
      ))}
    </Box>
  );
};