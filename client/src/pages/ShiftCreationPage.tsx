import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { API_ENDPOINTS } from '@caretrack/shared';

interface LocationState {
  shiftType: 'NON_COMPETENT' | 'COMPETENT';
  isCompetentOnly: boolean;
}

interface CarePackage {
  id: string;
  name: string;
  postcode: string;
  isActive: boolean;
}

interface Task {
  id: string;
  name: string;
  targetCount: number;
  isActive: boolean;
}

interface AvailabilityCarer {
  id: string;
  name: string;
  email: string;
  phone: string;
  availability: {
    isAvailable: boolean;
    conflicts: Array<{
      type: string;
      message: string;
    }>;
    competencyMatch: {
      isCompetent: boolean;
      requiredTasks: string[];
      competentTasks: string[];
      missingCompetencies: string[];
    };
  };
  competencyRatings?: Array<{
    taskId: string;
    level: string;
    task: { name: string };
  }>;
}

interface ShiftFormData {
  packageId: string;
  date: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  requiredCompetencies: string[];
  isCompetentOnly: boolean;
  expiresAt: Date | null;
}

const steps = ['Shift Details', 'Requirements', 'Create Shift', 'Available Carers'];

const ShiftCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  
  const locationState = location.state as LocationState;
  const isCompetentOnly = locationState?.isCompetentOnly || false;
  const shiftType = locationState?.shiftType || 'NON_COMPETENT';

  const [activeStep, setActiveStep] = useState(0);
  const [availabilityPreviewOpen, setAvailabilityPreviewOpen] = useState(false);
  const [selectedCarers, setSelectedCarers] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<ShiftFormData>({
    packageId: '',
    date: null,
    startTime: null,
    endTime: null,
    requiredCompetencies: [],
    isCompetentOnly,
    expiresAt: null
  });

  // Fetch care packages
  const { data: carePackages, isLoading: packagesLoading } = useQuery({
    queryKey: ['care-packages'],
    queryFn: async () => {
      const response = await apiService.get<CarePackage[]>(API_ENDPOINTS.CARE_PACKAGES.LIST);
      return (response as any)?.data || response || [];
    }
  });

  // Fetch tasks (for competent shifts)
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await apiService.get<Task[]>(API_ENDPOINTS.TASKS.LIST);
      return (response as any)?.data || response || [];
    },
    enabled: isCompetentOnly
  });

  // Check availability when form is complete enough
  const {
    data: availability,
    isLoading: availabilityLoading,
    refetch: recheckAvailability
  } = useQuery({
    queryKey: ['availability', formData.packageId, formData.date, formData.startTime, formData.endTime, formData.requiredCompetencies],
    queryFn: async () => {
      if (!formData.packageId || !formData.date || !formData.startTime || !formData.endTime) {
        return null;
      }

      const params = new URLSearchParams({
        packageId: formData.packageId,
        date: formData.date.toISOString(),
        startTime: formatTime(formData.startTime),
        endTime: formatTime(formData.endTime),
        isCompetentOnly: formData.isCompetentOnly.toString()
      });

      if (formData.requiredCompetencies.length > 0) {
        params.append('requiredCompetencies', formData.requiredCompetencies.join(','));
      }

      const response = await apiService.get(`${API_ENDPOINTS.SHIFT_SENDER.CHECK_AVAILABILITY}?${params}`);
      return response?.data || response;
    },
    enabled: Boolean(formData.packageId && formData.date && formData.startTime && formData.endTime)
  });

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiService.post(API_ENDPOINTS.SHIFT_SENDER.CREATE_SHIFT, data);
      return response?.data || response;
    },
    onSuccess: (data) => {
      showSuccess('Shift created successfully');
      setActiveStep(3);
    },
    onError: (error: any) => {
      showError(error?.response?.data?.error || 'Failed to create shift');
    }
  });

  // Send shift mutation
  const sendShiftMutation = useMutation({
    mutationFn: async ({ shiftId, carerIds }: { shiftId: string; carerIds: string[] }) => {
      const response = await apiService.post(
        API_ENDPOINTS.SHIFT_SENDER.SEND_TO_CARERS.replace(':shiftId', shiftId),
        { carerIds, sendEmail: true }
      );
      return response?.data || response;
    },
    onSuccess: (data) => {
      showSuccess(`Shift sent to ${data.sentToCarers} carers successfully`);
      // Invalidate sent shifts query so the new shift appears immediately
      queryClient.invalidateQueries({ queryKey: ['sent-shifts'] });
      // Navigate to shift management page
      navigate('/shift-sender/management');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.error || 'Failed to send shift');
    }
  });

  const formatTime = (date: Date): string => {
    // Use more reliable time formatting to avoid timezone issues
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateTime = (date: Date): string => {
    return date.toISOString();
  };

  const handleNext = () => {
    if (activeStep === 2) {
      // Create shift and send automatically for non-competent shifts
      const shiftData = {
        ...formData,
        date: formatDateTime(formData.date!),
        startTime: formatTime(formData.startTime!),
        endTime: formatTime(formData.endTime!),
        expiresAt: formData.expiresAt ? formatDateTime(formData.expiresAt) : undefined
      };
      createShiftMutation.mutate(shiftData);
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep === 0) {
      navigate('/dashboard');
    } else {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSendShift = () => {
    if (createShiftMutation.data?.shift?.id) {
      let carersToSend: string[];
      
      if (formData.isCompetentOnly) {
        // For competent shifts, send to all competent carers
        carersToSend = getAvailableCarers()
          .filter(carer => carer.availability.competencyMatch.isCompetent)
          .map((carer: any) => carer.id);
      } else {
        // For non-competent shifts, send to all available carers
        carersToSend = getAvailableCarers().map((carer: any) => carer.id);
      }
      
      if (carersToSend.length > 0) {
        sendShiftMutation.mutate({
          shiftId: createShiftMutation.data.shift.id,
          carerIds: carersToSend
        });
      }
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return Boolean(formData.packageId && formData.date && formData.startTime && formData.endTime);
      case 1:
        return !formData.isCompetentOnly || formData.requiredCompetencies.length > 0;
      case 2:
        return Boolean(availability?.availableCarers?.length > 0);
      case 3:
        return Boolean(createShiftMutation.data?.shift?.id);
      default:
        return false;
    }
  };

  const getAvailableCarers = () => {
    if (!availability?.availableCarers) return [];
    return formData.isCompetentOnly 
      ? availability.availableCarers.filter((c: AvailabilityCarer) => c.availability.isAvailable && c.availability.competencyMatch.isCompetent)
      : availability.availableCarers.filter((c: AvailabilityCarer) => c.availability.isAvailable);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Creating a <strong>{shiftType === 'COMPETENT' ? 'Competent' : 'Non-Competent'}</strong> shift.
                This will {isCompetentOnly ? 'only show carers with required competencies' : 'show all available carers with competency information'}.
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <FormLabel>Care Package</FormLabel>
                <Select
                  value={formData.packageId}
                  onChange={(e) => setFormData({...formData, packageId: e.target.value})}
                  disabled={packagesLoading}
                >
                  {carePackages?.map((pkg: CarePackage) => (
                    <MenuItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.postcode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>


            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Shift Date"
                  value={formData.date}
                  onChange={(date) => setFormData({...formData, date})}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Start Time"
                  value={formData.startTime}
                  onChange={(time) => setFormData({...formData, startTime: time})}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="End Time"
                  value={formData.endTime}
                  onChange={(time) => setFormData({...formData, endTime: time})}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Application Deadline (Optional)"
                  value={formData.expiresAt}
                  onChange={(date) => setFormData({...formData, expiresAt: date})}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: "Leave empty for 48-hour default deadline"
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Box>
            {formData.isCompetentOnly ? (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="warning">
                    <strong>Competent Shift:</strong> Select required tasks. Only carers competent in ALL selected tasks will be shown.
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <FormLabel>Required Tasks/Competencies</FormLabel>
                    <Select
                      multiple
                      value={formData.requiredCompetencies}
                      onChange={(e) => setFormData({...formData, requiredCompetencies: e.target.value as string[]})}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((taskId) => {
                            const task = tasks?.find((t: Task) => t.id === taskId);
                            return <Chip key={taskId} label={task?.name || taskId} size="small" />;
                          })}
                        </Box>
                      )}
                      disabled={tasksLoading}
                    >
                      {tasks?.map((task: Task) => (
                        <MenuItem key={task.id} value={task.id}>
                          <Checkbox checked={formData.requiredCompetencies.includes(task.id)} />
                          <ListItemText primary={task.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="info">
                <strong>Non-Competent Shift:</strong> All available carers will be shown with their competency information as "More Info". 
                You can review their skills before selecting who receives the shift.
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            {availabilityLoading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Checking availability...</Typography>
              </Box>
            ) : (
              <>
                <Alert severity="success" sx={{ mb: 3 }}>
                  <strong>{availability?.availableCount || 0}</strong> carers are available for this shift.
                  {formData.isCompetentOnly && (
                    <> <strong>{availability?.competentCount || 0}</strong> meet competency requirements.</>
                  )}
                </Alert>

                <Button
                  variant="outlined"
                  onClick={() => setAvailabilityPreviewOpen(true)}
                  sx={{ mb: 2 }}
                  startIcon={<InfoIcon />}
                >
                  Preview All Carers ({availability?.totalCarers || 0})
                </Button>

                <Typography variant="h6" gutterBottom>
                  Available Carers ({getAvailableCarers().length})
                </Typography>
                
                {!formData.isCompetentOnly && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Non-Competent Shift:</strong> All available carers will automatically receive this shift.
                  </Alert>
                )}
                
                {formData.isCompetentOnly && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Competent Shift:</strong> Only carers meeting competency requirements will automatically receive this shift.
                  </Alert>
                )}
                
                <List>
                  {getAvailableCarers().map((carer: AvailabilityCarer) => (
                    <ListItem key={carer.id} divider>
                      <ListItemText
                        primary={carer.name}
                        secondary={carer.email}
                      />
                      <Box>
                        {carer.availability.competencyMatch.isCompetent ? (
                          <Chip label="Competent - Will Receive Shift" size="small" color="success" />
                        ) : formData.isCompetentOnly ? (
                          <Chip label="Not Competent - Won't Receive" size="small" color="error" />
                        ) : (
                          <Chip label="Training Available - Will Receive" size="small" color="info" />
                        )}
                      </Box>
                    </ListItem>
                  ))}
                </List>

                {formData.isCompetentOnly && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    This shift will be sent to {getAvailableCarers().filter((c: any) => c.availability.competencyMatch.isCompetent).length} competent carers.
                  </Alert>
                )}
                
                {!formData.isCompetentOnly && getAvailableCarers().length > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    This shift will be sent to all {getAvailableCarers().length} available carers.
                  </Alert>
                )}
              </>
            )}
          </Box>
        );

      case 3:
        return (
          <Box textAlign="center">
            {createShiftMutation.isPending ? (
              <Box>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>Creating shift...</Typography>
              </Box>
            ) : createShiftMutation.data ? (
              <Box>
                <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Shift Created Successfully!
                </Typography>
                <Typography variant="body1" paragraph>
                  Your shift has been created and is ready to send to the selected carers.
                </Typography>
                
                <Paper sx={{ p: 2, mb: 3, textAlign: 'left' }}>
                  <Typography variant="h6" gutterBottom>Shift Summary:</Typography>
                  <Typography><strong>Package:</strong> {carePackages?.find((p: CarePackage) => p.id === formData.packageId)?.name}</Typography>
                  <Typography><strong>Date:</strong> {formData.date?.toLocaleDateString()}</Typography>
                  <Typography><strong>Time:</strong> {formatTime(formData.startTime!)} - {formatTime(formData.endTime!)}</Typography>
                  <Typography><strong>Type:</strong> {formData.isCompetentOnly ? 'Competent Only' : 'Non-Competent'}</Typography>
                  <Typography><strong>Carers to Receive Shift:</strong> {formData.isCompetentOnly ? getAvailableCarers().filter((c: any) => c.availability.competencyMatch.isCompetent).length : getAvailableCarers().length}</Typography>
                </Paper>

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSendShift}
                  disabled={sendShiftMutation.isPending}
                  startIcon={sendShiftMutation.isPending ? <CircularProgress size={20} /> : <SendIcon />}
                >
                  {sendShiftMutation.isPending ? 'Sending...' : `Send to ${formData.isCompetentOnly ? getAvailableCarers().filter((c: any) => c.availability.competencyMatch.isCompetent).length : getAvailableCarers().length} Carers`}
                </Button>
              </Box>
            ) : (
              <Typography color="error">Failed to create shift. Please try again.</Typography>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Breadcrumbs sx={{ mb: 2 }}>
            <Link
              component="button"
              variant="body1"
              onClick={() => navigate('/dashboard')}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                textDecoration: 'none',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' }
              }}
            >
              <HomeIcon fontSize="small" />
              Dashboard
            </Link>
            <Link
              component="button"
              variant="body1"
              onClick={() => navigate('/dashboard')}
              sx={{ 
                textDecoration: 'none',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' }
              }}
            >
              Shift Sender
            </Link>
            <Typography color="text.primary">
              Create {shiftType === 'COMPETENT' ? 'Competent' : 'Non-Competent'} Shift
            </Typography>
          </Breadcrumbs>

          <Box display="flex" alignItems="center" gap={2}>
            <Button
              startIcon={<ArrowBack />}
              onClick={handleBack}
              variant="outlined"
              size="small"
            >
              {activeStep === 0 ? 'Back to Dashboard' : 'Previous'}
            </Button>
          </Box>
        </Box>

        {/* Stepper */}
        <Card>
          <CardHeader 
            title="Create Shift"
            subheader={`Step ${activeStep + 1} of ${steps.length}: ${steps[activeStep]}`}
          />
          <CardContent>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel 
                    onClick={() => {
                      // Allow clicking on previous steps or current step
                      if (index <= activeStep) {
                        setActiveStep(index);
                      }
                    }}
                    sx={{ 
                      cursor: index <= activeStep ? 'pointer' : 'default',
                      '&:hover': index <= activeStep ? { backgroundColor: 'action.hover' } : {}
                    }}
                  >
                    {label}
                  </StepLabel>
                  <StepContent>
                    {renderStepContent(index)}
                    
                    <Box sx={{ mb: 2, mt: 3 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        disabled={!isStepValid(index) || createShiftMutation.isPending}
                        startIcon={index === 2 ? <ScheduleIcon /> : undefined}
                      >
                        {index === steps.length - 1 
                          ? 'Send Shift' 
                          : index === 2 
                            ? 'Create Shift' 
                            : 'Continue'}
                      </Button>
                      
                      {index > 0 && (
                        <Button onClick={handleBack} sx={{ ml: 1 }}>
                          Back
                        </Button>
                      )}
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* Availability Preview Dialog */}
        <Dialog
          open={availabilityPreviewOpen}
          onClose={() => setAvailabilityPreviewOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Carer Availability Preview</DialogTitle>
          <DialogContent>
            <List>
              {availability?.availableCarers?.map((carer: AvailabilityCarer) => (
                <ListItem key={carer.id} divider>
                  <ListItemIcon>
                    {carer.availability.isAvailable ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <WarningIcon color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={carer.name}
                    secondary={
                      <Box>
                        <Typography variant="body2">{carer.email}</Typography>
                        {!carer.availability.isAvailable && carer.availability.conflicts.map((conflict, idx) => (
                          <Typography key={idx} variant="caption" color="error" display="block">
                            {conflict.message}
                          </Typography>
                        ))}
                        {carer.availability.competencyMatch && !carer.availability.competencyMatch.isCompetent && (
                          <Typography variant="caption" color="warning" display="block">
                            Missing: {carer.availability.competencyMatch.missingCompetencies.join(', ')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAvailabilityPreviewOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default ShiftCreationPage;