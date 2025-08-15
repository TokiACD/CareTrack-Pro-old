import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  IconButton,
  Container,
  AppBar,
  Toolbar,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  FormControlLabel,
  Checkbox,
  Divider,
  Switch,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Quiz as QuizIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Psychology as PsychologyIcon,
  Task as TaskIcon,
  LocalHospital as EmergencyIcon,
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSmartMutation } from '../hooks/useSmartMutation'
import { apiService } from '../services/api'
import { API_ENDPOINTS, Task } from '@caretrack/shared'
import { useAuth } from '../contexts/AuthContext'
import { AdminPageLayout } from '../components/common/AdminPageLayout'

interface KnowledgeQuestion {
  question: string
  modelAnswer: string
  order: number
}

interface PracticalSkill {
  skillDescription: string
  canBeNotApplicable: boolean
  order: number
}

interface EmergencyQuestion {
  question: string
  modelAnswer: string
  order: number
}

interface AssessmentFormData {
  name: string
  isActive: boolean
  knowledgeQuestions: KnowledgeQuestion[]
  practicalSkills: PracticalSkill[]
  emergencyQuestions: EmergencyQuestion[]
  tasksCovered: string[]
}

// Task item component with visual indicators
const TaskItem: React.FC<{
  task: Task
  isSelected: boolean
  isCovered: boolean
  onToggle: (taskId: string) => void
  onWarningClick?: () => void
}> = ({ task, isSelected, isCovered, onToggle, onWarningClick }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      p: 1.5, 
      borderRadius: 1, 
      '&:hover': { bgcolor: 'action.hover' },
      mb: 0.5,
      opacity: isCovered ? 0.7 : 1
    }}>
      <Checkbox
        checked={isSelected}
        onChange={() => {
          if (isCovered && !isSelected && onWarningClick) {
            onWarningClick()
          } else {
            onToggle(task.id)
          }
        }}
        sx={{ mt: -0.5, mr: 1 }}
      />
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
          <Typography variant="body2" fontWeight={500}>
            {task.name}
          </Typography>
          {isCovered && (
            <Chip 
              icon={<CheckCircleIcon />}
              label="Already Covered" 
              size="small" 
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Target: {task.targetCount} completions
        </Typography>
      </Box>
    </Box>
  )
}

const EditAssessmentPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  
  const [activeStep, setActiveStep] = useState(0)
  const [taskSearchTerm, setTaskSearchTerm] = useState('')
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [taskToWarning, setTaskToWarning] = useState<Task | null>(null)
  const [formData, setFormData] = useState<AssessmentFormData>({
    name: '',
    isActive: true,
    knowledgeQuestions: [],
    practicalSkills: [],
    emergencyQuestions: [],
    tasksCovered: []
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
    queryKey: ['assessment', id],
    queryFn: async () => {
      if (!id) return null
      const response = await apiService.get(`${API_ENDPOINTS.ASSESSMENTS.LIST}/${id}`)
      return response
    },
    enabled: !!id
  })

  // Fetch available tasks
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await apiService.get(API_ENDPOINTS.TASKS.LIST)
      return response || []
    }
  })

  // Fetch all assessments to check task coverage
  const { data: assessmentsData } = useQuery({
    queryKey: ['assessments-for-task-coverage'],
    queryFn: async () => {
      const response = await apiService.get(API_ENDPOINTS.ASSESSMENTS.LIST)
      return response || []
    }
  })

  // Update form data when assessment loads
  useEffect(() => {
    if (assessmentData) {
      const data = assessmentData as any
      setFormData({
        name: data.name || '',
        isActive: data.isActive ?? true,
        knowledgeQuestions: data.knowledgeQuestions?.map((q: any) => ({
          question: q.question,
          modelAnswer: q.modelAnswer,
          order: q.order
        })) || [],
        practicalSkills: data.practicalSkills?.map((s: any) => ({
          skillDescription: s.skillDescription,
          canBeNotApplicable: s.canBeNotApplicable,
          order: s.order
        })) || [],
        emergencyQuestions: data.emergencyQuestions?.map((q: any) => ({
          question: q.question,
          modelAnswer: q.modelAnswer,
          order: q.order
        })) || [],
        tasksCovered: data.tasksCovered?.map((tc: any) => tc.taskId) || []
      })
    }
  }, [assessmentData])

  // Update assessment mutation
  const updateAssessmentMutation = useSmartMutation<any, Error, AssessmentFormData>(
    async (data: AssessmentFormData) => {
      if (!id) throw new Error('Assessment ID is required')
      return await apiService.patch(`${API_ENDPOINTS.ASSESSMENTS.UPDATE}/${id}`, data)
    },
    {
      mutationType: 'assessments.update',
      customInvalidations: [`assessment-${id}`], // Invalidate specific assessment
      onSuccess: () => {
        showNotification('Assessment updated successfully', 'success')
        setTimeout(() => navigate('/assessments'), 1500)
      },
      onError: (error: any) => {
        showNotification(error.message || 'Failed to update assessment', 'error')
      }
    }
  )

  const handleNext = () => {
    setActiveStep(prev => prev + 1)
  }

  const handleBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showNotification('Assessment name is required', 'error')
      setActiveStep(0)
      return
    }

    updateAssessmentMutation.mutate(formData)
  }

  // Knowledge Questions handlers
  const addKnowledgeQuestion = () => {
    setFormData(prev => ({
      ...prev,
      knowledgeQuestions: [
        ...prev.knowledgeQuestions,
        { question: '', modelAnswer: '', order: prev.knowledgeQuestions.length + 1 }
      ]
    }))
  }

  const updateKnowledgeQuestion = (index: number, field: keyof KnowledgeQuestion, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      knowledgeQuestions: prev.knowledgeQuestions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }))
  }

  const removeKnowledgeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      knowledgeQuestions: prev.knowledgeQuestions.filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, order: i + 1 }))
    }))
  }

  // Practical Skills handlers
  const addPracticalSkill = () => {
    setFormData(prev => ({
      ...prev,
      practicalSkills: [
        ...prev.practicalSkills,
        { skillDescription: '', canBeNotApplicable: false, order: prev.practicalSkills.length + 1 }
      ]
    }))
  }

  const updatePracticalSkill = (index: number, field: keyof PracticalSkill, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      practicalSkills: prev.practicalSkills.map((s, i) => 
        i === index ? { ...s, [field]: value } : s
      )
    }))
  }

  const removePracticalSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      practicalSkills: prev.practicalSkills.filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 }))
    }))
  }

  // Emergency Questions handlers
  const addEmergencyQuestion = () => {
    setFormData(prev => ({
      ...prev,
      emergencyQuestions: [
        ...prev.emergencyQuestions,
        { question: '', modelAnswer: '', order: prev.emergencyQuestions.length + 1 }
      ]
    }))
  }

  const updateEmergencyQuestion = (index: number, field: keyof EmergencyQuestion, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      emergencyQuestions: prev.emergencyQuestions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }))
  }

  const removeEmergencyQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergencyQuestions: prev.emergencyQuestions.filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, order: i + 1 }))
    }))
  }

  // Handle task selection with warning for already covered tasks
  const handleTaskToggle = (taskId: string) => {
    if (formData.tasksCovered.includes(taskId)) {
      setFormData(prev => ({
        ...prev,
        tasksCovered: prev.tasksCovered.filter(id => id !== taskId)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        tasksCovered: [...prev.tasksCovered, taskId]
      }))
    }
  }

  const handleCoveredTaskWarning = (task: Task) => {
    setTaskToWarning(task)
    setWarningDialogOpen(true)
  }

  const handleWarningProceed = () => {
    if (taskToWarning) {
      handleTaskToggle(taskToWarning.id)
    }
    setWarningDialogOpen(false)
    setTaskToWarning(null)
  }

  const availableTasks = (tasksData as Task[] || []).filter(task => !task.deletedAt)
  
  // Get tasks that are already covered by other assessments (excluding current one)
  const coveredTaskIds = new Set<string>()
  
  if (assessmentsData && id) {
    (assessmentsData as any[]).forEach((assessment: any) => {
      // Skip current assessment being edited
      if (assessment.id !== id) {
        // Track tasks used for coverage
        if (assessment.tasksCovered) {
          assessment.tasksCovered.forEach((taskCoverage: any) => {
            coveredTaskIds.add(taskCoverage.taskId)
          })
        }
      }
    })
  }
  
  // Group tasks into available and already covered
  const uncoveredTasks = availableTasks.filter(task => !coveredTaskIds.has(task.id))
  const alreadyCoveredTasks = availableTasks.filter(task => coveredTaskIds.has(task.id))
  
  // Filter both groups based on search term
  const filteredUncoveredTasks = uncoveredTasks.filter(task =>
    task.name.toLowerCase().includes(taskSearchTerm.toLowerCase())
  )
  const filteredCoveredTasks = alreadyCoveredTasks.filter(task =>
    task.name.toLowerCase().includes(taskSearchTerm.toLowerCase())
  )

  if (assessmentLoading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (assessmentError || !assessmentData) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load assessment. Please try again.
        </Alert>
      </Container>
    )
  }

  return (
    <AdminPageLayout 
      pageTitle={`Edit Assessment: ${(assessmentData as any)?.name || 'Loading...'}`}
      backPath="/assessments"
      backText="Back to Assessments"
      additionalBreadcrumbs={[
        {
          label: 'Assessments',
          onClick: () => navigate('/assessments')
        }
      ]}
    >
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Card elevation={2}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <QuizIcon color="primary" />
                <Typography variant="h5" component="div">
                  Edit Assessment: {(assessmentData as any)?.name}
                </Typography>
              </Box>
            }
            subheader="Modify assessment sections and settings"
            action={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2">Responses: {(assessmentData as any)?.assessmentResponses?.length || 0}</Typography>
                {((assessmentData as any)?.assessmentResponses?.length || 0) > 0 && (
                  <Chip label="Has Responses" color="warning" size="small" />
                )}
              </Box>
            }
          />

          <CardContent>
            <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
              {/* Step 1: Basic Information */}
              <Step>
                <StepLabel 
                  onClick={() => setActiveStep(0)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <AssignmentIcon />
                    Basic Information
                  </Box>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="Assessment Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      sx={{ mb: 2 }}
                      required
                    />
                    

                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        />
                      }
                      label="Assessment is Active"
                      sx={{ mb: 2 }}
                    />

                    {((assessmentData as any)?.assessmentResponses?.length || 0) > 0 && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        This assessment has {(assessmentData as any)?.assessmentResponses?.length} response(s). 
                        Changes to questions/skills will not affect existing responses.
                      </Alert>
                    )}
                  </Box>
                  
                  <Box sx={{ mb: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={!formData.name.trim()}
                    >
                      Continue
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* Step 2: Knowledge Questions */}
              <Step>
                <StepLabel 
                  onClick={() => setActiveStep(1)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <PsychologyIcon />
                    Knowledge Questions ({formData.knowledgeQuestions.length})
                  </Box>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    {formData.knowledgeQuestions.map((question, index) => (
                      <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h6">Question {index + 1}</Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeKnowledgeQuestion(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          
                          <TextField
                            fullWidth
                            label="Question"
                            value={question.question}
                            onChange={(e) => updateKnowledgeQuestion(index, 'question', e.target.value)}
                            sx={{ mb: 2 }}
                            multiline
                            rows={2}
                          />
                          
                          <TextField
                            fullWidth
                            label="Model Answer"
                            value={question.modelAnswer}
                            onChange={(e) => updateKnowledgeQuestion(index, 'modelAnswer', e.target.value)}
                            multiline
                            rows={3}
                          />
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      startIcon={<AddIcon />}
                      onClick={addKnowledgeQuestion}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    >
                      Add Knowledge Question
                    </Button>
                  </Box>
                  
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

              {/* Step 3: Practical Skills */}
              <Step>
                <StepLabel 
                  onClick={() => setActiveStep(2)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <TaskIcon />
                    Practical Skills ({formData.practicalSkills.length})
                  </Box>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    {formData.practicalSkills.map((skill, index) => (
                      <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h6">Skill {index + 1}</Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removePracticalSkill(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          
                          <TextField
                            fullWidth
                            label="Skill Description"
                            value={skill.skillDescription}
                            onChange={(e) => updatePracticalSkill(index, 'skillDescription', e.target.value)}
                            sx={{ mb: 2 }}
                            multiline
                            rows={2}
                          />
                          
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={skill.canBeNotApplicable}
                                onChange={(e) => updatePracticalSkill(index, 'canBeNotApplicable', e.target.checked)}
                              />
                            }
                            label="Can be marked as 'Not Applicable'"
                          />
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      startIcon={<AddIcon />}
                      onClick={addPracticalSkill}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    >
                      Add Practical Skill
                    </Button>
                  </Box>
                  
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

              {/* Step 4: Emergency Questions */}
              <Step>
                <StepLabel 
                  onClick={() => setActiveStep(3)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <EmergencyIcon />
                    Emergency Questions ({formData.emergencyQuestions.length})
                  </Box>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    {formData.emergencyQuestions.map((question, index) => (
                      <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h6">Emergency Scenario {index + 1}</Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeEmergencyQuestion(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          
                          <TextField
                            fullWidth
                            label="Emergency Question/Scenario"
                            value={question.question}
                            onChange={(e) => updateEmergencyQuestion(index, 'question', e.target.value)}
                            sx={{ mb: 2 }}
                            multiline
                            rows={2}
                          />
                          
                          <TextField
                            fullWidth
                            label="Expected Response/Model Answer"
                            value={question.modelAnswer}
                            onChange={(e) => updateEmergencyQuestion(index, 'modelAnswer', e.target.value)}
                            multiline
                            rows={3}
                          />
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      startIcon={<AddIcon />}
                      onClick={addEmergencyQuestion}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    >
                      Add Emergency Question
                    </Button>
                  </Box>
                  
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

              {/* Step 5: Task Coverage */}
              <Step>
                <StepLabel 
                  onClick={() => setActiveStep(4)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <AssignmentIcon />
                    Task Coverage ({formData.tasksCovered.length})
                  </Box>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Select which tasks this assessment covers. Completing this assessment will update competency ratings for the selected tasks.
                    </Typography>

                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Task Selection</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Select tasks that this assessment will cover. You can search and select multiple tasks.
                        </Typography>
                        
                        <TextField
                          fullWidth
                          placeholder="Search tasks..."
                          value={taskSearchTerm}
                          onChange={(e) => setTaskSearchTerm(e.target.value)}
                          sx={{ mb: 2 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                        
                        <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                          {filteredUncoveredTasks.length === 0 && filteredCoveredTasks.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                              {taskSearchTerm ? 'No tasks found matching your search.' : 'No tasks available.'}
                            </Typography>
                          ) : (
                            <>
                              {/* Available Tasks Section */}
                              {filteredUncoveredTasks.length > 0 && (
                                <>
                                  <Typography variant="subtitle2" color="text.primary" sx={{ p: 1, fontWeight: 600 }}>
                                    Available Tasks ({filteredUncoveredTasks.length})
                                  </Typography>
                                  {filteredUncoveredTasks.map((task: Task) => (
                                    <TaskItem
                                      key={task.id}
                                      task={task}
                                      isSelected={formData.tasksCovered.includes(task.id)}
                                      isCovered={false}
                                      onToggle={handleTaskToggle}
                                    />
                                  ))}
                                </>
                              )}
                              
                              {/* Already Covered Tasks Section */}
                              {filteredCoveredTasks.length > 0 && (
                                <>
                                  {filteredUncoveredTasks.length > 0 && <Divider sx={{ my: 2 }} />}
                                  <Typography variant="subtitle2" color="text.secondary" sx={{ p: 1, fontWeight: 600 }}>
                                    Already Covered by Other Assessments ({filteredCoveredTasks.length})
                                  </Typography>
                                  {filteredCoveredTasks.map((task: Task) => (
                                    <TaskItem
                                      key={task.id}
                                      task={task}
                                      isSelected={formData.tasksCovered.includes(task.id)}
                                      isCovered={true}
                                      onToggle={handleTaskToggle}
                                      onWarningClick={() => handleCoveredTaskWarning(task)}
                                    />
                                  ))}
                                </>
                              )}
                            </>
                          )}
                        </Box>
                        
                        {formData.tasksCovered.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Selected Tasks ({formData.tasksCovered.length}):
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {formData.tasksCovered.map((taskId) => {
                                const task = availableTasks.find(t => t.id === taskId)
                                return (
                                  <Chip 
                                    key={taskId} 
                                    label={task?.name || taskId} 
                                    size="small" 
                                    onDelete={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        tasksCovered: prev.tasksCovered.filter(id => id !== taskId)
                                      }))
                                    }}
                                  />
                                )
                              })}
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  {/* Assessment Summary */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Assessment Summary</Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <Chip 
                        icon={<PsychologyIcon />} 
                        label={`${formData.knowledgeQuestions.length} Knowledge Questions`} 
                        color="info" 
                      />
                      <Chip 
                        icon={<TaskIcon />} 
                        label={`${formData.practicalSkills.length} Practical Skills`} 
                        color="warning" 
                      />
                      <Chip 
                        icon={<EmergencyIcon />} 
                        label={`${formData.emergencyQuestions.length} Emergency Questions`} 
                        color="error" 
                      />
                      <Chip 
                        icon={<AssignmentIcon />} 
                        label={`${formData.tasksCovered.length} Tasks Covered`} 
                        color="success" 
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      sx={{ mt: 1, mr: 1 }}
                      startIcon={updateAssessmentMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={updateAssessmentMutation.isPending}
                    >
                      {updateAssessmentMutation.isPending ? 'Updating...' : 'Update Assessment'}
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

      {/* Task Coverage Warning Dialog */}
      <Dialog open={warningDialogOpen} onClose={() => setWarningDialogOpen(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Task Already Covered
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            The task "{taskToWarning?.name}" is already covered by another assessment.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Including this task in multiple assessments may lead to:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Duplicate competency tracking
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Confusion for assessors
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Overlapping assessment requirements
            </Typography>
          </Box>
          <Typography sx={{ mt: 2 }}>
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleWarningProceed}
            variant="contained"
            color="warning"
          >
            Proceed Anyway
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
      </Container>
    </AdminPageLayout>
  )
}

export default EditAssessmentPage