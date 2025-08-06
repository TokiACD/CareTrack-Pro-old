import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Alert,
  Tooltip,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  ArrowBack,
  Refresh,
  Assessment,
  CheckCircle,
  Info,
  Lock,
  CheckCircleOutline,
  Home as HomeIcon,
  TrendingUp as ProgressIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/common/LoadingScreen';

interface CarerProgressDetail {
  carer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    isActive: boolean;
  };
  packages: CarerPackageProgress[];
  competencyRatings: CompetencyRatingDetail[];
}

interface CarerPackageProgress {
  packageId: string;
  packageName: string;
  packagePostcode: string;
  assignedAt: Date;
  tasks: TaskProgressDetail[];
  averageProgress: number;
  competencyRatings: CompetencyRatingDetail[];
}

interface TaskProgressDetail {
  taskId: string;
  taskName: string;
  targetCount: number;
  completionCount: number;
  completionPercentage: number;
  competencyLevel: string;
  competencySource: string;
  lastUpdated?: Date;
  canTakeAssessment: boolean;
  assessmentId?: string;
  assessmentName?: string;
}

interface CompetencyRatingDetail {
  taskId: string;
  taskName: string;
  level: string;
  source: string;
  setAt: Date;
  setByAdminName?: string;
  notes?: string;
}

interface AssessmentResponse {
  id: string;
  completedAt: string;
  overallRating: string;
  assessorUniqueId?: string;
  assessment: {
    id: string;
    name: string;
    knowledgeQuestions: KnowledgeQuestion[];
    practicalSkills: PracticalSkill[];
    emergencyQuestions: EmergencyQuestion[];
    tasksCovered: Array<{
      task: {
        id: string;
        name: string;
      }
    }>;
  };
  assessor: {
    id: string;
    name: string;
  };
  knowledgeResponses: KnowledgeResponseData[];
  practicalResponses: PracticalResponseData[];
  emergencyResponses: EmergencyResponseData[];
}

interface KnowledgeQuestion {
  id: string;
  question: string;
  modelAnswer: string;
  order: number;
}

interface PracticalSkill {
  id: string;
  skillDescription: string;
  canBeNotApplicable: boolean;
  order: number;
}

interface EmergencyQuestion {
  id: string;
  question: string;
  modelAnswer: string;
  order: number;
}

interface KnowledgeResponseData {
  questionId: string;
  carerAnswer: string;
  question: KnowledgeQuestion;
}

interface PracticalResponseData {
  skillId: string;
  rating: string;
  skill: PracticalSkill;
}

interface EmergencyResponseData {
  questionId: string;
  carerAnswer: string;
  question: EmergencyQuestion;
}

interface CarerAssessmentHistory {
  carer: {
    id: string;
    name: string;
    email: string;
  };
  assessments: AssessmentResponse[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`progress-tabpanel-${index}`}
      aria-labelledby={`progress-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `progress-tab-${index}`,
    'aria-controls': `progress-tabpanel-${index}`,
  };
}

const getCompetencyColor = (level: string) => {
  switch (level) {
    case 'EXPERT': return '#2e7d32';
    case 'PROFICIENT': return '#388e3c';
    case 'COMPETENT': return '#4caf50';
    case 'ADVANCED_BEGINNER': return '#ff9800';
    case 'NOT_COMPETENT': return '#f44336';
    case 'NOT_ASSESSED': return '#9e9e9e';
    default: return '#9e9e9e';
  }
};

const getCompetencyLabel = (level: string) => {
  switch (level) {
    case 'EXPERT': return 'Expert';
    case 'PROFICIENT': return 'Proficient';
    case 'COMPETENT': return 'Competent';
    case 'ADVANCED_BEGINNER': return 'Advanced Beginner';
    case 'NOT_COMPETENT': return 'Not Competent';
    case 'NOT_ASSESSED': return 'Not Assessed';
    default: return level;
  }
};

const getProgressColor = (progress: number): 'error' | 'warning' | 'info' | 'success' => {
  if (progress < 25) return 'error';
  if (progress < 50) return 'warning';
  if (progress < 75) return 'info';
  return 'success';
};

const groupTasksByAssessment = (tasks: any[]) => {
  const assessmentGroups = new Map<string, { assessmentName: string; tasks: any[] }>();
  const standaloneTasks: any[] = [];
  
  tasks.forEach(task => {
    if (task.assessmentId && task.assessmentName) {
      if (!assessmentGroups.has(task.assessmentId)) {
        assessmentGroups.set(task.assessmentId, {
          assessmentName: task.assessmentName,
          tasks: []
        });
      }
      assessmentGroups.get(task.assessmentId)!.tasks.push(task);
    } else {
      standaloneTasks.push(task);
    }
  });
  
  return {
    assessmentGroups: Array.from(assessmentGroups.entries()).map(([id, group]) => ({
      assessmentId: id,
      assessmentName: group.assessmentName,
      tasks: group.tasks
    })),
    standaloneTasks
  };
};

const getAssessmentGroupState = (tasks: any[]) => {
  // Check if all tasks in the group are at 100%
  const allTasksComplete = tasks.every(task => task.completionPercentage === 100);
  
  // Check if any task in the group already has a competency rating from assessment
  const hasAssessmentRating = tasks.some(task => 
    task.competencyLevel !== 'NOT_ASSESSED' && task.competencySource === 'ASSESSMENT'
  );
  
  if (hasAssessmentRating) {
    return {
      state: 'completed',
      label: 'Assessment Complete',
      icon: <CheckCircleOutline />,
      color: 'success' as const,
      variant: 'contained' as const,
      description: 'Assessment has been completed'
    };
  } else if (allTasksComplete) {
    return {
      state: 'ready',
      label: 'Take Assessment',
      icon: <Assessment />,
      color: 'primary' as const,
      variant: 'contained' as const,
      description: 'All tasks complete - ready to take assessment'
    };
  } else {
    const completedTasks = tasks.filter(task => task.completionPercentage === 100).length;
    return {
      state: 'locked',
      label: `${completedTasks}/${tasks.length} Complete`,
      icon: <Lock />,
      color: 'inherit' as const,
      variant: 'outlined' as const,
      description: 'Complete all tasks to unlock assessment',
      disabled: true
    };
  }
};

const TaskRow: React.FC<{ task: any; packageData: any; openCompetencyDialog: any; openResetConfirmDialog: any }> = ({ 
  task, 
  packageData, 
  openCompetencyDialog, 
  openResetConfirmDialog 
}) => {
  return (
    <TableRow 
      key={task.taskId}
      sx={{
        backgroundColor: task.assessmentId ? 'rgba(33, 150, 243, 0.02)' : 'inherit',
        '&:hover': {
          backgroundColor: task.assessmentId ? 'rgba(33, 150, 243, 0.06)' : 'rgba(0, 0, 0, 0.04)'
        }
      }}
    >
      <TableCell>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Typography variant="subtitle2">{task.taskName}</Typography>
        </Box>
        {task.lastUpdated && (
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date(task.lastUpdated).toLocaleDateString()}
          </Typography>
        )}
      </TableCell>
      <TableCell align="center">
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={task.completionPercentage} 
            color={getProgressColor(task.completionPercentage)}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary">
            {task.completionPercentage}%
          </Typography>
        </Box>
      </TableCell>
      <TableCell align="center">
        <Box sx={{ minWidth: 140 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LinearProgress
              variant="determinate"
              value={task.completionPercentage}
              color={getProgressColor(task.completionPercentage)}
              sx={{ 
                flexGrow: 1, 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'rgba(0,0,0,0.1)'
              }}
            />
            <Typography variant="caption" fontWeight="medium">
              {task.completionPercentage}%
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mt={0.5}>
            <Typography variant="caption" color="text.secondary">
              {task.completionCount}/{task.targetCount} completed
            </Typography>
            {task.completionPercentage === 100 && (
              <Chip
                size="small"
                label="Complete"
                color="success"
                variant="filled"
                sx={{ fontSize: '0.65rem', height: 18 }}
              />
            )}
          </Box>
        </Box>
      </TableCell>
      <TableCell align="center">
        <Box display="flex" alignItems="center" gap={0.5}>
          <Chip
            label={getCompetencyLabel(task.competencyLevel)}
            size="small"
            sx={{
              backgroundColor: getCompetencyColor(task.competencyLevel),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
          {task.competencySource === 'MANUAL' && (
            <Tooltip title="Manually set by administrator">
              <Info sx={{ fontSize: 16, color: 'info.main' }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell align="center">
        <Box display="flex" alignItems="center" gap={0.5}>
          <IconButton
            size="small"
            onClick={() => openCompetencyDialog(task)}
            title="Set Competency"
          >
            <CheckCircle />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => openResetConfirmDialog(task.taskId, packageData.packageId, task.taskName)}
            title="Reset Progress"
            color="warning"
          >
            <Refresh />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
};

const CarerProgressDetailPage: React.FC = () => {
  const { carerId } = useParams<{ carerId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  const [progressData, setProgressData] = useState<CarerProgressDetail | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<CarerAssessmentHistory | null>(null);
  const [assessmentHistoryLoading, setAssessmentHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Progress update dialog state
  const [updateDialog, setUpdateDialog] = useState<{
    open: boolean;
    taskId?: string;
    packageId?: string;
    currentCount?: number;
    taskName?: string;
  }>({ open: false });
  
  // Competency rating dialog state
  const [competencyDialog, setCompetencyDialog] = useState<{
    open: boolean;
    taskId?: string;
    taskName?: string;
    currentLevel?: string;
  }>({ open: false });

  // Reset confirmation dialog state
  const [resetConfirmDialog, setResetConfirmDialog] = useState<{
    open: boolean;
    taskId?: string;
    packageId?: string;
    taskName?: string;
  }>({ open: false });

  const [newCompletionCount, setNewCompletionCount] = useState<number>(0);
  const [newCompetencyLevel, setNewCompetencyLevel] = useState<string>('');
  const [competencyNotes, setCompetencyNotes] = useState<string>('');

  const fetchProgressData = async () => {
    if (!carerId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching detailed progress for carer:', carerId);
      const response = await apiService.get(`/api/progress/carer/${carerId}`) as any;
      console.log('📊 Detail API response:', response);
      
      // Check if response has success/data structure or is direct data
      if (response.success && response.data) {
        console.log('✅ Setting progress data from response.data:', response.data);
        setProgressData(response.data);
      } else if (response.carer) {
        // Direct data response (no wrapper)
        console.log('✅ Setting progress data directly:', response);
        setProgressData(response);
      } else {
        console.log('❌ API response error:', response);
        setError(response.error || 'Failed to load progress data');
      }
    } catch (err: any) {
      console.log('❌ Fetch error:', err);
      setError(err.message || 'An error occurred while loading progress data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessmentHistory = async () => {
    if (!carerId) return;
    
    try {
      setAssessmentHistoryLoading(true);
      const response = await apiService.get(`/api/progress/carer/${carerId}/assessments`) as any;
      
      // Handle unwrapped response from apiService (which extracts response.data.data)
      if (response && response.carer && Array.isArray(response.assessments)) {
        setAssessmentHistory(response);
      } else if (response && response.success && response.data) {
        setAssessmentHistory(response.data);
      } else {
        setAssessmentHistory({ carer: { id: carerId, name: '', email: '' }, assessments: [] });
      }
    } catch (err: any) {
      setAssessmentHistory({ carer: { id: carerId, name: '', email: '' }, assessments: [] });
    } finally {
      setAssessmentHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressData();
    fetchAssessmentHistory();
  }, [carerId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getSelectedPackageStats = () => {
    if (!progressData) {
      return { completedTasks: 0, totalTasks: 0, packageName: '', percentage: 0 };
    }
    
    // If we're on the "All Competencies" tab (second to last tab) or "Assessment History" tab (last tab)
    if (activeTab >= progressData.packages.length) {
      const allTasks = progressData.packages.flatMap(pkg => pkg.tasks);
      const completedTasks = allTasks.filter(task => task.completionPercentage === 100).length;
      const totalTasks = allTasks.length;
      const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      return {
        completedTasks,
        totalTasks,
        packageName: 'All Packages',
        percentage
      };
    }
    
    // For specific package tabs
    const selectedPackage = progressData.packages[activeTab];
    const completedTasks = selectedPackage.tasks.filter(task => task.completionPercentage === 100).length;
    const totalTasks = selectedPackage.tasks.length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      completedTasks,
      totalTasks,
      packageName: selectedPackage.packageName,
      percentage
    };
  };

  const openCompetencyDialog = (task: TaskProgressDetail) => {
    setCompetencyDialog({
      open: true,
      taskId: task.taskId,
      taskName: task.taskName,
      currentLevel: task.competencyLevel
    });
    setNewCompetencyLevel(task.competencyLevel);
    setCompetencyNotes('');
  };

  const handleUpdateProgress = async () => {
    if (!updateDialog.taskId || !updateDialog.packageId || !carerId) return;

    try {
      await apiService.put('/api/progress/update', {
        carerId,
        taskId: updateDialog.taskId,
        packageId: updateDialog.packageId,
        completionCount: newCompletionCount
      });

      showSuccess('Task progress updated successfully');
      setUpdateDialog({ open: false });
      fetchProgressData();
    } catch (err: any) {
      showError(err.message || 'An error occurred');
    }
  };

  const openResetConfirmDialog = (taskId: string, packageId: string, taskName: string) => {
    setResetConfirmDialog({
      open: true,
      taskId,
      packageId,
      taskName
    });
  };

  const handleResetProgress = async () => {
    if (!carerId || !resetConfirmDialog.taskId || !resetConfirmDialog.packageId) return;

    try {
      await apiService.put('/api/progress/reset', {
        carerId,
        taskId: resetConfirmDialog.taskId,
        packageId: resetConfirmDialog.packageId
      });

      showSuccess('Task progress reset successfully');
      setResetConfirmDialog({ open: false });
      fetchProgressData();
    } catch (err: any) {
      showError(err.message || 'An error occurred');
    }
  };

  const handleUpdateCompetency = async () => {
    if (!competencyDialog.taskId || !carerId) return;

    try {
      await apiService.put('/api/progress/competency', {
        carerId,
        taskId: competencyDialog.taskId,
        level: newCompetencyLevel,
        notes: competencyNotes || undefined
      });

      showSuccess('Competency rating updated successfully');
      setCompetencyDialog({ open: false });
      fetchProgressData();
    } catch (err: any) {
      showError(err.message || 'An error occurred');
    }
  };

  const renderTaskProgressTable = (packageData: CarerPackageProgress) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Task Name</TableCell>
            <TableCell align="center">Progress</TableCell>
            <TableCell align="center">Completion</TableCell>
            <TableCell align="center">Competency</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(() => {
            const { assessmentGroups, standaloneTasks } = groupTasksByAssessment(packageData.tasks);
            
            return (
              <>
                {/* Assessment Groups */}
                {assessmentGroups.map((group) => (
                  <React.Fragment key={group.assessmentId}>
                    {/* Assessment Header Row */}
                    <TableRow>
                      <TableCell 
                        colSpan={5} 
                        sx={{ 
                          backgroundColor: 'rgba(33, 150, 243, 0.1)',
                          borderTop: '2px solid rgba(33, 150, 243, 0.3)',
                          py: 2
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Assessment color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                              Assessment: {group.assessmentName}
                            </Typography>
                            <Chip 
                              label={`${group.tasks.length} tasks`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                          <Box>
                            {(() => {
                              const assessmentState = getAssessmentGroupState(group.tasks);
                              return (
                                <Tooltip title={assessmentState.description}>
                                  <span>
                                    <Button
                                      size="medium"
                                      variant={assessmentState.variant}
                                      color={assessmentState.color}
                                      startIcon={assessmentState.icon}
                                      disabled={assessmentState.disabled}
                                      onClick={() => {
                                        if (assessmentState.state === 'ready') {
                                          // Navigate to take assessment page
                                          navigate(`/assessments/${group.assessmentId}/take/${carerId}`);
                                        }
                                      }}
                                      sx={{ minWidth: 160 }}
                                    >
                                      {assessmentState.label}
                                    </Button>
                                  </span>
                                </Tooltip>
                              );
                            })()}
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Assessment Tasks */}
                    {group.tasks.map((task) => (
                      <TaskRow
                        key={task.taskId}
                        task={task}
                        packageData={packageData}
                        openCompetencyDialog={openCompetencyDialog}
                        openResetConfirmDialog={openResetConfirmDialog}
                      />
                    ))}
                  </React.Fragment>
                ))}
                
                {/* Standalone Tasks */}
                {standaloneTasks.length > 0 && (
                  <>
                    {assessmentGroups.length > 0 && (
                      <TableRow>
                        <TableCell 
                          colSpan={5} 
                          sx={{ 
                            backgroundColor: 'rgba(158, 158, 158, 0.1)',
                            borderTop: '1px solid rgba(158, 158, 158, 0.3)',
                            py: 1
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
                              Individual Tasks
                            </Typography>
                            <Chip 
                              label={`${standaloneTasks.length} tasks`}
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {standaloneTasks.map((task) => (
                      <TaskRow
                        key={task.taskId}
                        task={task}
                        packageData={packageData}
                        openCompetencyDialog={openCompetencyDialog}
                        openResetConfirmDialog={openResetConfirmDialog}
                      />
                    ))}
                  </>
                )}
              </>
            );
          })()}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCompetencyRatingsTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Task Name</TableCell>
            <TableCell align="center">Competency Level</TableCell>
            <TableCell align="center">Source</TableCell>
            <TableCell align="center">Set Date</TableCell>
            <TableCell>Set By</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {progressData?.competencyRatings.map((rating, index) => (
            <TableRow key={index}>
              <TableCell>{rating.taskName}</TableCell>
              <TableCell align="center">
                <Chip
                  label={getCompetencyLabel(rating.level)}
                  size="small"
                  sx={{
                    backgroundColor: getCompetencyColor(rating.level),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={rating.source}
                  size="small"
                  variant="outlined"
                  color={rating.source === 'MANUAL' ? 'primary' : 'default'}
                />
              </TableCell>
              <TableCell align="center">
                {new Date(rating.setAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {rating.setByAdminName || 'System'}
              </TableCell>
              <TableCell>
                {rating.notes || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderAssessmentHistory = () => {
    if (assessmentHistoryLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (!assessmentHistory || assessmentHistory.assessments.length === 0) {
      return (
        <Alert severity="info">
          No assessment responses found for this carer yet.
        </Alert>
      );
    }

    return (
      <Grid container spacing={3}>
        {assessmentHistory.assessments.map((assessment, index) => (
          <Grid item xs={12} key={assessment.id}>
            <Card elevation={2} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {assessment.assessment.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Completed: {new Date(assessment.completedAt).toLocaleDateString('en-GB')} at {new Date(assessment.completedAt).toLocaleTimeString('en-GB')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Assessor: {assessment.assessor.name}
                    </Typography>
                    {assessment.assessorUniqueId && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Assessor ID: {assessment.assessorUniqueId}
                      </Typography>
                    )}
                  </Box>
                  <Box display="flex" flexDirection="column" alignItems="end" gap={1}>
                    <Chip
                      label={assessment.overallRating.replace('_', ' ')}
                      size="medium"
                      sx={{
                        backgroundColor: getCompetencyColor(assessment.overallRating),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Assessment />}
                      onClick={() => navigate(`/assessments/${assessment.assessment.id}/edit/${carerId}?responseId=${assessment.id}`)}
                    >
                      Review & Edit
                    </Button>
                  </Box>
                </Box>

                {/* Tasks Covered */}
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Tasks Covered:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {assessment.assessment.tasksCovered.map((taskCoverage) => (
                      <Chip 
                        key={taskCoverage.task.id}
                        label={taskCoverage.task.name}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                </Box>

                {/* Response Summary */}
                <Grid container spacing={2}>
                  {assessment.knowledgeResponses.length > 0 && (
                    <Grid item xs={12} sm={4}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.50' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'info.main' }}>
                          Knowledge Questions
                        </Typography>
                        <Typography variant="body2">
                          {assessment.knowledgeResponses.filter(r => r.carerAnswer.trim()).length} / {assessment.knowledgeResponses.length} answered
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  {assessment.practicalResponses.length > 0 && (
                    <Grid item xs={12} sm={4}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.50' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'success.main' }}>
                          Practical Skills
                        </Typography>
                        <Typography variant="body2">
                          {assessment.practicalResponses.length} skills assessed
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  {assessment.emergencyResponses.length > 0 && (
                    <Grid item xs={12} sm={4}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.50' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'warning.main' }}>
                          Emergency Scenarios
                        </Typography>
                        <Typography variant="body2">
                          {assessment.emergencyResponses.filter(r => r.carerAnswer.trim()).length} / {assessment.emergencyResponses.length} answered
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => navigate('/progress')}
              sx={{ mr: 2 }}
            >
              <ArrowBack />
            </IconButton>
            <PersonIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Progress Detail - Error
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, ml: 2 }}>
              Welcome, {user?.name}
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (!progressData) {
    return (
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => navigate('/progress')}
              sx={{ mr: 2 }}
            >
              <ArrowBack />
            </IconButton>
            <PersonIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Progress Detail - Not Found
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, ml: 2 }}>
              Welcome, {user?.name}
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="info">No progress data found for this carer.</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/progress')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <PersonIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {progressData.carer.name} - Progress Detail
          </Typography>
          <Button
            color="inherit"
            startIcon={<Refresh />}
            onClick={fetchProgressData}
            sx={{ ml: 2 }}
          >
            Refresh
          </Button>
          <Typography variant="body2" sx={{ opacity: 0.9, ml: 2 }}>
            Welcome, {user?.name}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Breadcrumbs */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={() => navigate('/dashboard')}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboard
          </Link>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={() => navigate('/progress')}
          >
            <ProgressIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Progress
          </Link>
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            <PersonIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            {progressData.carer.name}
          </Typography>
        </Breadcrumbs>
      </Container>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ pb: 4 }}>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                Care Packages
              </Typography>
              <Typography variant="h4">
                {progressData.packages.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', py: 2 }}>
              <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                Tasks Completed
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                <Typography variant="h4">
                  {(() => {
                    const stats = getSelectedPackageStats();
                    return `${stats.completedTasks}/${stats.totalTasks}`;
                  })()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({getSelectedPackageStats().percentage}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getSelectedPackageStats().percentage}
                color={getProgressColor(getSelectedPackageStats().percentage)}
                sx={{ height: 4, borderRadius: 2, mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {getSelectedPackageStats().packageName}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                Competency Ratings
              </Typography>
              <Typography variant="h4">
                {progressData.competencyRatings.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="progress tabs">
            {progressData.packages.map((pkg, index) => (
              <Tab
                key={pkg.packageId}
                label={`${pkg.packageName} (${pkg.packagePostcode})`}
                {...a11yProps(index)}
              />
            ))}
            <Tab label="All Competencies" {...a11yProps(progressData.packages.length)} />
            <Tab label="Assessment History" {...a11yProps(progressData.packages.length + 1)} />
          </Tabs>
        </Box>

        {/* Package Progress Tabs */}
        {progressData.packages.map((pkg, index) => (
          <TabPanel key={pkg.packageId} value={activeTab} index={index}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {pkg.packageName} ({pkg.packagePostcode})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Assigned: {new Date(pkg.assignedAt).toLocaleDateString()} • 
                Average Progress: {pkg.averageProgress}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={pkg.averageProgress}
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
            </Box>
            {renderTaskProgressTable(pkg)}
          </TabPanel>
        ))}

        {/* All Competencies Tab */}
        <TabPanel value={activeTab} index={progressData.packages.length}>
          <Typography variant="h6" gutterBottom>
            All Competency Ratings
          </Typography>
          {progressData.competencyRatings.length > 0 ? (
            renderCompetencyRatingsTable()
          ) : (
            <Alert severity="info">
              No competency ratings have been set for this carer yet.
            </Alert>
          )}
        </TabPanel>

        {/* Assessment History Tab */}
        <TabPanel value={activeTab} index={progressData.packages.length + 1}>
          <Typography variant="h6" gutterBottom>
            Assessment History
          </Typography>
          {renderAssessmentHistory()}
        </TabPanel>
      </Paper>

      {/* Update Progress Dialog */}
      <Dialog open={updateDialog.open} onClose={() => setUpdateDialog({ open: false })}>
        <DialogTitle>Update Task Progress</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Task: {updateDialog.taskName}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Completion Count"
            type="number"
            fullWidth
            variant="outlined"
            value={newCompletionCount}
            onChange={(e) => setNewCompletionCount(parseInt(e.target.value) || 0)}
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleUpdateProgress} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Progress Confirmation Dialog */}
      <Dialog 
        open={resetConfirmDialog.open} 
        onClose={() => setResetConfirmDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Refresh color="warning" />
          Reset Task Progress
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All progress for this task will be permanently reset to 0.
          </Alert>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Are you sure you want to reset progress for:
          </Typography>
          <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
            {resetConfirmDialog.taskName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will set the completion count back to 0 and reset the completion percentage to 0%.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setResetConfirmDialog({ open: false })}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleResetProgress} 
            variant="contained"
            color="warning"
            startIcon={<Refresh />}
          >
            Reset Progress
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Competency Dialog */}
      <Dialog open={competencyDialog.open} onClose={() => setCompetencyDialog({ open: false })}>
        <DialogTitle>Set Manual Competency Rating</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Task: {competencyDialog.taskName}
          </Typography>
          <FormControl fullWidth margin="dense">
            <InputLabel>Competency Level</InputLabel>
            <Select
              value={newCompetencyLevel}
              label="Competency Level"
              onChange={(e) => setNewCompetencyLevel(e.target.value)}
            >
              <MenuItem value="NOT_ASSESSED">Not Assessed</MenuItem>
              <MenuItem value="NOT_COMPETENT">Not Competent</MenuItem>
              <MenuItem value="ADVANCED_BEGINNER">Advanced Beginner</MenuItem>
              <MenuItem value="COMPETENT">Competent</MenuItem>
              <MenuItem value="PROFICIENT">Proficient</MenuItem>
              <MenuItem value="EXPERT">Expert</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Notes (Optional)"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={competencyNotes}
            onChange={(e) => setCompetencyNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompetencyDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleUpdateCompetency} variant="contained">
            Set Rating
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default CarerProgressDetailPage;