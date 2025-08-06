import React from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material'
import { Assessment } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import {
  KnowledgeQuestion,
  PracticalSkill,
  EmergencyQuestion
} from '@caretrack/shared'

interface KnowledgeResponseData {
  questionId: string
  carerAnswer: string
  question: KnowledgeQuestion
}

interface PracticalResponseData {
  skillId: string
  rating: string
  skill: PracticalSkill
}

interface EmergencyResponseData {
  questionId: string
  carerAnswer: string
  question: EmergencyQuestion
}

interface AssessmentResponseWithDetails {
  id: string
  completedAt: string
  overallRating: string
  assessorUniqueId?: string
  assessment: {
    id: string
    name: string
    knowledgeQuestions: KnowledgeQuestion[]
    practicalSkills: PracticalSkill[]
    emergencyQuestions: EmergencyQuestion[]
    tasksCovered: Array<{
      task: {
        id: string
        name: string
      }
    }>
  }
  assessor: {
    id: string
    name: string
  }
  knowledgeResponses: KnowledgeResponseData[]
  practicalResponses: PracticalResponseData[]
  emergencyResponses: EmergencyResponseData[]
}

interface CarerAssessmentHistory {
  carer: {
    id: string
    name: string
    email: string
  }
  assessments: AssessmentResponseWithDetails[]
}

interface AssessmentHistoryTabProps {
  assessmentHistory: CarerAssessmentHistory | null
  loading: boolean
  carerId?: string
}

const getCompetencyColor = (level: string) => {
  switch (level) {
    case 'EXPERT': return '#2e7d32'
    case 'PROFICIENT': return '#388e3c'
    case 'COMPETENT': return '#4caf50'
    case 'ADVANCED_BEGINNER': return '#ff9800'
    case 'NOT_COMPETENT': return '#f44336'
    case 'NOT_ASSESSED': return '#9e9e9e'
    default: return '#9e9e9e'
  }
}

const AssessmentHistoryTab: React.FC<AssessmentHistoryTabProps> = ({
  assessmentHistory,
  loading,
  carerId
}) => {
  const navigate = useNavigate()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (!assessmentHistory || assessmentHistory.assessments.length === 0) {
    return (
      <Alert severity="info">
        No assessment responses found for this carer yet.
      </Alert>
    )
  }

  return (
    <Grid container spacing={3}>
      {assessmentHistory.assessments.map((assessment) => (
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
                    onClick={() => navigate(`/assessments/${assessment.assessment.id}/edit/${carerId}?responseId=${assessment.id}&from=progress`)}
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
  )
}

export default AssessmentHistoryTab