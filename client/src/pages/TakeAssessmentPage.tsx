import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Container,
  AppBar,
  Toolbar,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Quiz as QuizIcon,
  Psychology as PsychologyIcon,
  Task as TaskIcon,
  LocalHospital as EmergencyIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Timer as TimerIcon
} from '@mui/icons-material'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSmartMutation } from '../hooks/useSmartMutation'
import { apiService } from '../services/api'
import { API_ENDPOINTS, CompetencyLevel, PracticalRating } from '@caretrack/shared'
import { useAuth } from '../contexts/AuthContext'

interface AssessmentFormData {
  carerId: string
  assessorUniqueId?: string
  overallRating: CompetencyLevel
  knowledgeResponses: KnowledgeResponseData[]
  practicalResponses: PracticalResponseData[]
  emergencyResponses: EmergencyResponseData[]
}

interface KnowledgeResponseData {
  questionId: string
  carerAnswer: string
}

interface PracticalResponseData {
  skillId: string
  rating: PracticalRating
}

interface EmergencyResponseData {
  questionId: string
  carerAnswer: string
}

const TakeAssessmentPage: React.FC = () => {
  const navigate = useNavigate()
  const { assessmentId, carerId } = useParams<{ assessmentId: string; carerId: string }>()
  const { user } = useAuth()
  
  const [activeStep, setActiveStep] = useState(0)
  const [startTime] = useState(Date.now())
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  
  const [formData, setFormData] = useState<AssessmentFormData>({
    carerId: carerId || '',
    assessorUniqueId: '',
    overallRating: CompetencyLevel.NOT_ASSESSED,
    knowledgeResponses: [],
    practicalResponses: [],
    emergencyResponses: []
  })

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({ open: true, message, severity })
  }

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }))
  }

  // Fetch assessment data
  const { data: assessmentData, isLoading: assessmentLoading, error: assessmentError } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return null
      const response = await apiService.get(`${API_ENDPOINTS.ASSESSMENTS.LIST}/${assessmentId}`)
      return response
    },
    enabled: !!assessmentId
  })

  // Fetch carer data
  const { data: carerData, isLoading: carerLoading } = useQuery({
    queryKey: ['carer', carerId],
    queryFn: async () => {
      if (!carerId) return null
      const response = await apiService.get(`${API_ENDPOINTS.CARERS.LIST}/${carerId}`)
      return response
    },
    enabled: !!carerId
  })

  // Initialize responses when assessment loads
  useEffect(() => {
    if (assessmentData) {
      const data = assessmentData as any
      setFormData(prev => ({
        ...prev,
        knowledgeResponses: data.knowledgeQuestions?.map((q: any) => ({
          questionId: q.id,
          carerAnswer: ''
        })) || [],
        practicalResponses: data.practicalSkills?.map((s: any) => ({
          skillId: s.id,
          rating: PracticalRating.COMPETENT
        })) || [],
        emergencyResponses: data.emergencyQuestions?.map((q: any) => ({
          questionId: q.id,
          carerAnswer: ''
        })) || []
      }))
    }
  }, [assessmentData])

  // Submit assessment mutation
  const submitAssessmentMutation = useSmartMutation<any, Error, AssessmentFormData>(
    async (data: AssessmentFormData) => {
      if (!assessmentId) throw new Error('Assessment ID is required')
      return await apiService.post(`${API_ENDPOINTS.ASSESSMENTS.LIST}/${assessmentId}/responses`, data)
    },
    {
      mutationType: 'assessments.submitResponse',
      customInvalidations: [`carer-progress-${carerId}`, 'assessments'], 
      onSuccess: () => {
        const duration = Math.round((Date.now() - startTime) / 60000) // minutes
        showNotification(`Assessment completed successfully in ${duration} minutes`, 'success')
        setTimeout(() => navigate(`/progress/carer/${carerId}`), 2000)
      },
      onError: (error: any) => {
        showNotification(error.message || 'Failed to submit assessment', 'error')
      }
    }
  )

  const handleNext = () => {
    setActiveStep(prev => prev + 1)
  }

  const handleBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const handleStepChange = (step: number) => {
    setActiveStep(step)
  }

  const handleSubmit = () => {
    setConfirmDialogOpen(true)
  }

  const handleConfirmSubmit = () => {
    if (!formData.overallRating || formData.overallRating === CompetencyLevel.NOT_ASSESSED) {
      showNotification('Please select an overall competency rating', 'error')
      setActiveStep(4) // Go to summary step
      setConfirmDialogOpen(false)
      return
    }

    submitAssessmentMutation.mutate(formData)
    setConfirmDialogOpen(false)
  }

  const updateKnowledgeResponse = (questionId: string, answer: string) => {
    setFormData(prev => ({
      ...prev,
      knowledgeResponses: prev.knowledgeResponses.map(response =>
        response.questionId === questionId ? { ...response, carerAnswer: answer } : response
      )
    }))
  }

  const updatePracticalResponse = (skillId: string, rating: PracticalRating) => {
    setFormData(prev => ({
      ...prev,
      practicalResponses: prev.practicalResponses.map(response =>
        response.skillId === skillId ? { ...response, rating } : response
      )
    }))
  }

  const updateEmergencyResponse = (questionId: string, answer: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyResponses: prev.emergencyResponses.map(response =>
        response.questionId === questionId ? { ...response, carerAnswer: answer } : response
      )
    }))
  }

  const getCompletionStats = () => {
    const knowledgeComplete = formData.knowledgeResponses.filter(r => r.carerAnswer.trim()).length
    const practicalComplete = formData.practicalResponses.length // All have default values
    const emergencyComplete = formData.emergencyResponses.filter(r => r.carerAnswer.trim()).length
    
    return {
      knowledge: { complete: knowledgeComplete, total: formData.knowledgeResponses.length },
      practical: { complete: practicalComplete, total: formData.practicalResponses.length },
      emergency: { complete: emergencyComplete, total: formData.emergencyResponses.length }
    }
  }

  if (assessmentLoading || carerLoading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (assessmentError || !assessmentData || !carerData) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load assessment or carer data. Please try again.
        </Alert>
      </Container>
    )
  }

  const assessment = assessmentData as any
  const carer = carerData as any
  const stats = getCompletionStats()
  const totalSections = 4
  const completedSections = activeStep
  const assessmentDuration = Math.round((Date.now() - startTime) / 60000)

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate(`/progress/carer/${carerId}`)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <QuizIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Assessment: {assessment.name}
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <TimerIcon fontSize="small" />
              <Typography variant="body2">{assessmentDuration}m</Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Assessor: {user?.name}
            </Typography>
          </Box>
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
            <AssignmentIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Progress
          </Link>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={() => navigate(`/progress/carer/${carerId}`)}
          >
            <PersonIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            {carer.name}
          </Link>
          <Typography color="text.primary">Take Assessment</Typography>
        </Breadcrumbs>
      </Container>

      {/* Assessment Info Card */}
      <Container maxWidth="lg" sx={{ mb: 3 }}>
        <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" color="primary.main" gutterBottom>
                Assessing: {carer.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Assessment: {assessment.name} • Progress: {completedSections}/{totalSections} sections
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Chip 
                icon={<PsychologyIcon />} 
                label={`${stats.knowledge.complete}/${stats.knowledge.total} Knowledge`} 
                color={stats.knowledge.complete === stats.knowledge.total ? 'success' : 'default'}
                size="small"
              />
              <Chip 
                icon={<TaskIcon />} 
                label={`${stats.practical.complete}/${stats.practical.total} Practical`} 
                color={stats.practical.complete === stats.practical.total ? 'success' : 'default'}
                size="small"
              />
              <Chip 
                icon={<EmergencyIcon />} 
                label={`${stats.emergency.complete}/${stats.emergency.total} Emergency`} 
                color={stats.emergency.complete === stats.emergency.total ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Card elevation={2}>
          <CardContent>
            <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
              {/* Step 1: Knowledge Questions */}
              {assessment.knowledgeQuestions?.length > 0 && (
                <Step>
                  <StepLabel 
                    onClick={() => handleStepChange(0)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <PsychologyIcon />
                      Knowledge Questions ({stats.knowledge.complete}/{stats.knowledge.total})
                    </Box>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Answer the following knowledge-based questions to demonstrate understanding.
                    </Typography>
                    
                    {assessment.knowledgeQuestions.map((question: any, index: number) => {
                      const response = formData.knowledgeResponses.find(r => r.questionId === question.id)
                      return (
                        <Card key={question.id} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Question {index + 1}
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                              {question.question}
                            </Typography>
                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              label="Your Answer"
                              value={response?.carerAnswer || ''}
                              onChange={(e) => updateKnowledgeResponse(question.id, e.target.value)}
                              placeholder="Provide your detailed answer here..."
                            />
                          </CardContent>
                        </Card>
                      )
                    })}
                    
                    <Box sx={{ mb: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Continue
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              )}

              {/* Step 2: Practical Skills */}
              {assessment.practicalSkills?.length > 0 && (
                <Step>
                  <StepLabel 
                    onClick={() => handleStepChange(assessment.knowledgeQuestions?.length > 0 ? 1 : 0)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <TaskIcon />
                      Practical Skills ({stats.practical.complete}/{stats.practical.total})
                    </Box>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Rate the carer's competency for each practical skill demonstrated.
                    </Typography>
                    
                    {assessment.practicalSkills.map((skill: any, index: number) => {
                      const response = formData.practicalResponses.find(r => r.skillId === skill.id)
                      return (
                        <Card key={skill.id} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Skill {index + 1}
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                              {skill.skillDescription}
                            </Typography>
                            
                            <FormControl component="fieldset">
                              <FormLabel component="legend">Competency Rating</FormLabel>
                              <RadioGroup
                                row
                                value={response?.rating || PracticalRating.COMPETENT}
                                onChange={(e) => updatePracticalResponse(skill.id, e.target.value as PracticalRating)}
                              >
                                <FormControlLabel 
                                  value={PracticalRating.COMPETENT} 
                                  control={<Radio />} 
                                  label="Competent" 
                                />
                                <FormControlLabel 
                                  value={PracticalRating.NEEDS_SUPPORT} 
                                  control={<Radio />} 
                                  label="Needs Support" 
                                />
                                {skill.canBeNotApplicable && (
                                  <FormControlLabel 
                                    value={PracticalRating.NOT_APPLICABLE} 
                                    control={<Radio />} 
                                    label="Not Applicable" 
                                  />
                                )}
                              </RadioGroup>
                            </FormControl>
                          </CardContent>
                        </Card>
                      )
                    })}
                    
                    <Box sx={{ mb: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Continue
                      </Button>
                      <Button onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                        Back
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              )}

              {/* Step 3: Emergency Questions */}
              {assessment.emergencyQuestions?.length > 0 && (
                <Step>
                  <StepLabel 
                    onClick={() => {
                      let stepIndex = 0
                      if (assessment.knowledgeQuestions?.length > 0) stepIndex++
                      if (assessment.practicalSkills?.length > 0) stepIndex++
                      handleStepChange(stepIndex)
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <EmergencyIcon />
                      Emergency Scenarios ({stats.emergency.complete}/{stats.emergency.total})
                    </Box>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Describe how the carer would respond to these emergency situations.
                    </Typography>
                    
                    {assessment.emergencyQuestions.map((question: any, index: number) => {
                      const response = formData.emergencyResponses.find(r => r.questionId === question.id)
                      return (
                        <Card key={question.id} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Emergency Scenario {index + 1}
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                              {question.question}
                            </Typography>
                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              label="Emergency Response"
                              value={response?.carerAnswer || ''}
                              onChange={(e) => updateEmergencyResponse(question.id, e.target.value)}
                              placeholder="Describe the carer's response to this emergency scenario..."
                            />
                          </CardContent>
                        </Card>
                      )
                    })}
                    
                    <Box sx={{ mb: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Continue
                      </Button>
                      <Button onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                        Back
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              )}

              {/* Step 4: Summary & Overall Rating */}
              <Step>
                <StepLabel 
                  onClick={() => {
                    let stepIndex = 0
                    if (assessment.knowledgeQuestions?.length > 0) stepIndex++
                    if (assessment.practicalSkills?.length > 0) stepIndex++
                    if (assessment.emergencyQuestions?.length > 0) stepIndex++
                    handleStepChange(stepIndex)
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircleIcon />
                    Assessment Summary & Overall Rating
                  </Box>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Review the assessment and provide an overall competency rating based on the carer's performance.
                  </Typography>

                  {/* Tasks Covered */}
                  <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Tasks Covered by This Assessment
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {assessment.tasksCovered?.map((taskCoverage: any) => (
                          <Chip 
                            key={taskCoverage.taskId}
                            label={taskCoverage.task?.name || 'Task'}
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Overall Rating */}
                  <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Overall Competency Rating *
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select the overall competency level based on the carer's performance across all sections.
                      </Typography>
                      
                      <FormControl component="fieldset" fullWidth>
                        <RadioGroup
                          value={formData.overallRating}
                          onChange={(e) => setFormData(prev => ({ ...prev, overallRating: e.target.value as CompetencyLevel }))}
                        >
                          <FormControlLabel 
                            value={CompetencyLevel.EXPERT} 
                            control={<Radio />} 
                            label={
                              <Box>
                                <Typography variant="body1" fontWeight={500}>Expert</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Advanced practitioner - exceeds all expectations
                                </Typography>
                              </Box>
                            }
                          />
                          <FormControlLabel 
                            value={CompetencyLevel.PROFICIENT} 
                            control={<Radio />} 
                            label={
                              <Box>
                                <Typography variant="body1" fontWeight={500}>Proficient</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Above average performance - consistently reliable
                                </Typography>
                              </Box>
                            }
                          />
                          <FormControlLabel 
                            value={CompetencyLevel.COMPETENT} 
                            control={<Radio />} 
                            label={
                              <Box>
                                <Typography variant="body1" fontWeight={500}>Competent</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Meets all required standards
                                </Typography>
                              </Box>
                            }
                          />
                          <FormControlLabel 
                            value={CompetencyLevel.ADVANCED_BEGINNER} 
                            control={<Radio />} 
                            label={
                              <Box>
                                <Typography variant="body1" fontWeight={500}>Advanced Beginner</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Has basic skills but needs guidance
                                </Typography>
                              </Box>
                            }
                          />
                          <FormControlLabel 
                            value={CompetencyLevel.NOT_COMPETENT} 
                            control={<Radio />} 
                            label={
                              <Box>
                                <Typography variant="body1" fontWeight={500}>Not Competent</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Requires significant training and support
                                </Typography>
                              </Box>
                            }
                          />
                        </RadioGroup>
                      </FormControl>
                    </CardContent>
                  </Card>

                  {/* Assessor Information */}
                  <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Assessor Information
                      </Typography>
                      <TextField
                        fullWidth
                        label="Assessor Unique ID (Optional)"
                        value={formData.assessorUniqueId}
                        onChange={(e) => setFormData(prev => ({ ...prev, assessorUniqueId: e.target.value }))}
                        placeholder="e.g., Trainer ID, Badge Number"
                        sx={{ mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Assessment conducted by: {user?.name} ({user?.email})
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Box sx={{ mb: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      sx={{ mt: 1, mr: 1 }}
                      startIcon={<SendIcon />}
                      disabled={formData.overallRating === CompetencyLevel.NOT_ASSESSED}
                    >
                      Submit Assessment
                    </Button>
                    <Button onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                      Back
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          </CardContent>
        </Card>
      </Container>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Confirm Assessment Submission
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you ready to submit this assessment for <strong>{carer.name}</strong>?
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Assessment Summary:</Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Knowledge Questions" 
                  secondary={`${stats.knowledge.complete}/${stats.knowledge.total} answered`}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Practical Skills" 
                  secondary={`${stats.practical.complete}/${stats.practical.total} rated`}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Emergency Scenarios" 
                  secondary={`${stats.emergency.complete}/${stats.emergency.total} answered`}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Overall Rating" 
                  secondary={formData.overallRating.replace('_', ' ')}
                />
              </ListItem>
            </List>
          </Box>
          
          <Alert severity="info">
            Once submitted, this assessment cannot be modified. The carer's competency ratings will be updated automatically.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            variant="contained"
            disabled={submitAssessmentMutation.isPending}
            startIcon={submitAssessmentMutation.isPending ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {submitAssessmentMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default TakeAssessmentPage