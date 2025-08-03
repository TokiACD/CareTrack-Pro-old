import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Container,
  AppBar,
  Toolbar,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Quiz as QuizIcon,
  ExpandMore as ExpandMoreIcon,
  Task as TaskIcon,
  Psychology as PsychologyIcon,
  LocalHospital as EmergencyIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'
import { API_ENDPOINTS, CompetencyLevel } from '@caretrack/shared'
import { useAuth } from '../contexts/AuthContext'
import { useSmartMutation } from '../hooks/useSmartMutation'

// Extended assessment interface with relations
interface ExtendedAssessment {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  displayTaskId?: string
  knowledgeQuestions?: Array<{
    id: string
    question: string
    modelAnswer: string
    order: number
  }>
  practicalSkills?: Array<{
    id: string
    skillDescription: string
    canBeNotApplicable: boolean
    order: number
  }>
  emergencyQuestions?: Array<{
    id: string
    question: string
    modelAnswer: string
    order: number
  }>
  tasksCovered?: Array<{
    id: string
    task: {
      id: string
      name: string
      targetCount: number
    }
  }>
  assessmentResponses?: Array<{
    id: string
    carerId: string
    overallRating: CompetencyLevel
    completedAt: Date
    carer: {
      id: string
      name: string
      email: string
    }
    assessor: {
      id: string
      name: string
    }
  }>
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`assessment-tabpanel-${index}`}
      aria-labelledby={`assessment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // State management
  const [selectedAssessment, setSelectedAssessment] = useState<ExtendedAssessment | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assessmentToDelete, setAssessmentToDelete] = useState<ExtendedAssessment | null>(null)
  
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

  // Helper function to show notifications
  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({
      open: true,
      message,
      severity
    })
  }

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }))
  }

  // Fetch assessments
  const { data: assessmentsData, isLoading: assessmentsLoading, error: assessmentsError } = useQuery({
    queryKey: ['assessments'],
    queryFn: async () => {
      const response = await apiService.get(API_ENDPOINTS.ASSESSMENTS.LIST)
      return response || []
    }
  })

  // Delete assessment mutation
  const deleteAssessmentMutation = useSmartMutation<any, Error, string>(
    async (assessmentId: string) => {
      return await apiService.deleteWithResponse(`${API_ENDPOINTS.ASSESSMENTS.DELETE}/${assessmentId}`)
    },
    {
      mutationType: 'assessments.delete',
      onSuccess: (data: any) => {
        setDeleteDialogOpen(false)
        setAssessmentToDelete(null)
        if (selectedAssessment && selectedAssessment.id === assessmentToDelete?.id) {
          setSelectedAssessment(null)
        }
        showNotification(data.message || 'Assessment deleted successfully', 'success')
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to delete assessment',
          'error'
        )
      }
    }
  )

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    if (!assessmentsData) return []
    return (assessmentsData as ExtendedAssessment[]).filter((assessment: ExtendedAssessment) =>
      assessment.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !assessment.deletedAt
    )
  }, [assessmentsData, searchTerm])

  // Handle assessment selection
  const handleAssessmentClick = (assessment: ExtendedAssessment) => {
    setSelectedAssessment(assessment)
    setTabValue(0)
  }

  const handleBackToList = () => {
    setSelectedAssessment(null)
  }

  // Handle delete confirmation
  const handleDeleteClick = (assessment: ExtendedAssessment) => {
    setAssessmentToDelete(assessment)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (assessmentToDelete) {
      deleteAssessmentMutation.mutate(assessmentToDelete.id)
    }
  }

  // Get competency level color
  const getCompetencyColor = (level: CompetencyLevel) => {
    switch (level) {
      case 'EXPERT': return 'success'
      case 'PROFICIENT': return 'info' 
      case 'COMPETENT': return 'primary'
      case 'ADVANCED_BEGINNER': return 'warning'
      case 'NOT_COMPETENT': return 'error'
      default: return 'default'
    }
  }

  // Format competency level
  const formatCompetencyLevel = (level: CompetencyLevel) => {
    return level.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  if (assessmentsError) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load assessments. Please try again.
        </Alert>
      </Container>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <QuizIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Assessment Management
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
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            <QuizIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Assessments
          </Typography>
          {selectedAssessment && (
            <Typography color="text.primary">{selectedAssessment.name}</Typography>
          )}
        </Breadcrumbs>
      </Container>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        {!selectedAssessment ? (
          // Assessment List View
          <Card elevation={2}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <QuizIcon color="primary" />
                  <Typography variant="h5" component="div">
                    Assessments
                  </Typography>
                </Box>
              }
              subheader="Create and manage competency assessments for carers"
              action={
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/assessments/create')}
                >
                  Create Assessment
                </Button>
              }
            />
            
            <CardContent>
              {/* Search */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  placeholder="Search assessments..."
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

              {/* Loading State */}
              {assessmentsLoading && (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              )}

              {/* Assessments Table */}
              {!assessmentsLoading && (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Assessment Name</TableCell>
                        <TableCell align="center">Sections</TableCell>
                        <TableCell align="center">Tasks Covered</TableCell>
                        <TableCell align="center">Responses</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAssessments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              {searchTerm ? 'No assessments found matching your search.' : 'No assessments available. Create your first assessment to get started.'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAssessments.map((assessment: ExtendedAssessment) => (
                          <TableRow
                            key={assessment.id}
                            sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {assessment.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" justifyContent="center" gap={0.5}>
                                {(assessment.knowledgeQuestions?.length || 0) > 0 && (
                                  <Chip 
                                    label={`K: ${assessment.knowledgeQuestions?.length}`} 
                                    size="small" 
                                    color="info"
                                    title="Knowledge Questions"
                                  />
                                )}
                                {(assessment.practicalSkills?.length || 0) > 0 && (
                                  <Chip 
                                    label={`P: ${assessment.practicalSkills?.length}`} 
                                    size="small" 
                                    color="warning"
                                    title="Practical Skills"
                                  />
                                )}
                                {(assessment.emergencyQuestions?.length || 0) > 0 && (
                                  <Chip 
                                    label={`E: ${assessment.emergencyQuestions?.length}`} 
                                    size="small" 
                                    color="error"
                                    title="Emergency Questions"
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={assessment.tasksCovered?.length || 0}
                                size="small"
                                color="success"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={assessment.assessmentResponses?.length || 0}
                                size="small"
                                color="primary"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={assessment.isActive ? 'Active' : 'Inactive'}
                                size="small"
                                color={assessment.isActive ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" justifyContent="center" gap={1}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleAssessmentClick(assessment)}
                                  startIcon={<AssignmentIcon />}
                                >
                                  View
                                </Button>
                                <IconButton
                                  size="small"
                                  onClick={() => navigate(`/assessments/${assessment.id}/edit`)}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteClick(assessment)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        ) : (
          // Assessment Detail View
          <Card elevation={2}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <QuizIcon color="primary" />
                  <Typography variant="h5" component="div">
                    {selectedAssessment.name}
                  </Typography>
                  <Chip 
                    label={selectedAssessment.isActive ? 'Active' : 'Inactive'} 
                    size="small" 
                    color={selectedAssessment.isActive ? 'success' : 'default'} 
                  />
                </Box>
              }
              subheader={`Created: ${new Date(selectedAssessment.createdAt).toLocaleDateString()}`}
              action={
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBackToList}
                >
                  Back to Assessments
                </Button>
              }
            />
            
            <CardContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <PsychologyIcon />
                        Knowledge ({selectedAssessment.knowledgeQuestions?.length || 0})
                      </Box>
                    } 
                  />
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <TaskIcon />
                        Practical ({selectedAssessment.practicalSkills?.length || 0})
                      </Box>
                    } 
                  />
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <EmergencyIcon />
                        Emergency ({selectedAssessment.emergencyQuestions?.length || 0})
                      </Box>
                    } 
                  />
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircleIcon />
                        Responses ({selectedAssessment.assessmentResponses?.length || 0})
                      </Box>
                    } 
                  />
                </Tabs>
              </Box>

              {/* Knowledge Questions Tab */}
              <TabPanel value={tabValue} index={0}>
                {selectedAssessment.knowledgeQuestions?.length === 0 ? (
                  <Alert severity="info">
                    No knowledge questions in this assessment.
                  </Alert>
                ) : (
                  <List>
                    {selectedAssessment.knowledgeQuestions?.map((question, index) => (
                      <React.Fragment key={question.id}>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography fontWeight={500}>
                              Question {index + 1}: {question.question}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Model Answer:</strong><br />
                              {question.modelAnswer}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </TabPanel>

              {/* Practical Skills Tab */}
              <TabPanel value={tabValue} index={1}>
                {selectedAssessment.practicalSkills?.length === 0 ? (
                  <Alert severity="info">
                    No practical skills in this assessment.
                  </Alert>
                ) : (
                  <List>
                    {selectedAssessment.practicalSkills?.map((skill, index) => (
                      <React.Fragment key={skill.id}>
                        <ListItem>
                          <ListItemText
                            primary={`Skill ${index + 1}: ${skill.skillDescription}`}
                            secondary={skill.canBeNotApplicable ? 'Can be marked as Not Applicable' : 'Must be assessed'}
                          />
                        </ListItem>
                        {index < (selectedAssessment.practicalSkills?.length || 0) - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </TabPanel>

              {/* Emergency Questions Tab */}
              <TabPanel value={tabValue} index={2}>
                {selectedAssessment.emergencyQuestions?.length === 0 ? (
                  <Alert severity="info">
                    No emergency questions in this assessment.
                  </Alert>
                ) : (
                  <List>
                    {selectedAssessment.emergencyQuestions?.map((question, index) => (
                      <React.Fragment key={question.id}>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography fontWeight={500}>
                              Emergency {index + 1}: {question.question}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Model Answer:</strong><br />
                              {question.modelAnswer}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </TabPanel>

              {/* Assessment Responses Tab */}
              <TabPanel value={tabValue} index={3}>
                {selectedAssessment.assessmentResponses?.length === 0 ? (
                  <Alert severity="info">
                    No responses submitted for this assessment yet.
                  </Alert>
                ) : (
                  <List>
                    {selectedAssessment.assessmentResponses?.map((response) => (
                      <React.Fragment key={response.id}>
                        <ListItem>
                          <ListItemText
                            primary={response.carer.name}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Assessed by: {response.assessor.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Completed: {new Date(response.completedAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                            }
                          />
                          <Chip
                            label={formatCompetencyLevel(response.overallRating)}
                            color={getCompetencyColor(response.overallRating) as any}
                            size="small"
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </TabPanel>
            </CardContent>
          </Card>
        )}
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Assessment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{assessmentToDelete?.name}"?{' '}
            {(assessmentToDelete?.assessmentResponses?.length || 0) > 0 && (
              <span>
                This assessment has {assessmentToDelete?.assessmentResponses?.length} response(s). 
                The assessment will be soft-deleted to preserve response data.
              </span>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteAssessmentMutation.isPending}
          >
            {deleteAssessmentMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
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

export default AssessmentsPage