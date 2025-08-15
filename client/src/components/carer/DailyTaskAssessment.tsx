import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Collapse,
  Alert,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  TrendingUp as TrendingUpIcon,
  Celebration as CelebrationIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { CarerPageLayout } from '../common/CarerPageLayout';
import { apiService } from '../../services/api';
import { CarerCompetencyProgress } from '@caretrack/shared';

interface TaskLogEntry {
  competencyRatingId: string;
  count: number;
  notes?: string;
  timestamp: Date;
}

interface TaskSession {
  competencyRatingId: string;
  startTime: Date;
  endTime?: Date;
  totalCount: number;
  notes: string;
}

export const DailyTaskAssessment: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<TaskSession | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CarerCompetencyProgress | null>(null);
  const [logCount, setLogCount] = useState<number>(1);
  const [logNotes, setLogNotes] = useState<string>('');
  const [sessionTimer, setSessionTimer] = useState<number>(0);

  // Fetch today's tasks
  const { data: todaysTasks, isLoading } = useQuery({
    queryKey: ['carer-dashboard', 'today-tasks'],
    queryFn: () => apiService.get<CarerCompetencyProgress[]>('/api/carer-dashboard/today-tasks'),
  });

  // Log task completion mutation
  const logTaskMutation = useMutation({
    mutationFn: async (taskLog: TaskLogEntry) => {
      // This would call a task logging endpoint
      return apiService.post('/api/carer-progress/log-task', {
        competencyRatingId: taskLog.competencyRatingId,
        count: taskLog.count,
        notes: taskLog.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['carer-progress'] });
      showNotification('Task logged successfully!', 'success');
      setLogDialogOpen(false);
      setLogCount(1);
      setLogNotes('');
    },
    onError: () => {
      showNotification('Failed to log task. Please try again.', 'error');
    }
  });

  // Timer effect for active sessions
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && !activeSession.endTime) {
      interval = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = (task: CarerCompetencyProgress) => {
    const session: TaskSession = {
      competencyRatingId: task.id,
      startTime: new Date(),
      totalCount: 0,
      notes: ''
    };
    setActiveSession(session);
    setSessionTimer(0);
    showNotification(`Started session for ${task.name}`, 'info');
  };

  const handleEndSession = () => {
    if (activeSession) {
      const updatedSession = {
        ...activeSession,
        endTime: new Date()
      };
      setActiveSession(updatedSession);
      
      // Auto-open log dialog if some work was done
      if (updatedSession.totalCount > 0) {
        const task = todaysTasks?.find(t => t.id === activeSession.competencyRatingId);
        if (task) {
          setSelectedTask(task);
          setLogCount(updatedSession.totalCount);
          setLogNotes(updatedSession.notes);
          setLogDialogOpen(true);
        }
      }
      
      setActiveSession(null);
      setSessionTimer(0);
    }
  };

  const handleLogTask = (task: CarerCompetencyProgress) => {
    setSelectedTask(task);
    setLogDialogOpen(true);
  };

  const handleSubmitLog = () => {
    if (selectedTask) {
      logTaskMutation.mutate({
        competencyRatingId: selectedTask.id,
        count: logCount,
        notes: logNotes,
        timestamp: new Date()
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressColor = (rating: number) => {
    if (rating >= 90) return '#4caf50'; // Green
    if (rating >= 70) return '#ff9800'; // Orange
    if (rating >= 50) return '#2196f3'; // Blue
    return '#f44336'; // Red
  };

  const isTaskActive = (taskId: string) => {
    return activeSession?.competencyRatingId === taskId && !activeSession.endTime;
  };

  if (isLoading) {
    return (
      <CarerPageLayout pageTitle="Daily Task Assessment">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography>Loading your tasks...</Typography>
        </Container>
      </CarerPageLayout>
    );
  }

  return (
    <CarerPageLayout pageTitle="Daily Task Assessment">
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
            Today's Training Tasks
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Log your practice sessions and track your competency progress
          </Typography>

          {/* Active Session Display */}
          {activeSession && (
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleEndSession}
                  startIcon={<StopIcon />}
                >
                  End Session
                </Button>
              }
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimerIcon />
                <Typography variant="body2">
                  Active session: {formatTime(sessionTimer)}
                </Typography>
              </Box>
            </Alert>
          )}
        </Box>

        {/* Tasks List */}
        <Grid container spacing={3}>
          {todaysTasks?.map((task) => (
            <Grid item xs={12} md={6} lg={4} key={task.id}>
              <Card
                elevation={2}
                sx={{
                  height: '100%',
                  position: 'relative',
                  border: isTaskActive(task.id) ? '2px solid #0891b2' : 'none',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[8],
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  {/* Task Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '1.1rem',
                          lineHeight: 1.2,
                          mb: 0.5
                        }}
                      >
                        {task.name}
                      </Typography>
                      {task.assessmentTitle && (
                        <Typography variant="caption" color="text.secondary">
                          {task.assessmentTitle}
                        </Typography>
                      )}
                    </Box>
                    <Chip 
                      label={`${task.rating}%`}
                      size="small"
                      sx={{ 
                        bgcolor: alpha(getProgressColor(task.rating), 0.1),
                        color: getProgressColor(task.rating),
                        fontWeight: 600
                      }}
                    />
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={task.rating}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha(getProgressColor(task.rating), 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getProgressColor(task.rating),
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {task.rating < 100 ? `${100 - task.rating}% to completion` : 'Ready for confirmation'}
                    </Typography>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {!isTaskActive(task.id) && !activeSession ? (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleStartSession(task)}
                        sx={{ 
                          bgcolor: '#0891b2',
                          '&:hover': { bgcolor: '#0e7490' }
                        }}
                      >
                        Start Session
                      </Button>
                    ) : isTaskActive(task.id) ? (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<StopIcon />}
                        onClick={handleEndSession}
                        color="error"
                      >
                        End Session
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        disabled
                        sx={{ opacity: 0.5 }}
                      >
                        Another session active
                      </Button>
                    )}
                    
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleLogTask(task)}
                      disabled={isTaskActive(task.id)}
                    >
                      Log Practice
                    </Button>
                  </Box>

                  {/* Expandable Details */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button
                      size="small"
                      onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                      endIcon={expandedTask === task.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ p: 0, minWidth: 'auto' }}
                    >
                      <Typography variant="caption">
                        {expandedTask === task.id ? 'Less info' : 'More info'}
                      </Typography>
                    </Button>
                    
                    <Collapse in={expandedTask === task.id}>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Last updated: {new Date(task.lastUpdated).toLocaleDateString()}
                        </Typography>
                        {task.rating >= 100 && !task.isConfirmed && (
                          <Alert severity="success" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              🎉 Ready for confirmation! Visit the Progress page to confirm your competency.
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Empty State */}
        {!todaysTasks || todaysTasks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CelebrationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1 }}>
              All caught up!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You've completed all your available training tasks. Great work!
            </Typography>
          </Box>
        ) : null}

        {/* Task Logging Dialog */}
        <Dialog 
          open={logDialogOpen} 
          onClose={() => setLogDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Log Practice Session
            {selectedTask && (
              <Typography variant="subtitle2" color="text.secondary">
                {selectedTask.name}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                label="Number of practices completed"
                type="number"
                value={logCount}
                onChange={(e) => setLogCount(Math.max(1, parseInt(e.target.value) || 1))}
                fullWidth
                InputProps={{ inputProps: { min: 1, max: 50 } }}
                sx={{ mb: 3 }}
              />
              <TextField
                label="Notes (optional)"
                multiline
                rows={3}
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Describe what you practiced, any challenges, improvements noted..."
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitLog}
              variant="contained"
              disabled={logTaskMutation.isPending}
              startIcon={<CheckCircleIcon />}
            >
              {logTaskMutation.isPending ? 'Logging...' : 'Log Practice'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </CarerPageLayout>
  );
};

export default DailyTaskAssessment;