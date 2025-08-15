import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  InputAdornment,
  Button,
  Grid,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Badge,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { AdminPageLayout } from '../components/common/AdminPageLayout';

// Assessment Workflow - Page 2 of 4 specialized pages
const AssessmentWorkflowPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarer, setSelectedCarer] = useState<any>(null);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);

  // Fetch carers ready for assessment
  const { data: carersReadyData, isLoading: carersLoading } = useQuery({
    queryKey: ['progress', 'carers-ready-for-assessment'],
    queryFn: async () => {
      const response = await apiService.get('/api/progress/ready-for-assessment');
      return response?.data || [];
    }
  });

  // Filter carers based on search
  const filteredCarers = useMemo(() => {
    if (!carersReadyData) return [];
    return carersReadyData.filter((carer: any) =>
      carer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [carersReadyData, searchTerm]);

  const handleStartAssessment = (carer: any) => {
    setSelectedCarer(carer);
    setWorkflowDialogOpen(true);
  };

  const handleProceedToAssessment = () => {
    if (selectedCarer) {
      // Navigate to assessment taking page
      navigate(`/assessments/take`, { 
        state: { 
          carerId: selectedCarer.id,
          carerName: selectedCarer.name,
          fromWorkflow: true
        }
      });
    }
    setWorkflowDialogOpen(false);
  };

  const assessmentSteps = [
    'Task Completion Verification',
    'Knowledge Evaluation',
    'Practical Assessment', 
    'Emergency Response',
    'Final Rating Assignment'
  ];

  return (
    <AdminPageLayout 
      pageTitle="Assessment Workflow"
      backPath="/progress"
      backText="Back to Progress"
      additionalBreadcrumbs={[
        {
          label: 'Progress Management',
          onClick: () => navigate('/progress')
        }
      ]}
    >
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Grid container spacing={3}>
          
          {/* Page Header */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <AssessmentIcon color="primary" />
                    <Typography variant="h5" component="div">
                      Page 2: Assessment Workflow
                    </Typography>
                  </Box>
                }
                subheader="When a carer reaches 100% progress on ALL tasks in an assessment group"
              />
              
              <CardContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Assessment Trigger:</strong> Competency Assessment button appears when carers complete 100% of ALL tasks in an assessment group.
                  </Typography>
                </Alert>

                {/* Assessment Process Steps */}
                <Typography variant="h6" gutterBottom>
                  Assessment Process
                </Typography>
                <Stepper orientation="horizontal" sx={{ mb: 3 }}>
                  {assessmentSteps.map((step, index) => (
                    <Step key={step}>
                      <StepLabel>
                        <Typography variant="caption">{step}</Typography>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          </Grid>

          {/* Carers Ready for Assessment */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="success" />
                    <Typography variant="h6">
                      Carers Ready for Assessment
                    </Typography>
                    <Badge badgeContent={filteredCarers.length} color="warning" />
                  </Box>
                }
                subheader="Carers who have reached 100% completion on all tasks in assessment groups"
              />
              
              <CardContent>
                {/* Search */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    placeholder="Search carers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ maxWidth: 400 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {carersLoading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : filteredCarers.length === 0 ? (
                  <Alert severity="info">
                    {searchTerm 
                      ? 'No carers found matching your search.' 
                      : 'No carers are currently ready for assessment. Carers appear here when they complete 100% of all tasks in an assessment group.'
                    }
                  </Alert>
                ) : (
                  <List>
                    {filteredCarers.map((carer: any) => (
                      <ListItem key={carer.id} divider>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight={500}>
                                {carer.name}
                              </Typography>
                              <Chip 
                                label={`${carer.readyTasks.length} tasks ready`}
                                size="small"
                                color="success"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {carer.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Ready tasks: {carer.readyTasks.map((task: any) => task.taskName).join(', ')}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<StartIcon />}
                            onClick={() => handleStartAssessment(carer)}
                            color="success"
                          >
                            Start Assessment
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Assessment Workflow Dialog */}
        <Dialog open={workflowDialogOpen} onClose={() => setWorkflowDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <AssessmentIcon color="primary" />
              Start Assessment for {selectedCarer?.name}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Assessment Process Overview:
              </Typography>
              <Typography variant="body2" component="div">
                1. <strong>Knowledge Evaluation:</strong> Review carer's answers to knowledge questions<br/>
                2. <strong>Practical Assessment:</strong> Rate hands-on demonstration<br/>
                3. <strong>Emergency Response:</strong> Evaluate crisis management capability<br/>
                4. <strong>Final Rating:</strong> Admin uses professional judgment to assign overall competency level<br/>
                5. <strong>Documentation:</strong> All answers and ratings saved for compliance
              </Typography>
            </Alert>

            {selectedCarer && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Ready Tasks:
                </Typography>
                <List dense>
                  {selectedCarer.readyTasks.map((task: any) => (
                    <ListItem key={task.taskId}>
                      <ListItemText
                        primary={task.taskName}
                        secondary={`${task.packageName} • Completed: ${new Date(task.completedAt).toLocaleDateString()}`}
                      />
                      <Chip 
                        label="100% Complete"
                        size="small"
                        color="success"
                        icon={<CompleteIcon />}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWorkflowDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProceedToAssessment}
              variant="contained"
              startIcon={<StartIcon />}
              color="success"
            >
              Proceed to Assessment
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AdminPageLayout>
  );
};

export default AssessmentWorkflowPage;