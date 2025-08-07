import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Badge,
  Skeleton
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  LocalHospital as HealthIcon,
  Security as SecurityIcon,
  Brightness3 as NightIcon,
  WbSunny as DayIcon,
  Weekend as WeekendIcon,
  TouchApp as TouchIcon
} from '@mui/icons-material';
import { Droppable } from 'react-beautiful-dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { API_ENDPOINTS, ShiftType, DragValidationResult, CarerWithPackageCompetency } from '@caretrack/shared';

interface RotaEntry {
  id: string;
  packageId: string;
  carerId: string;
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  isConfirmed: boolean;
  carer: {
    id: string;
    name: string;
    email: string;
    competencyRatings?: Array<{
      taskId: string;
      level: string;
      task: { name: string };
    }>;
  };
}

interface WeeklyCalendarProps {
  weekStart: Date;
  entries: RotaEntry[];
  packageId: string;
  onRefresh: () => void;
  dragValidationResult?: DragValidationResult;
  isDragInProgress?: boolean;
  viewMode?: 'table' | 'card' | 'compact';
  onViewModeChange?: (mode: 'table' | 'card' | 'compact') => void;
}

interface ShiftSlotProps {
  date: Date;
  shiftType: ShiftType;
  entries: RotaEntry[];
  packageId: string;
  onRefresh: () => void;
  dragValidationResult?: DragValidationResult;
  isDragInProgress?: boolean;
  viewMode?: 'table' | 'card' | 'compact';
  showCompactView?: boolean;
}

const ShiftSlot: React.FC<ShiftSlotProps> = ({ 
  date, 
  shiftType, 
  entries, 
  packageId, 
  onRefresh, 
  dragValidationResult,
  isDragInProgress 
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedEntry, setSelectedEntry] = useState<RotaEntry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const dateEntries = entries.filter(entry => 
    new Date(entry.date).toDateString() === date.toDateString() && 
    entry.shiftType === shiftType
  );


  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiService.delete(`${API_ENDPOINTS.ROTA.DELETE}/${entryId}`);
      return response?.data || response;
    },
    onSuccess: () => {
      showSuccess('Rota entry deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      setAnchorEl(null);
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        showError(axiosError.response?.data?.error || 'Failed to delete rota entry');
      } else {
        showError('Failed to delete rota entry');
      }
    }
  });

  const confirmEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiService.patch(`${API_ENDPOINTS.ROTA.CONFIRM.replace(':id', entryId)}`);
      return response?.data || response;
    },
    onSuccess: () => {
      showSuccess('Rota entry confirmed successfully');
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      setAnchorEl(null);
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        showError(axiosError.response?.data?.error || 'Failed to confirm rota entry');
      } else {
        showError('Failed to confirm rota entry');
      }
    }
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, entry: RotaEntry) => {
    setAnchorEl(event.currentTarget);
    setSelectedEntry(entry);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEntry(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleConfirmDelete = () => {
    if (selectedEntry) {
      deleteEntryMutation.mutate(selectedEntry.id);
    }
  };

  const handleConfirmEntry = () => {
    if (selectedEntry) {
      confirmEntryMutation.mutate(selectedEntry.id);
    }
  };

  const getPackageCompetencyLevel = (carer: RotaEntry['carer']) => {
    // Use package-specific competency if available (from entries that might have been updated)
    const carerWithPackageComp = carer as CarerWithPackageCompetency;
    if (carerWithPackageComp.packageCompetency) {
      const packageComp = carerWithPackageComp.packageCompetency;
      
      if (packageComp.hasNoTasks) {
        return 'NO_TASKS';
      }
      
      if (packageComp.isPackageCompetent) {
        return 'COMPETENT';
      } else if (packageComp.competentTaskCount === 0) {
        return 'NOT_ASSESSED';
      } else {
        return 'PARTIAL';
      }
    }

    // Fallback to global competency assessment
    if (!carer.competencyRatings || carer.competencyRatings.length === 0) {
      return 'NOT_ASSESSED';
    }

    const levels = carer.competencyRatings.map(rating => rating.level);
    
    if (levels.includes('EXPERT')) return 'EXPERT';
    if (levels.includes('PROFICIENT')) return 'PROFICIENT';
    if (levels.includes('COMPETENT')) return 'COMPETENT';
    if (levels.includes('ADVANCED_BEGINNER')) return 'ADVANCED_BEGINNER';
    if (levels.includes('NOT_COMPETENT')) return 'NOT_COMPETENT';
    
    return 'NOT_ASSESSED';
  };

  const getCompetencyColor = (level: string): 'default' | 'success' | 'primary' | 'secondary' | 'warning' | 'error' => {
    switch (level) {
      case 'EXPERT': return 'success';
      case 'PROFICIENT': return 'primary';
      case 'COMPETENT': return 'secondary';
      case 'PARTIAL': return 'warning';
      case 'ADVANCED_BEGINNER': return 'warning';
      case 'NOT_COMPETENT': return 'error';
      case 'NO_TASKS': return 'default';
      default: return 'default';
    }
  };

  const getCompetencyDisplayText = (carer: RotaEntry['carer'], level: string) => {
    const carerWithPackageComp = carer as CarerWithPackageCompetency;
    if (carerWithPackageComp.packageCompetency) {
      const packageComp = carerWithPackageComp.packageCompetency;
      
      if (packageComp.hasNoTasks) {
        return 'NO TASKS';
      }
      return `${packageComp.competentTaskCount}/${packageComp.totalTaskCount}`;
    }
    
    // Fallback to abbreviated global competency display
    return level.replace('_', ' ').substring(0, 8);
  };

  // Use local date instead of UTC to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const localDateStr = `${year}-${month}-${day}`;
  const droppableId = `shift-slot-${localDateStr}-${shiftType}`;
  
  // Temporarily simplified - just check if dragging in progress
  const isCurrentDragTarget = false; // Disable for debugging
  const validationState = null; // Disable complex validation

  // Analyze slot characteristics for smart visual hints
  const getSlotHints = () => {
    const hints = [];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const hasExistingEntries = dateEntries.length > 0;
    const isNightShift = shiftType === ShiftType.NIGHT;
    
    if (isWeekend) {
      hints.push({ type: 'weekend', severity: 'info', message: 'Weekend shift' });
    }
    
    if (isNightShift) {
      hints.push({ type: 'night', severity: 'info', message: 'Night shift - check rest periods' });
    }
    
    if (hasExistingEntries) {
      const carerCount = dateEntries.length;
      hints.push({ type: 'occupied', severity: 'success', message: `${carerCount} carer${carerCount > 1 ? 's' : ''} assigned` });
    }
    
    return hints;
  };

  const slotHints = getSlotHints();
  const hasWarningHints = slotHints.some(h => h.severity === 'warning');
  const hasInfoHints = slotHints.some(h => h.severity === 'info');

  return (
    <Droppable droppableId={droppableId} type="CARER">
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.droppableProps}
          sx={{
            minHeight: '80px',
            p: 1,
            backgroundColor: snapshot.isDraggingOver 
              ? 'primary.light' 
              : dateEntries.length > 0 ? 'action.hover' : 'background.paper',
            border: '1px dashed',
            borderColor: snapshot.isDraggingOver 
              ? 'primary.main'
              : dateEntries.length > 0 ? 'primary.main' : 'divider',
            borderRadius: 1,
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover'
            }
          }}
        >
      {/* Overlays disabled for debugging */}

      {dateEntries.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Drop carers here
        </Typography>
      ) : (
        <Box display="flex" flexDirection="column" gap={0.5}>
          {dateEntries.map((entry) => {
            const competencyLevel = getPackageCompetencyLevel(entry.carer);
            const competencyDisplayText = getCompetencyDisplayText(entry.carer, competencyLevel);
            
            return (
              <Box
                key={entry.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 0.5,
                  backgroundColor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: entry.isConfirmed ? 'success.main' : 'divider'
                }}
              >
                <Box display="flex" alignItems="center" gap={1} flex={1}>
                  <PersonIcon fontSize="small" />
                  <Box>
                    <Typography variant="caption" fontWeight="medium">
                      {entry.carer.name}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {entry.startTime} - {entry.endTime}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" gap={0.5}>
                    <Chip
                      size="small"
                      label={competencyDisplayText}
                      color={getCompetencyColor(competencyLevel)}
                      sx={{ 
                        height: '16px', 
                        fontSize: '10px',
                        fontWeight: 'bold',
                        border: competencyLevel === 'COMPETENT' ? '1px solid' : 'none',
                        borderColor: 'success.main'
                      }}
                    />
                    
                    {entry.isConfirmed ? (
                      <CheckCircleIcon fontSize="small" color="success" />
                    ) : (
                      <WarningIcon fontSize="small" color="warning" />
                    )}
                  </Box>
                </Box>

                <IconButton
                  size="small"
                  onClick={(e) => handleMenuClick(e, entry)}
                  sx={{ ml: 1 }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedEntry && !selectedEntry.isConfirmed && (
          <MenuItem onClick={handleConfirmEntry}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
            Confirm
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this rota entry for {selectedEntry?.carer.name}?
          </Typography>
          {selectedEntry && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Date:</strong> {new Date(selectedEntry.date).toLocaleDateString()}<br />
              <strong>Shift:</strong> {selectedEntry.shiftType} ({selectedEntry.startTime} - {selectedEntry.endTime})<br />
              <strong>Carer:</strong> {selectedEntry.carer.name}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteEntryMutation.isPending}
            startIcon={deleteEntryMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteEntryMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
          {provided.placeholder}
        </Box>
      )}
    </Droppable>
  );
};

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ 
  weekStart, 
  entries, 
  packageId, 
  onRefresh,
  dragValidationResult,
  isDragInProgress,
  viewMode = 'table',
  onViewModeChange
}) => {
  const getDaysOfWeek = (startDate: Date): Date[] => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const daysOfWeek = getDaysOfWeek(weekStart);
  const shiftTypes: ShiftType[] = [ShiftType.DAY, ShiftType.NIGHT];

  const formatDayHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    return {
      dayName: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNumber: date.getDate(),
      isToday
    };
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '100px', fontWeight: 'bold' }}>
              Shift Type
            </TableCell>
            {daysOfWeek.map((day) => {
              const dayInfo = formatDayHeader(day);
              return (
                <TableCell 
                  key={day.toISOString()} 
                  align="center"
                  sx={{ 
                    minWidth: '120px',
                    fontWeight: 'bold',
                    backgroundColor: dayInfo.isToday ? 'primary.light' : 'inherit',
                    color: dayInfo.isToday ? 'primary.contrastText' : 'inherit'
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {dayInfo.dayName}
                    </Typography>
                    <Typography variant="caption">
                      {dayInfo.dayNumber}
                    </Typography>
                  </Box>
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {shiftTypes.map((shiftType) => (
            <TableRow key={shiftType}>
              <TableCell 
                component="th" 
                scope="row"
                sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: shiftType === ShiftType.DAY ? 'warning.light' : 'info.light',
                  color: shiftType === ShiftType.DAY ? 'warning.contrastText' : 'info.contrastText'
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <ScheduleIcon fontSize="small" />
                  <Typography variant="body2" fontWeight="bold">
                    {shiftType}
                  </Typography>
                </Box>
              </TableCell>
              {daysOfWeek.map((day) => (
                <TableCell key={`${day.toISOString()}-${shiftType}`} sx={{ p: 1 }}>
                  <ShiftSlot
                    date={day}
                    shiftType={shiftType}
                    entries={entries}
                    packageId={packageId}
                    onRefresh={onRefresh}
                    dragValidationResult={dragValidationResult}
                    isDragInProgress={isDragInProgress}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};