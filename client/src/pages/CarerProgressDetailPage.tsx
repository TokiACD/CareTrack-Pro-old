import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Typography
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { apiService } from '../services/api';
import { isCarerProgressDetail, isAssessmentHistory } from '../utils/typeGuards';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { AdminPageLayout } from '../components/common/AdminPageLayout';
import {
  ProgressPageHeader,
  ProgressSummaryCards,
  PackageProgressTab,
  CompetencyOverviewTab,
  AssessmentHistoryTab
} from '../components/progress';
import { 
  KnowledgeQuestion, 
  PracticalSkill, 
  EmergencyQuestion
} from '@caretrack/shared';

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

// Assessment response with populated assessment and response data for UI display
interface AssessmentResponseWithDetails {
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

// Removed duplicate interfaces - using shared types KnowledgeQuestion, PracticalSkill, EmergencyQuestion

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
  assessments: AssessmentResponseWithDetails[];
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
      const response = await apiService.get(`/api/progress/carer/${carerId}`);
      
      if (isCarerProgressDetail(response)) {
        setProgressData(response);
      } else {
        setError('Invalid progress data received from server');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading progress data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessmentHistory = async () => {
    if (!carerId) return;
    
    try {
      setAssessmentHistoryLoading(true);
      const response = await apiService.get(`/api/progress/carer/${carerId}/assessments`);
      
      if (isAssessmentHistory(response)) {
        setAssessmentHistory(response);
      } else {
        // Fallback for empty or invalid response
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


  if (loading) return <LoadingScreen />;

  if (error || !progressData) {
    return (
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <ProgressPageHeader
          carerName={error ? 'Error' : 'Not Found'}
          onNavigateBack={() => navigate('/progress')}
          onNavigateHome={() => navigate('/dashboard')}
          onNavigateDashboard={() => navigate('/progress')}
          userName={user?.name}
        />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Alert severity={error ? 'error' : 'info'}>
            {error || 'No progress data found for this carer.'}
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <AdminPageLayout 
      pageTitle={`${progressData.carer.name} - Progress Detail`}
      backPath="/progress"
      backText="Back to Progress"
      additionalBreadcrumbs={[
        {
          label: 'Progress Tracking',
          onClick: () => navigate('/progress')
        }
      ]}
    >

      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <ProgressSummaryCards progressData={progressData} />

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
            <PackageProgressTab
              packageData={pkg}
              onManageCompetency={openCompetencyDialog}
              onResetProgress={openResetConfirmDialog}
              carerId={carerId}
            />
          </TabPanel>
        ))}

        {/* All Competencies Tab */}
        <TabPanel value={activeTab} index={progressData.packages.length}>
          <CompetencyOverviewTab competencyRatings={progressData.competencyRatings} />
        </TabPanel>

        {/* Assessment History Tab */}
        <TabPanel value={activeTab} index={progressData.packages.length + 1}>
          <AssessmentHistoryTab
            assessmentHistory={assessmentHistory}
            loading={assessmentHistoryLoading}
            carerId={carerId}
          />
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
          <Box sx={{ mb: 1 }}>
            Are you sure you want to reset progress for:
          </Box>
          <Box sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
            {resetConfirmDialog.taskName}
          </Box>
          <Box sx={{ color: 'text.secondary' }}>
            This will set the completion count back to 0 and reset the completion percentage to 0%.
          </Box>
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
    </AdminPageLayout>
  );
};

export default CarerProgressDetailPage;