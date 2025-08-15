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
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Verified as VerifiedIcon,
  PendingActions as PendingIcon,
  CardGiftcard as RewardIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { CarerPageLayout } from '../common/CarerPageLayout';
import { apiService } from '../../services/api';
import { 
  CarerProgressOverview, 
  CarerPendingConfirmation, 
  CarerAchievementsResponse 
} from '@caretrack/shared';

export const PersonalProgressTracker: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [selectedConfirmation, setSelectedConfirmation] = useState<CarerPendingConfirmation | null>(null);

  // Fetch progress overview
  const { data: progressOverview, isLoading: progressLoading } = useQuery({
    queryKey: ['carer-progress', 'overview'],
    queryFn: () => apiService.get<CarerProgressOverview>('/api/carer-progress/overview'),
  });

  // Fetch pending confirmations
  const { data: pendingConfirmations, isLoading: confirmationsLoading } = useQuery({
    queryKey: ['carer-progress', 'pending-confirmations'],
    queryFn: () => apiService.get<CarerPendingConfirmation[]>('/api/carer-progress/pending-confirmations'),
  });

  // Fetch achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['carer-progress', 'achievements'],
    queryFn: () => apiService.get<CarerAchievementsResponse>('/api/carer-progress/achievements'),
  });

  // Confirm competency mutation
  const confirmCompetencyMutation = useMutation({
    mutationFn: async (competencyRatingId: string) => {
      return apiService.post(`/api/carer-progress/confirm/${competencyRatingId}`, {
        confirmationMethod: 'SELF_CONFIRMATION'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carer-progress'] });
      queryClient.invalidateQueries({ queryKey: ['carer-dashboard'] });
      showNotification('Competency confirmed successfully!', 'success');
      setConfirmationDialogOpen(false);
      setSelectedConfirmation(null);
    },
    onError: () => {
      showNotification('Failed to confirm competency. Please try again.', 'error');
    }
  });

  const handleConfirmCompetency = (confirmation: CarerPendingConfirmation) => {
    setSelectedConfirmation(confirmation);
    setConfirmationDialogOpen(true);
  };

  const handleSubmitConfirmation = () => {
    if (selectedConfirmation) {
      confirmCompetencyMutation.mutate(selectedConfirmation.id);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return '#4caf50'; // Green
    if (percentage >= 70) return '#ff9800'; // Orange
    if (percentage >= 50) return '#2196f3'; // Blue
    return '#f44336'; // Red
  };

  const getCategoryColor = (index: number) => {
    const colors = ['#0891b2', '#059669', '#7c3aed', '#dc2626', '#ea580c', '#ca8a04'];
    return colors[index % colors.length];
  };

  if (progressLoading || confirmationsLoading || achievementsLoading) {
    return (
      <CarerPageLayout pageTitle="My Progress">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography>Loading your progress...</Typography>
        </Container>
      </CarerPageLayout>
    );
  }

  return (
    <CarerPageLayout pageTitle="My Progress">
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0891b2 0%, #059669 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            Your Progress Journey
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Track your competency development and celebrate your achievements
          </Typography>

          {/* Overall Progress Summary */}
          {progressOverview && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={2} sx={{ bgcolor: alpha('#0891b2', 0.05) }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 48, color: '#0891b2', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0891b2' }}>
                      {progressOverview.overview.averageProgress}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Overall Progress
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={2} sx={{ bgcolor: alpha('#059669', 0.05) }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: '#059669', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#059669' }}>
                      {progressOverview.overview.completedCompetencies}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={2} sx={{ bgcolor: alpha('#7c3aed', 0.05) }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <VerifiedIcon sx={{ fontSize: 48, color: '#7c3aed', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#7c3aed' }}>
                      {progressOverview.overview.confirmedCompetencies}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confirmed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={2} sx={{ bgcolor: alpha('#ea580c', 0.05) }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <PendingIcon sx={{ fontSize: 48, color: '#ea580c', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#ea580c' }}>
                      {pendingConfirmations?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Confirmation
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>

        {/* Pending Confirmations */}
        {pendingConfirmations && pendingConfirmations.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              🎉 Ready for Confirmation
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              Congratulations! You've completed these competencies and can now confirm them.
            </Alert>
            <Grid container spacing={2}>
              {pendingConfirmations.map((confirmation) => (
                <Grid item xs={12} md={6} key={confirmation.id}>
                  <Card 
                    elevation={3}
                    sx={{ 
                      border: '2px solid #4caf50',
                      bgcolor: alpha('#4caf50', 0.02)
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {confirmation.competencyName}
                          </Typography>
                          {confirmation.assessmentTitle && (
                            <Typography variant="body2" color="text.secondary">
                              {confirmation.assessmentTitle}
                            </Typography>
                          )}
                          <Chip 
                            label={confirmation.category || 'General'}
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        </Box>
                        <Chip 
                          label={`${confirmation.rating}%`}
                          color="success"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        startIcon={<VerifiedIcon />}
                        onClick={() => handleConfirmCompetency(confirmation)}
                      >
                        Confirm Competency
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Progress by Category */}
        {progressOverview && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
              Progress by Category
            </Typography>
            {progressOverview.categories.map((category, index) => (
              <Accordion key={category.category} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {category.category}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {category.completedCount} of {category.totalCount} completed
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 120 }}>
                        <LinearProgress
                          variant="determinate"
                          value={category.averageRating}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha(getCategoryColor(index), 0.1),
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getCategoryColor(index),
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                      <Chip 
                        label={`${category.averageRating}%`}
                        size="small"
                        sx={{ 
                          bgcolor: alpha(getCategoryColor(index), 0.1),
                          color: getCategoryColor(index),
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {category.competencies.map((competency) => (
                      <Grid item xs={12} sm={6} md={4} key={competency.id}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            height: '100%',
                            border: competency.isConfirmed ? '1px solid #4caf50' : undefined,
                            bgcolor: competency.isConfirmed ? alpha('#4caf50', 0.02) : undefined
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                                {competency.name}
                              </Typography>
                              {competency.isConfirmed && (
                                <VerifiedIcon sx={{ color: '#4caf50', fontSize: 20, ml: 1 }} />
                              )}
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={competency.rating}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                mb: 1,
                                bgcolor: alpha(getProgressColor(competency.rating), 0.1),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: getProgressColor(competency.rating),
                                  borderRadius: 3,
                                },
                              }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                {competency.rating}% complete
                              </Typography>
                              {competency.isCompleted && !competency.isConfirmed && (
                                <Chip 
                                  label="Ready" 
                                  size="small" 
                                  color="success"
                                  sx={{ fontSize: '0.7rem', height: 20 }}
                                />
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Achievements Section */}
        {achievements && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
              🏆 Your Achievements
            </Typography>
            <Grid container spacing={3}>
              {achievements.achievements.map((achievement) => (
                <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                  <Card 
                    elevation={achievement.earned ? 3 : 1}
                    sx={{ 
                      height: '100%',
                      opacity: achievement.earned ? 1 : 0.6,
                      border: achievement.earned ? '2px solid #ffd700' : '1px solid #e0e0e0',
                      bgcolor: achievement.earned ? alpha('#ffd700', 0.05) : 'background.paper'
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Typography variant="h2" sx={{ mb: 1 }}>
                        {achievement.icon}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {achievement.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {achievement.description}
                      </Typography>
                      {achievement.earned ? (
                        <Chip 
                          label="Earned!" 
                          color="success" 
                          icon={<TrophyIcon />}
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Box>
                          <LinearProgress
                            variant="determinate"
                            value={(achievement.progress / achievement.target) * 100}
                            sx={{ mb: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {achievement.progress} / {achievement.target}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
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
            Confirm Your Competency
            {selectedConfirmation && (
              <Typography variant="subtitle2" color="text.secondary">
                {selectedConfirmation.competencyName}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                By confirming this competency, you are declaring that you feel confident 
                in this skill and ready to apply it in real care situations.
              </Alert>
              <Typography variant="body1">
                This action will mark your competency as confirmed and may make you eligible 
                for related care shifts.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmationDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitConfirmation}
              variant="contained"
              color="success"
              disabled={confirmCompetencyMutation.isPending}
              startIcon={<VerifiedIcon />}
            >
              {confirmCompetencyMutation.isPending ? 'Confirming...' : 'Confirm Competency'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </CarerPageLayout>
  );
};

export default PersonalProgressTracker;