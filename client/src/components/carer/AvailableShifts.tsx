import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { CarerPageLayout } from '../common/CarerPageLayout';
import { apiService } from '../../services/api';

interface Shift {
  id: string;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  status: string;
  expiresAt: Date;
  package: {
    id: string;
    name: string;
    location?: string;
    description?: string;
  };
  requiredCompetencies: Array<{
    id: string;
    name: string;
  }>;
  applications?: Array<{
    id: string;
    carerId: string;
    status: string;
  }>;
}

interface ShiftApplication {
  id: string;
  shiftId: string;
  status: string;
  appliedAt: Date;
  notes?: string;
  shift: Shift;
}

export const AvailableShifts: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [applicationNotes, setApplicationNotes] = useState('');

  // Fetch available shifts
  const { data: availableShifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['carer-shifts', 'available'],
    queryFn: () => apiService.get<Shift[]>('/api/carer-shifts/available'),
  });

  // Fetch carer's applications
  const { data: myApplications, isLoading: applicationsLoading } = useQuery({
    queryKey: ['carer-shifts', 'applications'],
    queryFn: () => apiService.get<ShiftApplication[]>('/api/carer-shifts/applications'),
  });

  // Apply for shift mutation
  const applyForShiftMutation = useMutation({
    mutationFn: async ({ shiftId, notes }: { shiftId: string; notes?: string }) => {
      return apiService.post('/api/carer-shifts/apply', { shiftId, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carer-shifts'] });
      showSuccess('Application submitted successfully!');
      setApplicationDialogOpen(false);
      setSelectedShift(null);
      setApplicationNotes('');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to submit application';
      showError(message);
    }
  });

  const handleApplyForShift = (shift: Shift) => {
    setSelectedShift(shift);
    setApplicationDialogOpen(true);
  };

  const handleSubmitApplication = () => {
    if (selectedShift) {
      applyForShiftMutation.mutate({
        shiftId: selectedShift.id,
        notes: applicationNotes.trim() || undefined
      });
    }
  };

  const hasAppliedForShift = (shiftId: string) => {
    return myApplications?.some(app => app.shiftId === shiftId);
  };

  const getApplicationStatus = (shiftId: string) => {
    const application = myApplications?.find(app => app.shiftId === shiftId);
    return application?.status;
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isShiftExpired = (expiresAt: Date | string) => {
    return new Date(expiresAt) < new Date();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACCEPTED': return '#4caf50';
      case 'DECLINED': return '#f44336';
      case 'PENDING': return '#ff9800';
      default: return '#2196f3';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ACCEPTED': return 'Accepted';
      case 'DECLINED': return 'Declined';
      case 'PENDING': return 'Pending';
      default: return 'Available';
    }
  };

  if (shiftsLoading || applicationsLoading) {
    return (
      <CarerPageLayout pageTitle="Available Shifts">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography>Loading available shifts...</Typography>
        </Container>
      </CarerPageLayout>
    );
  }

  return (
    <CarerPageLayout pageTitle="Available Shifts">
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            Available Shifts
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Browse and apply for care shifts that match your competencies
          </Typography>

          {/* Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card elevation={1} sx={{ bgcolor: alpha('#7c3aed', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <WorkIcon sx={{ color: '#7c3aed', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                    {availableShifts?.length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Available Shifts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={1} sx={{ bgcolor: alpha('#0891b2', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <SendIcon sx={{ color: '#0891b2', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#0891b2' }}>
                    {myApplications?.length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    My Applications
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={1} sx={{ bgcolor: alpha('#059669', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#059669', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#059669' }}>
                    {myApplications?.filter(app => app.status === 'ACCEPTED').length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Accepted
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Available Shifts */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          🕒 Open for Applications
        </Typography>

        {!availableShifts || availableShifts.length === 0 ? (
          <Alert severity="info" sx={{ mb: 4 }}>
            No shifts available at the moment. Check back later for new opportunities!
          </Alert>
        ) : (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {availableShifts.map((shift) => (
              <Grid item xs={12} md={6} lg={4} key={shift.id}>
                <Card
                  elevation={2}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: isShiftExpired(shift.expiresAt) ? 0.6 : 1,
                    border: hasAppliedForShift(shift.id) ? '2px solid #0891b2' : 'none',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[8],
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    {/* Shift Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {shift.package.name}
                        </Typography>
                        {shift.package.location && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {shift.package.location}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      <Chip
                        label={getStatusLabel(getApplicationStatus(shift.id))}
                        size="small"
                        sx={{
                          bgcolor: alpha(getStatusColor(getApplicationStatus(shift.id)), 0.1),
                          color: getStatusColor(getApplicationStatus(shift.id)),
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    {/* Date & Time */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {formatDate(shift.scheduledDate)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Required Competencies */}
                    {shift.requiredCompetencies && shift.requiredCompetencies.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Required Competencies:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {shift.requiredCompetencies.map((competency) => (
                            <Chip
                              key={competency.id}
                              label={competency.name}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Application Deadline */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Apply by: {new Date(shift.expiresAt).toLocaleString()}
                      </Typography>
                    </Box>

                    {/* Action Button */}
                    <Box sx={{ mt: 'auto' }}>
                      {hasAppliedForShift(shift.id) ? (
                        <Button
                          variant="outlined"
                          fullWidth
                          disabled
                          startIcon={<CheckCircleIcon />}
                        >
                          Applied - {getStatusLabel(getApplicationStatus(shift.id))}
                        </Button>
                      ) : isShiftExpired(shift.expiresAt) ? (
                        <Button
                          variant="outlined"
                          fullWidth
                          disabled
                        >
                          Application Deadline Passed
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<SendIcon />}
                          onClick={() => handleApplyForShift(shift)}
                          sx={{
                            bgcolor: '#7c3aed',
                            '&:hover': { bgcolor: '#6d28d9' }
                          }}
                        >
                          Apply for Shift
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* My Applications Section */}
        {myApplications && myApplications.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
              📋 My Applications
            </Typography>
            {myApplications.map((application) => (
              <Accordion key={application.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {application.shift.package.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(application.shift.scheduledDate)} • Applied {new Date(application.appliedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip
                      label={getStatusLabel(application.status)}
                      size="small"
                      sx={{
                        bgcolor: alpha(getStatusColor(application.status), 0.1),
                        color: getStatusColor(application.status),
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Shift Details
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Date:</strong> {formatDate(application.shift.scheduledDate)}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Time:</strong> {formatTime(application.shift.startTime)} - {formatTime(application.shift.endTime)}
                      </Typography>
                      {application.shift.package.location && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Location:</strong> {application.shift.package.location}
                        </Typography>
                      )}
                    </Grid>
                    {application.notes && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          My Application Notes
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          "{application.notes}"
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Application Dialog */}
        <Dialog
          open={applicationDialogOpen}
          onClose={() => setApplicationDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Apply for Shift
            {selectedShift && (
              <Typography variant="subtitle2" color="text.secondary">
                {selectedShift.package.name} • {formatDate(selectedShift.scheduledDate)}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                label="Application Notes (Optional)"
                multiline
                rows={4}
                value={applicationNotes}
                onChange={(e) => setApplicationNotes(e.target.value)}
                placeholder="Why are you interested in this shift? Any relevant experience or availability notes..."
                fullWidth
                sx={{ mb: 2 }}
              />
              <Alert severity="info">
                Your application will be reviewed by the care coordinator. You'll be notified of the decision via email and in your dashboard.
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApplicationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitApplication}
              variant="contained"
              disabled={applyForShiftMutation.isPending}
              startIcon={<SendIcon />}
            >
              {applyForShiftMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </CarerPageLayout>
  );
};

export default AvailableShifts;