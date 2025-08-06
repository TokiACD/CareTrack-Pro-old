import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  LinearProgress,
  Tooltip,
  Fade,
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
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
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
  Timer as TimerIcon,
  ExpandMore as ExpandMoreIcon,
  NavigateNext as NavigateNextIcon,
  Save as SaveIcon,
  CloudDone as CloudDoneIcon,
  Sync as SyncIcon,
  Error as ErrorIcon,
  Restore as RestoreIcon
} from '@mui/icons-material'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSmartMutation } from '../hooks/useSmartMutation'
import { useAssessmentDraft } from '../hooks/useAssessmentDraft'
import { apiService } from '../services/api'
import { API_ENDPOINTS, CompetencyLevel, PracticalRating, AssessmentDraftData } from '@caretrack/shared'
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
  const location = useLocation()
  const { assessmentId, carerId } = useParams<{ assessmentId: string; carerId: string }>()
  const { user } = useAuth()
  
  // Get responseId from URL query params for edit mode
  const urlParams = new URLSearchParams(location.search)
  const responseId = urlParams.get('responseId')
  
  const [activeStep, setActiveStep] = useState(0)
  const [startTime] = useState(Date.now())
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([])  // Track expanded accordions
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)

  // Check if this is edit mode
  const isEditMode = location.pathname.includes('/edit/')
  
  // Hybrid draft auto-save system
  const {
    draftData,
    saveStatus,
    lastSaved,
    hasUnsavedChanges,
    saveDraftLocal,
    saveDraftToServer,
    deleteDraft,
    loadDraft,
    draftConflict,
    resolveDraftConflict,
    setAutoSaveEnabled,
    triggerServerSync
  } = useAssessmentDraft({
    assessmentId: assessmentId || '',
    carerId: carerId || '',
    enabled: !isEditMode && !!assessmentId && !!carerId
  })
  
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

  // Fetch existing assessment response data in edit mode
  const { data: existingResponseData, isLoading: responseLoading } = useQuery({
    queryKey: ['assessment-response', responseId],
    queryFn: async () => {
      if (!responseId) return null
      const response = await apiService.get(`${API_ENDPOINTS.ASSESSMENTS.LIST}/responses/${responseId}`)
      return response
    },
    enabled: isEditMode && !!responseId
  })

  // Initialize responses when assessment loads
  useEffect(() => {
    if (assessmentData && !draftData) {  // Only initialize if no draft data exists
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
      
      // Initialize first questions for each section
      if (data.knowledgeQuestions?.length > 0) {
        initializeFirstQuestion(data.knowledgeQuestions, 'knowledge')
      }
      if (data.practicalSkills?.length > 0) {
        initializeFirstQuestion(data.practicalSkills, 'practical') 
      }
      if (data.emergencyQuestions?.length > 0) {
        initializeFirstQuestion(data.emergencyQuestions, 'emergency')
      }
    }
  }, [assessmentData, draftData])

  // Load draft data when available (hybrid auto-save) - this takes priority
  useEffect(() => {
    if (draftData && !isEditMode && assessmentData) {
      console.log('Loading draft data:', draftData)  // Debug log
      setFormData({
        carerId: draftData.carerId,
        assessorUniqueId: draftData.assessorUniqueId || '',
        overallRating: draftData.overallRating,
        knowledgeResponses: draftData.knowledgeResponses,
        practicalResponses: draftData.practicalResponses,
        emergencyResponses: draftData.emergencyResponses
      })
      
      // Initialize first questions for accordion after loading draft
      const data = assessmentData as any
      if (data.knowledgeQuestions?.length > 0) {
        initializeFirstQuestion(data.knowledgeQuestions, 'knowledge')
      }
      if (data.practicalSkills?.length > 0) {
        initializeFirstQuestion(data.practicalSkills, 'practical') 
      }
      if (data.emergencyQuestions?.length > 0) {
        initializeFirstQuestion(data.emergencyQuestions, 'emergency')
      }
    }
  }, [draftData, isEditMode, assessmentData])

  // Load existing assessment response data when in edit mode
  useEffect(() => {
    if (existingResponseData && isEditMode && assessmentData) {
      console.log('Loading existing response data for edit:', existingResponseData)
      const responseData = existingResponseData as any
      
      setFormData({
        carerId: responseData.carerId || carerId || '',
        assessorUniqueId: responseData.assessorUniqueId || '',
        overallRating: responseData.overallRating || CompetencyLevel.NOT_ASSESSED,
        knowledgeResponses: responseData.knowledgeResponses?.map((r: any) => ({
          questionId: r.questionId,
          carerAnswer: r.carerAnswer
        })) || [],
        practicalResponses: responseData.practicalResponses?.map((r: any) => ({
          skillId: r.skillId,
          rating: r.rating
        })) || [],
        emergencyResponses: responseData.emergencyResponses?.map((r: any) => ({
          questionId: r.questionId,
          carerAnswer: r.carerAnswer
        })) || []
      })
      
      // Initialize first questions for accordion after loading existing data
      const data = assessmentData as any
      if (data.knowledgeQuestions?.length > 0) {
        initializeFirstQuestion(data.knowledgeQuestions, 'knowledge')
      }
      if (data.practicalSkills?.length > 0) {
        initializeFirstQuestion(data.practicalSkills, 'practical') 
      }
      if (data.emergencyQuestions?.length > 0) {
        initializeFirstQuestion(data.emergencyQuestions, 'emergency')
      }
    }
  }, [existingResponseData, isEditMode, assessmentData, carerId])

  // Submit assessment mutation (handles both create and update)
  const submitAssessmentMutation = useSmartMutation<any, Error, AssessmentFormData>(
    async (data: AssessmentFormData) => {
      if (!assessmentId) throw new Error('Assessment ID is required')
      
      if (isEditMode && responseId) {
        // Update existing assessment response
        return await apiService.put(`${API_ENDPOINTS.ASSESSMENTS.LIST}/responses/${responseId}`, data)
      } else {
        // Create new assessment response
        return await apiService.post(`${API_ENDPOINTS.ASSESSMENTS.LIST}/${assessmentId}/responses`, data)
      }
    },
    {
      mutationType: isEditMode ? 'assessments.updateResponse' : 'assessments.submitResponse',
      customInvalidations: [`carer-progress-${carerId}`, 'assessments', `assessment-response-${responseId}`], 
      onSuccess: () => {
        const duration = Math.round((Date.now() - startTime) / 60000) // minutes
        const message = isEditMode 
          ? 'Assessment updated successfully' 
          : `Assessment completed successfully in ${duration} minutes`
        showNotification(message, 'success')
        setTimeout(() => navigate(`/progress/carer/${carerId}`), 2000)
      },
      onError: (error: any) => {
        const message = isEditMode 
          ? 'Failed to update assessment' 
          : 'Failed to submit assessment'
        showNotification(error.message || message, 'error')
      }
    }
  )

  const handleNext = () => {
    setActiveStep(prev => prev + 1)
    // Trigger server sync when navigating between sections
    if (!isEditMode) {
      triggerServerSync()
    }
  }

  const handleBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const handleStepChange = (step: number) => {
    setActiveStep(step)
    // Trigger server sync when jumping between steps
    if (!isEditMode) {
      triggerServerSync()
    }
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

  const updateKnowledgeResponse = useCallback((questionId: string, answer: string) => {
    setFormData(prev => {
      const newFormData = {
        ...prev,
        knowledgeResponses: prev.knowledgeResponses.map(response =>
          response.questionId === questionId ? { ...response, carerAnswer: answer } : response
        )
      }
      
      // Auto-save to localStorage (immediate)
      if (!isEditMode) {
        const draftData: AssessmentDraftData = {
          carerId: newFormData.carerId,
          assessorUniqueId: newFormData.assessorUniqueId,
          overallRating: newFormData.overallRating,
          knowledgeResponses: newFormData.knowledgeResponses,
          practicalResponses: newFormData.practicalResponses,
          emergencyResponses: newFormData.emergencyResponses
        }
        saveDraftLocal(draftData)
      }
      
      return newFormData
    })
  }, [isEditMode, saveDraftLocal])

  const updatePracticalResponse = useCallback((skillId: string, rating: PracticalRating) => {
    setFormData(prev => {
      const newFormData = {
        ...prev,
        practicalResponses: prev.practicalResponses.map(response =>
          response.skillId === skillId ? { ...response, rating } : response
        )
      }
      
      // Auto-save to localStorage (immediate)
      if (!isEditMode) {
        const draftData: AssessmentDraftData = {
          carerId: newFormData.carerId,
          assessorUniqueId: newFormData.assessorUniqueId,
          overallRating: newFormData.overallRating,
          knowledgeResponses: newFormData.knowledgeResponses,
          practicalResponses: newFormData.practicalResponses,
          emergencyResponses: newFormData.emergencyResponses
        }
        saveDraftLocal(draftData)
      }
      
      return newFormData
    })
  }, [isEditMode, saveDraftLocal])

  const updateEmergencyResponse = useCallback((questionId: string, answer: string) => {
    setFormData(prev => {
      const newFormData = {
        ...prev,
        emergencyResponses: prev.emergencyResponses.map(response =>
          response.questionId === questionId ? { ...response, carerAnswer: answer } : response
        )
      }
      
      // Auto-save to localStorage (immediate)
      if (!isEditMode) {
        const draftData: AssessmentDraftData = {
          carerId: newFormData.carerId,
          assessorUniqueId: newFormData.assessorUniqueId,
          overallRating: newFormData.overallRating,
          knowledgeResponses: newFormData.knowledgeResponses,
          practicalResponses: newFormData.practicalResponses,
          emergencyResponses: newFormData.emergencyResponses
        }
        saveDraftLocal(draftData)
      }
      
      return newFormData
    })
  }, [isEditMode, saveDraftLocal])

  const updateOverallRating = useCallback((rating: CompetencyLevel) => {
    setFormData(prev => {
      const newFormData = { ...prev, overallRating: rating }
      
      // Auto-save to localStorage (immediate)
      if (!isEditMode) {
        const draftData: AssessmentDraftData = {
          carerId: newFormData.carerId,
          assessorUniqueId: newFormData.assessorUniqueId,
          overallRating: newFormData.overallRating,
          knowledgeResponses: newFormData.knowledgeResponses,
          practicalResponses: newFormData.practicalResponses,
          emergencyResponses: newFormData.emergencyResponses
        }
        saveDraftLocal(draftData)
      }
      
      return newFormData
    })
  }, [isEditMode, saveDraftLocal])

  const updateAssessorUniqueId = useCallback((id: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, assessorUniqueId: id }
      
      // Auto-save to localStorage (immediate)
      if (!isEditMode) {
        const draftData: AssessmentDraftData = {
          carerId: newFormData.carerId,
          assessorUniqueId: newFormData.assessorUniqueId,
          overallRating: newFormData.overallRating,
          knowledgeResponses: newFormData.knowledgeResponses,
          practicalResponses: newFormData.practicalResponses,
          emergencyResponses: newFormData.emergencyResponses
        }
        saveDraftLocal(draftData)
      }
      
      return newFormData
    })
  }, [isEditMode, saveDraftLocal])

  // Accordion management functions
  const handleQuestionToggle = (questionId: string) => {
    setExpandedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    )
  }

  const handleQuestionNext = (currentQuestionId: string, nextQuestionId?: string) => {
    // Collapse current question
    setExpandedQuestions(prev => prev.filter(id => id !== currentQuestionId))
    // Expand next question if it exists
    if (nextQuestionId) {
      setExpandedQuestions(prev => [...prev, nextQuestionId])
    }
    
    // Trigger server sync when navigating between questions
    if (!isEditMode) {
      triggerServerSync()
    }
  }

  const initializeFirstQuestion = (questions: any[], section: string) => {
    if (questions.length > 0 && !expandedQuestions.some(id => id.startsWith(section))) {
      setExpandedQuestions(prev => [...prev, `${section}-${questions[0].id}`])
    }
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

  // Save status display helpers
  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving_local':
        return <SaveIcon fontSize="small" sx={{ 
          '@keyframes pulse': {
            '0%': { opacity: 0.5 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.5 }
          },
          animation: 'pulse 1s infinite'
        }} />
      case 'saving_server':
        return <SyncIcon fontSize="small" sx={{ 
          '@keyframes rotate': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
          },
          animation: 'rotate 1s linear infinite'
        }} />
      case 'saved_local':
        return <SaveIcon fontSize="small" color="warning" />
      case 'saved_server':
        return <CloudDoneIcon fontSize="small" color="success" />
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />
      default:
        return hasUnsavedChanges ? <SaveIcon fontSize="small" sx={{ opacity: 0.5 }} /> : null
    }
  }

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving_local':
        return 'Saving...'
      case 'saving_server':
        return 'Syncing...'
      case 'saved_local':
        return 'Saved locally'
      case 'saved_server':
        return 'Saved'
      case 'error':
        return 'Save error'
      default:
        return hasUnsavedChanges ? 'Unsaved changes' : ''
    }
  }

  const getSaveStatusTooltip = () => {
    switch (saveStatus) {
      case 'saving_local':
        return 'Saving draft to local storage...'
      case 'saving_server':
        return 'Syncing draft to server...'
      case 'saved_local':
        return `Saved locally ${lastSaved ? `at ${lastSaved.toLocaleTimeString()}` : ''} - will sync to server automatically`
      case 'saved_server':
        return `Saved to server ${lastSaved ? `at ${lastSaved.toLocaleTimeString()}` : ''}`
      case 'error':
        return 'Failed to save draft. Your progress is saved locally.'
      default:
        return hasUnsavedChanges ? 'You have unsaved changes' : 'All changes saved'
    }
  }

  // Handle draft conflict resolution
  const handleConflictResolution = (action: 'use_local' | 'use_server' | 'merge') => {
    if (draftConflict) {
      resolveDraftConflict(action)
      setConflictDialogOpen(false)
    }
  }

  if (assessmentLoading || carerLoading || (isEditMode && responseLoading)) {
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
            {isEditMode ? 'Edit Assessment:' : 'Assessment:'} {assessment.name}
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            {/* Save Status Display */}
            {!isEditMode && (
              <Tooltip title={getSaveStatusTooltip()} arrow>
                <Fade in={saveStatus !== 'idle' || hasUnsavedChanges}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    gap={0.5}
                    sx={{ 
                      px: 1, 
                      py: 0.5, 
                      borderRadius: 1, 
                      bgcolor: 'rgba(255,255,255,0.1)' 
                    }}
                  >
                    {getSaveStatusIcon()}
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                      {getSaveStatusText()}
                    </Typography>
                  </Box>
                </Fade>
              </Tooltip>
            )}
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
          <Typography color="text.primary">
            {isEditMode ? 'Edit Assessment' : 'Take Assessment'}
          </Typography>
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
                      const questionId = `knowledge-${question.id}`
                      const isExpanded = expandedQuestions.includes(questionId)
                      const isAnswered = response?.carerAnswer?.trim()
                      const nextQuestion = assessment.knowledgeQuestions[index + 1]
                      const nextQuestionId = nextQuestion ? `knowledge-${nextQuestion.id}` : null
                      
                      return (
                        <Accordion 
                          key={question.id} 
                          expanded={isExpanded}
                          onChange={() => handleQuestionToggle(questionId)}
                          elevation={1}
                          sx={{ 
                            mb: 1,
                            '&.Mui-expanded': { 
                              backgroundColor: 'primary.50' 
                            },
                            border: isAnswered ? '2px solid' : '1px solid',
                            borderColor: isAnswered ? 'success.light' : 'divider'
                          }}
                        >
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ 
                              '& .MuiAccordionSummary-content': { alignItems: 'center' },
                              '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
                                transform: 'rotate(180deg)'
                              }
                            }}
                          >
                            <Box sx={{ width: '100%' }}>
                              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                                <Typography variant="h6" component="div">
                                  Question {index + 1}
                                </Typography>
                                {isAnswered && (
                                  <CheckCircleIcon color="success" fontSize="small" />
                                )}
                                <Box sx={{ flexGrow: 1 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {isAnswered ? 'Answered' : 'Not answered'}
                                </Typography>
                              </Box>
                              {!isExpanded && (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ 
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {question.question}
                                </Typography>
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                              {question.question}
                            </Typography>
                            
                            {question.modelAnswer && (
                              <Paper 
                                variant="outlined" 
                                sx={{ 
                                  p: 2, 
                                  mb: 3, 
                                  bgcolor: 'info.50',
                                  borderColor: 'info.200'
                                }}
                              >
                                <Typography variant="subtitle2" color="info.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PsychologyIcon fontSize="small" />
                                  Model Answer (Reference)
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  {question.modelAnswer}
                                </Typography>
                              </Paper>
                            )}
                            
                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              label="Your Answer"
                              value={response?.carerAnswer || ''}
                              onChange={(e) => updateKnowledgeResponse(question.id, e.target.value)}
                              placeholder="Provide your detailed answer here..."
                              sx={{ mb: 3 }}
                            />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" color="text.secondary">
                                Question {index + 1} of {assessment.knowledgeQuestions.length}
                              </Typography>
                              <Box display="flex" gap={1}>
                                {index > 0 && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                      const prevQuestion = assessment.knowledgeQuestions[index - 1]
                                      const prevQuestionId = `knowledge-${prevQuestion.id}`
                                      handleQuestionNext(questionId, prevQuestionId)
                                    }}
                                  >
                                    Previous
                                  </Button>
                                )}
                                {index < assessment.knowledgeQuestions.length - 1 ? (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => handleQuestionNext(questionId, nextQuestionId)}
                                    endIcon={<NavigateNextIcon />}
                                  >
                                    Next Question
                                  </Button>
                                ) : (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => {
                                      handleQuestionToggle(questionId)
                                      // Auto-advance to next section after a brief delay
                                      setTimeout(() => {
                                        handleNext()
                                      }, 300)
                                    }}
                                    color="success"
                                  >
                                    Complete Section
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )
                    })}
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
                      const skillId = `practical-${skill.id}`
                      const isExpanded = expandedQuestions.includes(skillId)
                      const isRated = response?.rating !== undefined
                      const nextSkill = assessment.practicalSkills[index + 1]
                      const nextSkillId = nextSkill ? `practical-${nextSkill.id}` : null
                      
                      return (
                        <Accordion 
                          key={skill.id} 
                          expanded={isExpanded}
                          onChange={() => handleQuestionToggle(skillId)}
                          elevation={1}
                          sx={{ 
                            mb: 1,
                            '&.Mui-expanded': { 
                              backgroundColor: 'primary.50' 
                            },
                            border: isRated ? '2px solid' : '1px solid',
                            borderColor: isRated ? 'success.light' : 'divider'
                          }}
                        >
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ 
                              '& .MuiAccordionSummary-content': { alignItems: 'center' },
                              '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
                                transform: 'rotate(180deg)'
                              }
                            }}
                          >
                            <Box sx={{ width: '100%' }}>
                              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                                <Typography variant="h6" component="div">
                                  Skill {index + 1}
                                </Typography>
                                {isRated && (
                                  <CheckCircleIcon color="success" fontSize="small" />
                                )}
                                <Box sx={{ flexGrow: 1 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {isRated ? `Rated: ${response?.rating}` : 'Not rated'}
                                </Typography>
                              </Box>
                              {!isExpanded && (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ 
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {skill.skillDescription}
                                </Typography>
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
                              {skill.skillDescription}
                            </Typography>
                            
                            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                              <FormLabel component="legend" sx={{ mb: 2, fontWeight: 500 }}>
                                Competency Rating *
                              </FormLabel>
                              <RadioGroup
                                row
                                value={response?.rating || PracticalRating.COMPETENT}
                                onChange={(e) => updatePracticalResponse(skill.id, e.target.value as PracticalRating)}
                                sx={{ gap: 2 }}
                              >
                                <FormControlLabel 
                                  value={PracticalRating.COMPETENT} 
                                  control={<Radio />} 
                                  label={
                                    <Box>
                                      <Typography variant="body2" fontWeight={500}>Competent</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Meets standards
                                      </Typography>
                                    </Box>
                                  }
                                />
                                <FormControlLabel 
                                  value={PracticalRating.NEEDS_SUPPORT} 
                                  control={<Radio />} 
                                  label={
                                    <Box>
                                      <Typography variant="body2" fontWeight={500}>Needs Support</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Requires assistance
                                      </Typography>
                                    </Box>
                                  }
                                />
                                {skill.canBeNotApplicable && (
                                  <FormControlLabel 
                                    value={PracticalRating.NOT_APPLICABLE} 
                                    control={<Radio />} 
                                    label={
                                      <Box>
                                        <Typography variant="body2" fontWeight={500}>Not Applicable</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Not relevant
                                        </Typography>
                                      </Box>
                                    }
                                  />
                                )}
                              </RadioGroup>
                            </FormControl>
                            
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" color="text.secondary">
                                Skill {index + 1} of {assessment.practicalSkills.length}
                              </Typography>
                              <Box display="flex" gap={1}>
                                {index > 0 && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                      const prevSkill = assessment.practicalSkills[index - 1]
                                      const prevSkillId = `practical-${prevSkill.id}`
                                      handleQuestionNext(skillId, prevSkillId)
                                    }}
                                  >
                                    Previous
                                  </Button>
                                )}
                                {index < assessment.practicalSkills.length - 1 ? (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => handleQuestionNext(skillId, nextSkillId)}
                                    endIcon={<NavigateNextIcon />}
                                  >
                                    Next Skill
                                  </Button>
                                ) : (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => {
                                      handleQuestionToggle(skillId)
                                      // Auto-advance to next section after a brief delay
                                      setTimeout(() => {
                                        handleNext()
                                      }, 300)
                                    }}
                                    color="success"
                                  >
                                    Complete Section
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )
                    })}
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
                      const questionId = `emergency-${question.id}`
                      const isExpanded = expandedQuestions.includes(questionId)
                      const isAnswered = response?.carerAnswer?.trim()
                      const nextQuestion = assessment.emergencyQuestions[index + 1]
                      const nextQuestionId = nextQuestion ? `emergency-${nextQuestion.id}` : null
                      
                      return (
                        <Accordion 
                          key={question.id} 
                          expanded={isExpanded}
                          onChange={() => handleQuestionToggle(questionId)}
                          elevation={1}
                          sx={{ 
                            mb: 1,
                            '&.Mui-expanded': { 
                              backgroundColor: 'primary.50' 
                            },
                            border: isAnswered ? '2px solid' : '1px solid',
                            borderColor: isAnswered ? 'success.light' : 'divider'
                          }}
                        >
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ 
                              '& .MuiAccordionSummary-content': { alignItems: 'center' },
                              '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
                                transform: 'rotate(180deg)'
                              }
                            }}
                          >
                            <Box sx={{ width: '100%' }}>
                              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                                <Typography variant="h6" component="div">
                                  Emergency Scenario {index + 1}
                                </Typography>
                                {isAnswered && (
                                  <CheckCircleIcon color="success" fontSize="small" />
                                )}
                                <Box sx={{ flexGrow: 1 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {isAnswered ? 'Answered' : 'Not answered'}
                                </Typography>
                              </Box>
                              {!isExpanded && (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ 
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {question.question}
                                </Typography>
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                              {question.question}
                            </Typography>
                            
                            {question.modelAnswer && (
                              <Paper 
                                variant="outlined" 
                                sx={{ 
                                  p: 2, 
                                  mb: 3, 
                                  bgcolor: 'warning.50',
                                  borderColor: 'warning.200'
                                }}
                              >
                                <Typography variant="subtitle2" color="warning.dark" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <EmergencyIcon fontSize="small" />
                                  Model Emergency Response (Reference)
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  {question.modelAnswer}
                                </Typography>
                              </Paper>
                            )}
                            
                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              label="Emergency Response"
                              value={response?.carerAnswer || ''}
                              onChange={(e) => updateEmergencyResponse(question.id, e.target.value)}
                              placeholder="Describe the carer's response to this emergency scenario..."
                              sx={{ mb: 3 }}
                            />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" color="text.secondary">
                                Scenario {index + 1} of {assessment.emergencyQuestions.length}
                              </Typography>
                              <Box display="flex" gap={1}>
                                {index > 0 && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                      const prevQuestion = assessment.emergencyQuestions[index - 1]
                                      const prevQuestionId = `emergency-${prevQuestion.id}`
                                      handleQuestionNext(questionId, prevQuestionId)
                                    }}
                                  >
                                    Previous
                                  </Button>
                                )}
                                {index < assessment.emergencyQuestions.length - 1 ? (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => handleQuestionNext(questionId, nextQuestionId)}
                                    endIcon={<NavigateNextIcon />}
                                  >
                                    Next Scenario
                                  </Button>
                                ) : (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => {
                                      handleQuestionToggle(questionId)
                                      // Auto-advance to next section after a brief delay
                                      setTimeout(() => {
                                        handleNext()
                                      }, 300)
                                    }}
                                    color="success"
                                  >
                                    Complete Section
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )
                    })}
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
                          onChange={(e) => updateOverallRating(e.target.value as CompetencyLevel)}
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
                        onChange={(e) => updateAssessorUniqueId(e.target.value)}
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
                      {isEditMode ? 'Update Assessment' : 'Submit Assessment'}
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
            {submitAssessmentMutation.isPending 
              ? (isEditMode ? 'Updating...' : 'Submitting...') 
              : (isEditMode ? 'Update Assessment' : 'Submit Assessment')}
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