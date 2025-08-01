import React, { useState } from 'react'
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormControlLabel,
  Checkbox,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails
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
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '../services/api'
import { API_ENDPOINTS, Task } from '@caretrack/shared'
import { useAuth } from '../contexts/AuthContext'

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
  displayTaskId: string
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

const CreateAssessmentPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const [activeStep, setActiveStep] = useState(0)
  const [taskSearchTerm, setTaskSearchTerm] = useState('')
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [taskToWarning, setTaskToWarning] = useState<Task | null>(null)
  const [formData, setFormData] = useState<AssessmentFormData>({
    name: '',
    displayTaskId: '',
    knowledgeQuestions: [],
    practicalSkills: [],
    emergencyQuestions: [],
    tasksCovered: []
  })

  // Accordion state management
  const [expandedKnowledge, setExpandedKnowledge] = useState<string | false>(false)
  const [expandedPractical, setExpandedPractical] = useState<string | false>(false)
  const [expandedEmergency, setExpandedEmergency] = useState<string | false>(false)

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

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: AssessmentFormData) => {
      return await apiService.post(API_ENDPOINTS.ASSESSMENTS.CREATE, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] })
      showNotification('Assessment created successfully', 'success')
      setTimeout(() => navigate('/assessments'), 1500)
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to create assessment', 'error')
    }
  })

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

    createAssessmentMutation.mutate(formData)
  }

  // Accordion handlers
  const handleKnowledgeAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedKnowledge(isExpanded ? panel : false)
  }

  const handlePracticalAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPractical(isExpanded ? panel : false)
  }

  const handleEmergencyAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedEmergency(isExpanded ? panel : false)
  }

  // Reset accordion states when switching steps
  const handleStepChange = (step: number) => {
    setActiveStep(step)
    // Collapse all accordions when switching steps
    setExpandedKnowledge(false)
    setExpandedPractical(false)
    setExpandedEmergency(false)
  }

  // Knowledge Questions handlers
  const addKnowledgeQuestion = () => {
    const newIndex = formData.knowledgeQuestions.length
    setFormData(prev => ({
      ...prev,
      knowledgeQuestions: [
        ...prev.knowledgeQuestions,
        { question: '', modelAnswer: '', order: newIndex + 1 }
      ]
    }))
    // Expand the new question and collapse others
    setExpandedKnowledge(`knowledge-${newIndex}`)
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
    const newIndex = formData.practicalSkills.length
    setFormData(prev => ({
      ...prev,
      practicalSkills: [
        ...prev.practicalSkills,
        { skillDescription: '', canBeNotApplicable: false, order: newIndex + 1 }
      ]
    }))
    // Expand the new skill and collapse others
    setExpandedPractical(`practical-${newIndex}`)
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
    const newIndex = formData.emergencyQuestions.length
    setFormData(prev => ({
      ...prev,
      emergencyQuestions: [
        ...prev.emergencyQuestions,
        { question: '', modelAnswer: '', order: newIndex + 1 }
      ]
    }))
    // Expand the new question and collapse others
    setExpandedEmergency(`emergency-${newIndex}`)
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
  
  // Get tasks that are already covered by other assessments
  const coveredTaskIds = new Set<string>()
  // Get tasks that are already used as display tasks
  const usedDisplayTaskIds = new Set<string>()
  
  if (assessmentsData) {
    (assessmentsData as any[]).forEach((assessment: any) => {
      // Track tasks used for coverage
      if (assessment.tasksCovered) {
        assessment.tasksCovered.forEach((taskCoverage: any) => {
          coveredTaskIds.add(taskCoverage.taskId)
        })
      }
      // Track tasks used as display tasks
      if (assessment.displayTaskId) {
        usedDisplayTaskIds.add(assessment.displayTaskId)
      }
    })
  }
  
  // Filter available display tasks (exclude already used ones)
  const availableDisplayTasks = availableTasks.filter(task => !usedDisplayTaskIds.has(task.id))
  
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

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/assessments')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <QuizIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Create Assessment
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
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
            onClick={() => navigate('/assessments')}
          >
            <QuizIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Assessments
          </Link>
          <Typography color="text.primary">Create</Typography>
        </Breadcrumbs>
      </Container>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Card elevation={2}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <QuizIcon color="primary" />
                <Typography variant="h5" component="div">
                  Create New Assessment
                </Typography>
              </Box>
            }
            subheader="Build a comprehensive competency assessment for carers"
          />

          <CardContent>
            <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
              {/* Step 1: Basic Information */}
              <Step>
                <StepLabel 
                  onClick={() => handleStepChange(0)}
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
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Display Task (Optional)</InputLabel>
                      <Select
                        value={formData.displayTaskId}
                        onChange={(e) => setFormData(prev => ({ ...prev, displayTaskId: e.target.value }))}
                        label="Display Task (Optional)"
                      >
                        <MenuItem value="">None</MenuItem>
                        {availableDisplayTasks.map((task: Task) => (
                          <MenuItem key={task.id} value={task.id}>
                            {task.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      The display task determines where this assessment appears in the progress tracking interface.
                      {availableDisplayTasks.length === 0 && availableTasks.length > 0 && (
                        <span style={{ color: '#f57c00', fontWeight: 500 }}>
                          {' '}All tasks are already used as display tasks by other assessments.
                        </span>
                      )}
                    </Typography>
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
                  onClick={() => handleStepChange(1)}
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
                      <Accordion
                        key={index}
                        expanded={expandedKnowledge === `knowledge-${index}`}
                        onChange={handleKnowledgeAccordionChange(`knowledge-${index}`)}
                        sx={{ mb: 1 }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          aria-controls={`knowledge-${index}-content`}
                          id={`knowledge-${index}-header`}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                            <Typography variant="h6">
                              Question {index + 1}
                              {question.question && `: ${question.question.substring(0, 50)}${question.question.length > 50 ? '...' : ''}`}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeKnowledgeQuestion(index)
                              }}
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
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
                        </AccordionDetails>
                      </Accordion>
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
                  onClick={() => handleStepChange(2)}
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
                      <Accordion
                        key={index}
                        expanded={expandedPractical === `practical-${index}`}
                        onChange={handlePracticalAccordionChange(`practical-${index}`)}
                        sx={{ mb: 1 }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          aria-controls={`practical-${index}-content`}
                          id={`practical-${index}-header`}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                            <Typography variant="h6">
                              Skill {index + 1}
                              {skill.skillDescription && `: ${skill.skillDescription.substring(0, 50)}${skill.skillDescription.length > 50 ? '...' : ''}`}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation()
                                removePracticalSkill(index)
                              }}
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
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
                        </AccordionDetails>
                      </Accordion>
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
                  onClick={() => handleStepChange(3)}
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
                      <Accordion
                        key={index}
                        expanded={expandedEmergency === `emergency-${index}`}
                        onChange={handleEmergencyAccordionChange(`emergency-${index}`)}
                        sx={{ mb: 1 }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          aria-controls={`emergency-${index}-content`}
                          id={`emergency-${index}-header`}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                            <Typography variant="h6">
                              Emergency Scenario {index + 1}
                              {question.question && `: ${question.question.substring(0, 50)}${question.question.length > 50 ? '...' : ''}`}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeEmergencyQuestion(index)
                              }}
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
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
                        </AccordionDetails>
                      </Accordion>
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
                  onClick={() => handleStepChange(4)}
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
                      startIcon={createAssessmentMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={createAssessmentMutation.isPending}
                    >
                      {createAssessmentMutation.isPending ? 'Creating...' : 'Create Assessment'}
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
    </Box>
  )
}

export default CreateAssessmentPage