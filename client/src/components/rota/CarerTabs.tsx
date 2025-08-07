import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Person as PersonIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  School as SchoolIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { LocalizationProvider, TimePicker, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { API_ENDPOINTS, ShiftType, ScheduleValidationResult, RuleViolation, CarerWithPackageCompetency } from '@caretrack/shared';

interface Carer extends CarerWithPackageCompetency {}

interface CarerTabsProps {
  packageCarers: Carer[];
  otherCarers: Carer[];
  packageId: string;
  weekStart: Date;
}

interface AddShiftDialogProps {
  open: boolean;
  onClose: () => void;
  carer: Carer | null;
  packageId: string;
  weekStart: Date;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`carer-tabpanel-${index}`}
      aria-labelledby={`carer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};

const AddShiftDialog: React.FC<AddShiftDialogProps> = ({ 
  open, 
  onClose, 
  carer, 
  packageId, 
  weekStart 
}) => {
  const [date, setDate] = useState<Date | null>(weekStart);
  const [shiftType, setShiftType] = useState<ShiftType>(ShiftType.DAY);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ScheduleValidationResult | null>(null);

  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const validateEntryMutation = useMutation({
    mutationFn: async (data: {
      packageId: string;
      carerId: string;
      date: string;
      shiftType: ShiftType;
      startTime: string;
      endTime: string;
    }): Promise<ScheduleValidationResult> => {
      return await apiService.post<ScheduleValidationResult>(API_ENDPOINTS.ROTA.VALIDATE, data);
    },
    onSuccess: (data: ScheduleValidationResult) => {
      setValidationResult(data);
      setValidating(false);
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        showError(axiosError.response?.data?.error || 'Validation failed');
      } else {
        showError('Validation failed');
      }
      setValidating(false);
    }
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: {
      packageId: string;
      carerId: string;
      date: string;
      shiftType: ShiftType;
      startTime: string;
      endTime: string;
      isConfirmed: boolean;
    }) => {
      return await apiService.post(API_ENDPOINTS.ROTA.CREATE, data);
    },
    onSuccess: () => {
      showSuccess('Shift assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      handleClose();
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        showError(axiosError.response?.data?.error || 'Failed to assign shift');
      } else {
        showError('Failed to assign shift');
      }
    }
  });

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleValidate = () => {
    if (!carer || !date || !startTime || !endTime) return;

    setValidating(true);
    setValidationResult(null);

    const data = {
      packageId,
      carerId: carer.id,
      date: date.toISOString(),
      shiftType,
      startTime: formatTime(startTime),
      endTime: formatTime(endTime)
    };

    validateEntryMutation.mutate(data);
  };

  const handleCreate = () => {
    if (!carer || !date || !startTime || !endTime) return;

    const data = {
      packageId,
      carerId: carer.id,
      date: date.toISOString(),
      shiftType,
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
      isConfirmed: false
    };

    createEntryMutation.mutate(data);
  };

  const handleClose = () => {
    setDate(weekStart);
    setShiftType(ShiftType.DAY);
    setStartTime(null);
    setEndTime(null);
    setValidationResult(null);
    setValidating(false);
    onClose();
  };

  const isFormValid = carer && date && startTime && endTime;
  const hasErrors = validationResult && !validationResult.isValid;
  const hasWarnings = validationResult?.warnings && validationResult.warnings.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Assign Shift: {carer?.name}
      </DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 1 }}>
            <DatePicker
              label="Date"
              value={date}
              onChange={setDate}
              slotProps={{
                textField: { fullWidth: true }
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Shift Type</InputLabel>
              <Select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as ShiftType)}
                label="Shift Type"
              >
                <MenuItem value={ShiftType.DAY}>Day Shift</MenuItem>
                <MenuItem value={ShiftType.NIGHT}>Night Shift</MenuItem>
              </Select>
            </FormControl>

            <Box display="flex" gap={2}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={setStartTime}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
              <TimePicker
                label="End Time"
                value={endTime}
                onChange={setEndTime}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
            </Box>

            <Box display="flex" gap={2}>
              <Button
                onClick={handleValidate}
                disabled={!isFormValid || validating}
                variant="outlined"
                startIcon={validating ? <CircularProgress size={16} /> : <ScheduleIcon />}
              >
                {validating ? 'Validating...' : 'Check Rules'}
              </Button>
            </Box>

            {/* Validation Results */}
            {validationResult && (
              <Box>
                {hasErrors && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 1.5, color: 'error.dark' }}>
                      Scheduling Rule Violations:
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {validationResult.violations?.map((violation: RuleViolation, index: number) => (
                        <Card 
                          key={index}
                          variant="outlined"
                          sx={{
                            border: '1px solid',
                            borderColor: 'error.main',
                            backgroundColor: 'error.light'
                          }}
                        >
                          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <ErrorIcon 
                                color="error" 
                                fontSize="small"
                                sx={{ filter: 'brightness(0.8)' }}
                              />
                              <Typography 
                                variant="body2" 
                                fontWeight="medium"
                                sx={{ color: 'error.dark' }}
                              >
                                {violation.message}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                )}

                {hasWarnings && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 1.5, color: 'warning.dark' }}>
                      Warnings:
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {validationResult.warnings?.map((warning: RuleViolation, index: number) => (
                        <Card 
                          key={index}
                          variant="outlined"
                          sx={{
                            border: '1px solid',
                            borderColor: 'warning.main',
                            backgroundColor: 'warning.light'
                          }}
                        >
                          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <WarningIcon 
                                color="warning" 
                                fontSize="small"
                                sx={{ filter: 'brightness(0.8)' }}
                              />
                              <Typography 
                                variant="body2" 
                                fontWeight="medium"
                                sx={{ color: 'warning.dark' }}
                              >
                                {warning.message}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                )}

                {!hasErrors && !hasWarnings && (
                  <Card 
                    variant="outlined"
                    sx={{
                      border: '1px solid',
                      borderColor: 'success.main',
                      backgroundColor: 'success.light'
                    }}
                  >
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircleIcon 
                          color="success" 
                          fontSize="small"
                          sx={{ filter: 'brightness(0.8)' }}
                        />
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          sx={{ color: 'success.dark' }}
                        >
                          All scheduling rules passed. Ready to assign shift.
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </Box>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!isFormValid || hasErrors || createEntryMutation.isPending}
          startIcon={createEntryMutation.isPending ? <CircularProgress size={16} /> : <AddIcon />}
        >
          {createEntryMutation.isPending ? 'Assigning...' : 'Assign Shift'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CarerCard: React.FC<{
  carer: Carer;
  onAssignShift: (carer: Carer) => void;
  index?: number;
  isDragDisabled?: boolean;
}> = ({ carer, onAssignShift, index = 0, isDragDisabled = false }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const getPackageCompetencyLevel = (carer: Carer) => {
    // Use package-specific competency if available
    if (carer.packageCompetency) {
      const packageComp = carer.packageCompetency;
      
      if (packageComp.hasNoTasks) {
        return 'NO_TASKS';
      }
      
      if (packageComp.isPackageCompetent) {
        // Could determine highest level from package tasks, but for simplicity use COMPETENT
        return 'COMPETENT';
      } else if (packageComp.competentTaskCount === 0) {
        return 'NOT_ASSESSED';
      } else {
        return 'PARTIAL';
      }
    }

    // Fallback to global competency (shouldn't happen with updated API)
    if (!carer.competencies || carer.competencies.length === 0) {
      return 'NOT_ASSESSED';
    }

    const levels = carer.competencies.map((rating: { level: string }) => rating.level);
    
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

  const getCompetencyDisplayText = (carer: Carer, level: string) => {
    const packageComp = carer.packageCompetency;
    
    if (packageComp) {
      if (packageComp.hasNoTasks) {
        return 'No Tasks Assigned';
      }
      return `${packageComp.competentTaskCount}/${packageComp.totalTaskCount} Tasks`;
    }
    
    // Fallback to global competency display
    return level.replace('_', ' ');
  };

  const competencyLevel = getPackageCompetencyLevel(carer);
  const competencyDisplayText = getCompetencyDisplayText(carer, competencyLevel);
  const draggableId = `carer-${carer.id}`;

  return (
    <Draggable draggableId={draggableId} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <ListItem
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            border: '1px solid',
            borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
            borderRadius: 1,
            mb: 1,
            backgroundColor: snapshot.isDragging ? 'primary.light' : 'background.paper',
            cursor: isDragDisabled ? 'default' : 'grab',
            transform: provided.draggableProps.style?.transform,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover'
            },
            '&:active': {
              cursor: isDragDisabled ? 'default' : 'grabbing'
            }
          }}
        >
      <ListItemAvatar>
        <Avatar>
          <PersonIcon />
        </Avatar>
      </ListItemAvatar>
      
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight="medium">
              {carer.name}
            </Typography>
            <Chip
              size="small"
              label={competencyDisplayText}
              color={getCompetencyColor(competencyLevel)}
              icon={competencyLevel === 'COMPETENT' ? <StarIcon /> : <SchoolIcon />}
              sx={{ 
                fontWeight: 'bold',
                '& .MuiChip-icon': {
                  fontSize: '12px'
                }
              }}
            />
          </Box>
        }
        secondary={
          <>
            <Typography variant="caption" color="text.secondary" component="span">
              {carer.email}
            </Typography>
            {(() => {
              const packageComp = carer.packageCompetency;
              if (packageComp) {
                if (packageComp.hasNoTasks) {
                  return (
                    <Typography variant="caption" display="block" color="warning.main" component="span">
                      <br />
                      Package has no tasks assigned
                    </Typography>
                  );
                } else if (packageComp.isPackageCompetent) {
                  return (
                    <Typography variant="caption" display="block" color="success.main" component="span">
                      <br />
                      Package competent ({packageComp.competentTaskCount}/{packageComp.totalTaskCount} tasks)
                    </Typography>
                  );
                } else if (packageComp.competentTaskCount > 0) {
                  return (
                    <Typography variant="caption" display="block" color="warning.main" component="span">
                      <br />
                      Partially competent ({packageComp.competentTaskCount}/{packageComp.totalTaskCount} tasks)
                    </Typography>
                  );
                } else {
                  return (
                    <Typography variant="caption" display="block" color="text.secondary" component="span">
                      <br />
                      Not assessed for package tasks ({packageComp.totalTaskCount} tasks)
                    </Typography>
                  );
                }
              }
              // Fallback for global competency
              const competentTasksCount = carer.competencies?.length || 0;
              return competentTasksCount > 0 ? (
                <Typography variant="caption" display="block" color="text.secondary" component="span">
                  <br />
                  Competent in {competentTasksCount} task{competentTasksCount === 1 ? '' : 's'}
                </Typography>
              ) : null;
            })()}
          </>
        }
      />

      <IconButton
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <MoreVertIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          onAssignShift(carer);
          setAnchorEl(null);
        }}>
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          Assign Shift
        </MenuItem>
      </Menu>
        </ListItem>
      )}
    </Draggable>
  );
};

const CompetencyLegend: React.FC = () => (
  <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
      <Box display="flex" alignItems="center" gap={0.5}>
        <InfoIcon fontSize="small" />
        <Typography variant="caption" fontWeight="bold">Competency:</Typography>
      </Box>
      <Box display="flex" alignItems="center" gap={0.5}>
        <Chip size="small" label="3/5" color="secondary" sx={{ height: '16px', fontSize: '9px' }} />
        <Typography variant="caption">Competent</Typography>
      </Box>
      <Box display="flex" alignItems="center" gap={0.5}>
        <Chip size="small" label="1/5" color="warning" sx={{ height: '16px', fontSize: '9px' }} />
        <Typography variant="caption">Partial</Typography>
      </Box>
      <Box display="flex" alignItems="center" gap={0.5}>
        <Chip size="small" label="0/5" color="default" sx={{ height: '16px', fontSize: '9px' }} />
        <Typography variant="caption">Needs Assessment</Typography>
      </Box>
    </Box>
  </Alert>
);

export const CarerTabs: React.FC<CarerTabsProps> = ({ 
  packageCarers, 
  otherCarers, 
  packageId, 
  weekStart 
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [addShiftDialogOpen, setAddShiftDialogOpen] = useState(false);
  const [selectedCarer, setSelectedCarer] = useState<Carer | null>(null);

  const handleAssignShift = (carer: Carer) => {
    setSelectedCarer(carer);
    setAddShiftDialogOpen(true);
  };

  return (
    <Box>
      <CompetencyLegend />
      
      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
        <Tab 
          label={`Package Carers (${packageCarers.length})`}
          icon={<StarIcon />}
          iconPosition="start"
        />
        <Tab 
          label={`Other Carers (${otherCarers.length})`}
          icon={<PersonIcon />}
          iconPosition="start"
        />
      </Tabs>

      <TabPanel value={selectedTab} index={0}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Carers assigned to this care package with their competency levels
        </Typography>
        {packageCarers.length === 0 ? (
          <Alert severity="info">
            No carers are assigned to this care package. 
            Assign carers from the "Other Carers" tab or manage assignments from the dashboard.
          </Alert>
        ) : (
          <Droppable droppableId="package-carers-source" type="CARER">
            {(provided, snapshot) => (
              <List
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {packageCarers.map((carer, index) => (
                  <CarerCard
                    key={carer.id}
                    carer={carer}
                    index={index}
                    onAssignShift={handleAssignShift}
                  />
                ))}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        )}
      </TabPanel>

      <TabPanel value={selectedTab} index={1}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          All other carers available for shift coverage
        </Typography>
        {otherCarers.length === 0 ? (
          <Alert severity="info">
            All carers are assigned to this package or no other carers are available.
          </Alert>
        ) : (
          <Droppable droppableId="other-carers-source" type="CARER">
            {(provided, snapshot) => (
              <List
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {otherCarers.map((carer, index) => (
                  <CarerCard
                    key={carer.id}
                    carer={carer}
                    index={index}
                    onAssignShift={handleAssignShift}
                  />
                ))}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        )}
      </TabPanel>

      <AddShiftDialog
        open={addShiftDialogOpen}
        onClose={() => {
          setAddShiftDialogOpen(false);
          setSelectedCarer(null);
        }}
        carer={selectedCarer}
        packageId={packageId}
        weekStart={weekStart}
      />
    </Box>
  );
};