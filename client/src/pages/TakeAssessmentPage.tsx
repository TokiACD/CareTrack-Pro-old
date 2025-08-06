import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Box,
  Stepper,
  Step,
  StepLabel,
  Container,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material'
import {
  Psychology as PsychologyIcon,
  Task as TaskIcon,
  LocalHospital as EmergencyIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSmartMutation } from '../hooks/useSmartMutation'
import { useAssessmentDraft } from '../hooks/useAssessmentDraft'
import { apiService } from '../services/api'
import { API_ENDPOINTS, CompetencyLevel, PracticalRating } from '@caretrack/shared'
import { useAuth } from '../contexts/AuthContext'
import {
  AssessmentHeader,
  AssessmentProgressBar,
  KnowledgeQuestionsStep,
  PracticalSkillsStep,
  EmergencyQuestionsStep,
  ReviewStep
} from '../components/assessment'

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
  
  const urlParams = new URLSearchParams(location.search)
  const responseId = urlParams.get('responseId')
  const fromProgress = urlParams.get('from') === 'progress'
  
  const [activeStep, setActiveStep] = useState(0)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([])
  const isEditMode = location.pathname.includes('/edit/')
  
  // Draft management
  const {
    saveStatus,
    lastSaved,
    saveDraftLocal,
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

  // Data fetching
  const { data: assessmentData, isLoading: assessmentLoading, error: assessmentError } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return null
      return await apiService.get(`${API_ENDPOINTS.ASSESSMENTS.LIST}/${assessmentId}`)
    },
    enabled: !!assessmentId
  })

  const { data: carerData, isLoading: carerLoading } = useQuery({
    queryKey: ['carer', carerId],
    queryFn: async () => {
      if (!carerId) return null
      return await apiService.get(`${API_ENDPOINTS.CARERS.LIST}/${carerId}`)
    },
    enabled: !!carerId
  })

  const { data: responseData, isLoading: responseLoading } = useQuery({
    queryKey: ['assessment-response', responseId],
    queryFn: async () => {
      if (!responseId) return null
      return await apiService.get(`${API_ENDPOINTS.ASSESSMENTS.LIST}/responses/${responseId}`)
    },
    enabled: isEditMode && !!responseId
  })

  const assessment = assessmentData as any
  const carer = carerData as any
  const existingResponse = responseData as any

  // Initialize form data when assessment loads (for new assessments)
  useEffect(() => {
    if (assessment && !isEditMode) {
      setFormData(prev => ({
        ...prev,
        knowledgeResponses: assessment.knowledgeQuestions?.map((q: any) => ({
          questionId: q.id,
          carerAnswer: ''
        })) || [],
        practicalResponses: assessment.practicalSkills?.map((s: any) => ({
          skillId: s.id,
          rating: PracticalRating.COMPETENT
        })) || [],
        emergencyResponses: assessment.emergencyQuestions?.map((q: any) => ({
          questionId: q.id,
          carerAnswer: ''
        })) || []
      }))
    }
  }, [assessment, isEditMode])

  // Populate form data with existing response (for edit mode)
  useEffect(() => {
    if (existingResponse && isEditMode && assessment) {
      setFormData({
        carerId: existingResponse.carerId || carerId || '',
        assessorUniqueId: existingResponse.assessorUniqueId || '',
        overallRating: existingResponse.overallRating || CompetencyLevel.NOT_ASSESSED,
        knowledgeResponses: existingResponse.knowledgeResponses || 
          assessment.knowledgeQuestions?.map((q: any) => ({
            questionId: q.id,
            carerAnswer: ''
          })) || [],
        practicalResponses: existingResponse.practicalResponses ||
          assessment.practicalSkills?.map((s: any) => ({
            skillId: s.id,
            rating: PracticalRating.COMPETENT
          })) || [],
        emergencyResponses: existingResponse.emergencyResponses ||
          assessment.emergencyQuestions?.map((q: any) => ({
            questionId: q.id,
            carerAnswer: ''
          })) || []
      })
    }
  }, [existingResponse, isEditMode, assessment, carerId])

  // Calculate progress statistics
  const stats = {
    knowledge: {
      complete: formData.knowledgeResponses.filter(r => r.carerAnswer?.trim()).length,
      total: assessment?.knowledgeQuestions?.length || 0
    },
    practical: {
      complete: formData.practicalResponses.filter(r => r.rating && r.rating !== PracticalRating.COMPETENT).length,
      total: assessment?.practicalSkills?.length || 0
    },
    emergency: {
      complete: formData.emergencyResponses.filter(r => r.carerAnswer?.trim()).length,
      total: assessment?.emergencyQuestions?.length || 0
    }
  }

  const totalSections = 4
  const completedSections = activeStep

  // Submit mutation
  const submitMutation = useSmartMutation(
    async (data: AssessmentFormData) => {
      if (isEditMode && responseId) {
        return await apiService.put(`${API_ENDPOINTS.ASSESSMENTS.LIST}/responses/${responseId}`, data)
      } else {
        return await apiService.post(`${API_ENDPOINTS.ASSESSMENTS.LIST}/${assessmentId}/response`, data)
      }
    },
    {
      mutationType: 'assessments.create',
      onSuccess: () => {
        showNotification(
          isEditMode ? 'Assessment updated successfully!' : 'Assessment submitted successfully!',
          'success'
        )
        setTimeout(() => navigate('/assessments'), 1500)
      },
      onError: (error: any) => {
        showNotification(`Failed to ${isEditMode ? 'update' : 'submit'} assessment: ${error.message}`, 'error')
      }
    }
  )

  // Event handlers
  const handleStepChange = (step: number) => {
    setActiveStep(step)
  }

  const handleKnowledgeResponse = (questionId: string, answer: string) => {
    setFormData(prev => ({
      ...prev,
      knowledgeResponses: prev.knowledgeResponses.map(r =>
        r.questionId === questionId ? { ...r, carerAnswer: answer } : r
      )
    }))
    
    if (!isEditMode) {
      saveDraftLocal({
        ...formData,
        knowledgeResponses: formData.knowledgeResponses.map(r =>
          r.questionId === questionId ? { ...r, carerAnswer: answer } : r
        )
      })
    }
  }

  const handlePracticalResponse = (skillId: string, rating: PracticalRating) => {
    setFormData(prev => ({
      ...prev,
      practicalResponses: prev.practicalResponses.map(r =>
        r.skillId === skillId ? { ...r, rating } : r
      )
    }))
    
    if (!isEditMode) {
      saveDraftLocal({
        ...formData,
        practicalResponses: formData.practicalResponses.map(r =>
          r.skillId === skillId ? { ...r, rating } : r
        )
      })
    }
  }

  const handleEmergencyResponse = (questionId: string, answer: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyResponses: prev.emergencyResponses.map(r =>
        r.questionId === questionId ? { ...r, carerAnswer: answer } : r
      )
    }))
    
    if (!isEditMode) {
      saveDraftLocal({
        ...formData,
        emergencyResponses: formData.emergencyResponses.map(r =>
          r.questionId === questionId ? { ...r, carerAnswer: answer } : r
        )
      })
    }
  }

  const handleToggleExpanded = (questionId: string) => {
    setExpandedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    )
  }

  const handleAutoExpandNext = (currentIndex: number) => {
    const questions = activeStep === 0 
      ? assessment?.knowledgeQuestions 
      : assessment?.emergencyQuestions
    
    if (questions && currentIndex < questions.length - 1) {
      const nextQuestion = questions[currentIndex + 1]
      const nextQuestionId = activeStep === 0 
        ? `knowledge-${nextQuestion.id}` 
        : `emergency-${nextQuestion.id}`
      
      if (!expandedQuestions.includes(nextQuestionId)) {
        setExpandedQuestions(prev => [...prev, nextQuestionId])
      }
    }
  }

  const handleOverallRatingChange = (rating: CompetencyLevel) => {
    setFormData(prev => ({ ...prev, overallRating: rating }))
  }

  const handleSubmit = () => {
    setConfirmDialogOpen(true)
  }

  const confirmSubmit = () => {
    submitMutation.mutate(formData)
    setConfirmDialogOpen(false)
  }

  // Navigation handlers
  const handleNavigateBack = () => navigate(-1)
  const handleNavigateHome = () => navigate('/dashboard')
  const handleNavigateAssessments = () => navigate('/assessments')
  const handleNavigateProgress = () => navigate('/progress')
  const handleNavigateCarerDetail = () => navigate(`/progress/carer/${carerId}`)

  // Loading state
  if (assessmentLoading || carerLoading || responseLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    )
  }

  // Error state
  if (assessmentError || !assessment || !carer) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load assessment data. Please try again.
        </Alert>
      </Container>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <AssessmentHeader
        assessmentName={assessment.name}
        carerName={carer.name}
        onNavigateBack={handleNavigateBack}
        onNavigateHome={handleNavigateHome}
        onNavigateAssessments={handleNavigateAssessments}
        userName={user?.name}
        fromProgress={fromProgress}
        onNavigateProgress={fromProgress ? handleNavigateProgress : undefined}
        onNavigateCarerDetail={fromProgress ? handleNavigateCarerDetail : undefined}
      />

      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <AssessmentProgressBar
          stats={stats}
          totalSections={totalSections}
          completedSections={completedSections}
          isEditMode={isEditMode}
          draftStatus={saveStatus === 'idle' ? undefined : 
            saveStatus === 'saving_local' || saveStatus === 'saving_server' ? 'saving' :
            saveStatus === 'saved_local' || saveStatus === 'saved_server' ? 'saved' :
            saveStatus === 'error' ? 'error' : undefined}
          lastSaved={lastSaved || undefined}
          onSaveDraft={() => triggerServerSync()}
        />

        <Card elevation={2}>
          <CardContent>
            <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
              {/* Knowledge Questions Step */}
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
                  <KnowledgeQuestionsStep
                    questions={assessment.knowledgeQuestions}
                    responses={formData.knowledgeResponses}
                    expandedQuestions={expandedQuestions}
                    onResponseChange={handleKnowledgeResponse}
                    onToggleExpanded={handleToggleExpanded}
                    onAutoExpandNext={handleAutoExpandNext}
                  />
                </Step>
              )}

              {/* Practical Skills Step */}
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
                  <PracticalSkillsStep
                    skills={assessment.practicalSkills}
                    responses={formData.practicalResponses}
                    onResponseChange={handlePracticalResponse}
                  />
                </Step>
              )}

              {/* Emergency Questions Step */}
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
                      Emergency Questions ({stats.emergency.complete}/{stats.emergency.total})
                    </Box>
                  </StepLabel>
                  <EmergencyQuestionsStep
                    questions={assessment.emergencyQuestions}
                    responses={formData.emergencyResponses}
                    expandedQuestions={expandedQuestions}
                    onResponseChange={handleEmergencyResponse}
                    onToggleExpanded={handleToggleExpanded}
                    onAutoExpandNext={handleAutoExpandNext}
                  />
                </Step>
              )}

              {/* Review Step */}
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
                    <AssignmentIcon />
                    Assessment Summary & Overall Rating
                  </Box>
                </StepLabel>
                <ReviewStep
                  tasksCovered={assessment.tasksCovered || []}
                  overallRating={formData.overallRating}
                  onOverallRatingChange={handleOverallRatingChange}
                  onSubmit={handleSubmit}
                  isSubmitting={submitMutation.isPending}
                  isEditMode={isEditMode}
                />
              </Step>
            </Stepper>
          </CardContent>
        </Card>
      </Container>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>
          {isEditMode ? 'Update Assessment' : 'Submit Assessment'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {isEditMode ? 'update' : 'submit'} this assessment? 
            {!isEditMode && ' This action cannot be undone.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmSubmit} variant="contained">
            {isEditMode ? 'Update' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={notification.severity} onClose={() => setNotification(prev => ({ ...prev, open: false }))}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default TakeAssessmentPage