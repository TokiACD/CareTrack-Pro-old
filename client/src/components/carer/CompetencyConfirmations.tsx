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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { CarerPageLayout } from '../common/CarerPageLayout';
import { apiService } from '../../services/api';

export enum CompetencyLevel {
  NOT_ASSESSED = 'NOT_ASSESSED',
  NOT_COMPETENT = 'NOT_COMPETENT',
  ADVANCED_BEGINNER = 'ADVANCED_BEGINNER',
  COMPETENT = 'COMPETENT',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT'
}

export enum CompetencySource {
  ASSESSMENT = 'ASSESSMENT',
  MANUAL = 'MANUAL'
}

interface Task {
  id: string;
  name: string;
  description?: string;
  targetCount: number;
}

interface PendingConfirmation {
  id: string;
  carerId: string;
  taskId: string;
  level: CompetencyLevel;
  source: CompetencySource;
  assessmentResponseId?: string;
  setByAdminId?: string;
  setByAdminName?: string;
  setAt: Date;
  notes?: string;
  confirmedAt?: Date;
  confirmedByCarerId?: string;
  confirmationMethod?: string;
  notificationSentAt?: Date;
  task: Task;
}

export const CompetencyConfirmations: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  const [selectedConfirmation, setSelectedConfirmation] = useState<PendingConfirmation | null>(null);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [confirmationMethod, setConfirmationMethod] = useState<string>('SELF_CONFIRMATION');

  // Fetch pending confirmations
  const { data: pendingConfirmations, isLoading } = useQuery({
    queryKey: ['carer-progress', 'pending-confirmations'],
    queryFn: () => apiService.get<PendingConfirmation[]>('/api/carer-progress/pending-confirmations'),
  });

  // Confirm competency mutation
  const confirmCompetencyMutation = useMutation({
    mutationFn: async ({ competencyRatingId, method }: { competencyRatingId: string; method?: string }) => {
      return apiService.post(`/api/carer-progress/confirm/${competencyRatingId}`, {
        confirmationMethod: method || 'SELF_CONFIRMATION'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carer-progress'] });
      showSuccess('Competency confirmation recorded successfully!');
      setConfirmationDialogOpen(false);
      setSelectedConfirmation(null);
      setConfirmationMethod('SELF_CONFIRMATION');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to confirm competency';
      showError(message);
    }
  });

  const handleConfirmCompetency = (confirmation: PendingConfirmation) => {
    setSelectedConfirmation(confirmation);
    setConfirmationDialogOpen(true);
  };

  const handleSubmitConfirmation = () => {
    if (selectedConfirmation) {
      confirmCompetencyMutation.mutate({
        competencyRatingId: selectedConfirmation.id,
        method: confirmationMethod
      });
    }
  };

  const getCompetencyLevelColor = (level: CompetencyLevel) => {
    switch (level) {
      case CompetencyLevel.EXPERT: return '#9c27b0';
      case CompetencyLevel.PROFICIENT: return '#4caf50';
      case CompetencyLevel.COMPETENT: return '#2196f3';
      case CompetencyLevel.ADVANCED_BEGINNER: return '#ff9800';
      case CompetencyLevel.NOT_COMPETENT: return '#f44336';
      case CompetencyLevel.NOT_ASSESSED: return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getCompetencyLevelLabel = (level: CompetencyLevel) => {
    switch (level) {
      case CompetencyLevel.EXPERT: return 'Expert';
      case CompetencyLevel.PROFICIENT: return 'Proficient';
      case CompetencyLevel.COMPETENT: return 'Competent';
      case CompetencyLevel.ADVANCED_BEGINNER: return 'Advanced Beginner';
      case CompetencyLevel.NOT_COMPETENT: return 'Not Competent';
      case CompetencyLevel.NOT_ASSESSED: return 'Not Assessed';
      default: return level;
    }
  };

  const getSourceLabel = (source: CompetencySource) => {
    switch (source) {
      case CompetencySource.ASSESSMENT: return 'Assessment';
      case CompetencySource.MANUAL: return 'Manual Review';
      default: return source;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <CarerPageLayout pageTitle="Competency Confirmations">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography>Loading pending confirmations...</Typography>
        </Container>
      </CarerPageLayout>
    );
  }

  return (
    <CarerPageLayout pageTitle="Competency Confirmations">
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            Competency Confirmations
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Review and confirm your competency assessments and ratings
          </Typography>

          {/* Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={1} sx={{ bgcolor: alpha('#ff9800', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <ScheduleIcon sx={{ color: '#ff9800', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff9800' }}>
                    {pendingConfirmations?.length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pending Confirmations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={1} sx={{ bgcolor: alpha('#4caf50', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#4caf50', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#4caf50' }}>
                    {pendingConfirmations?.filter(c => c.level === CompetencyLevel.COMPETENT || c.level === CompetencyLevel.PROFICIENT || c.level === CompetencyLevel.EXPERT).length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Competent & Above
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={1} sx={{ bgcolor: alpha('#2196f3', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <AssignmentIcon sx={{ color: '#2196f3', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2196f3' }}>
                    {pendingConfirmations?.filter(c => c.source === CompetencySource.ASSESSMENT).length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    From Assessments
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={1} sx={{ bgcolor: alpha('#9c27b0', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <PersonIcon sx={{ color: '#9c27b0', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                    {pendingConfirmations?.filter(c => c.source === CompetencySource.MANUAL).length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Manual Reviews
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Important Information */}
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            What does confirming competency mean?
          </Typography>
          <Typography variant="body2">
            By confirming these competency ratings, you acknowledge that you understand your current skill level and agree with the assessment. This helps maintain accurate records for compliance and ensures you receive appropriate work assignments.
          </Typography>
        </Alert>

        {/* Pending Confirmations */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          ✅ Confirmations Required
        </Typography>

        {!pendingConfirmations || pendingConfirmations.length === 0 ? (
          <Alert severity="success" sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <VerifiedIcon />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  All confirmations up to date!
                </Typography>
                <Typography variant="body2">
                  You have no pending competency confirmations at this time. New assessments will appear here when they need your confirmation.
                </Typography>
              </Box>
            </Box>
          </Alert>
        ) : (
          <Box sx={{ mb: 4 }}>
            {pendingConfirmations.map((confirmation) => (
              <Accordion key={confirmation.id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {confirmation.task.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={getCompetencyLevelLabel(confirmation.level)}
                          size="small"
                          sx={{
                            bgcolor: alpha(getCompetencyLevelColor(confirmation.level), 0.1),
                            color: getCompetencyLevelColor(confirmation.level),
                            fontWeight: 600,
                          }}
                        />
                        <Chip
                          label={getSourceLabel(confirmation.source)}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Assessed on {formatDate(confirmation.setAt)} • Assigned by {confirmation.setByAdminName || 'System'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {confirmation.level === CompetencyLevel.NOT_COMPETENT && (
                        <WarningIcon sx={{ color: '#f44336' }} />
                      )}
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmCompetency(confirmation);
                        }}
                        sx={{
                          bgcolor: '#4caf50',
                          '&:hover': { bgcolor: '#45a049' }
                        }}
                      >
                        Confirm
                      </Button>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                        Task Details
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Task:</strong> {confirmation.task.name}
                      </Typography>
                      {confirmation.task.description && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Description:</strong> {confirmation.task.description}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Target Practice Count:</strong> {confirmation.task.targetCount}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        <strong>Assessment Source:</strong> {getSourceLabel(confirmation.source)}
                      </Typography>
                      
                      {confirmation.notes && (
                        <Box sx={{ bgcolor: alpha('#2196f3', 0.05), p: 2, borderRadius: 1, mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Assessor Notes:
                          </Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            "{confirmation.notes}"
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                        Assessment Information
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Current Level:</strong> {getCompetencyLevelLabel(confirmation.level)}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Assessed Date:</strong> {formatDate(confirmation.setAt)}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Assigned By:</strong> {confirmation.setByAdminName || 'System'}
                      </Typography>
                      
                      {confirmation.level === CompetencyLevel.NOT_COMPETENT && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            This task requires additional practice before you can be considered competent. Please continue practicing and request a re-assessment when ready.
                          </Typography>
                        </Alert>
                      )}
                      
                      {(confirmation.level === CompetencyLevel.COMPETENT || 
                        confirmation.level === CompetencyLevel.PROFICIENT || 
                        confirmation.level === CompetencyLevel.EXPERT) && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            Congratulations! You have been assessed as competent or above for this task. Please confirm to complete your records.
                          </Typography>
                        </Alert>
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmationDialogOpen}
          onClose={() => setConfirmationDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Confirm Competency Rating
            {selectedConfirmation && (
              <Typography variant="subtitle2" color="text.secondary">
                {selectedConfirmation.task.name} - {getCompetencyLevelLabel(selectedConfirmation.level)}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                By confirming this competency rating, you acknowledge that you understand your current skill level and agree with the assessment. This helps maintain accurate records for regulatory compliance.
              </Alert>
              
              <FormControl>
                <FormLabel sx={{ fontWeight: 600, mb: 1 }}>
                  Confirmation Method:
                </FormLabel>
                <RadioGroup
                  value={confirmationMethod}
                  onChange={(e) => setConfirmationMethod(e.target.value)}
                >
                  <FormControlLabel
                    value="SELF_CONFIRMATION"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Self Confirmation
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          I confirm my understanding of this assessment
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="SUPERVISOR_CONFIRMED"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Supervisor Confirmed
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Confirmed with supervisor discussion
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="PEER_REVIEW"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Peer Review
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Discussed with experienced colleague
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
              
              <Divider sx={{ my: 3 }} />
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Important:</strong> Your confirmation is legally binding and will be part of your permanent care record. Only confirm if you truly understand and accept the assessment.
                </Typography>
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitConfirmation}
              variant="contained"
              disabled={confirmCompetencyMutation.isPending}
              startIcon={<CheckCircleIcon />}
              sx={{
                bgcolor: '#4caf50',
                '&:hover': { bgcolor: '#45a049' }
              }}
            >
              {confirmCompetencyMutation.isPending ? 'Confirming...' : 'Confirm Competency'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </CarerPageLayout>
  );
};

export default CompetencyConfirmations;