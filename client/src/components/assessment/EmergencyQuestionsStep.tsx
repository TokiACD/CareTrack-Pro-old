import React from 'react'
import {
  StepContent,
  Typography,
  TextField,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material'

interface EmergencyQuestion {
  id: string
  question: string
  modelAnswer: string
  order: number
}

interface EmergencyResponseData {
  questionId: string
  carerAnswer: string
}

interface EmergencyQuestionsStepProps {
  questions: EmergencyQuestion[]
  responses: EmergencyResponseData[]
  expandedQuestions: string[]
  onResponseChange: (questionId: string, answer: string) => void
  onToggleExpanded: (questionId: string) => void
  onAutoExpandNext: (currentIndex: number) => void
}

const EmergencyQuestionsStep: React.FC<EmergencyQuestionsStepProps> = ({
  questions,
  responses,
  expandedQuestions,
  onResponseChange,
  onToggleExpanded,
  onAutoExpandNext
}) => {
  return (
    <StepContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Describe how the carer would respond to these emergency situations.
      </Typography>
      
      {questions.map((question, index) => {
        const response = responses.find(r => r.questionId === question.id)
        const questionId = `emergency-${question.id}`
        const isExpanded = expandedQuestions.includes(questionId)
        const isAnswered = response?.carerAnswer?.trim()
        const nextQuestion = questions[index + 1]
        const nextQuestionId = nextQuestion ? `emergency-${nextQuestion.id}` : null

        return (
          <Accordion 
            key={question.id}
            expanded={isExpanded}
            onChange={() => onToggleExpanded(questionId)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                backgroundColor: isAnswered ? 'error.light' : 'grey.50',
                '&.Mui-expanded': { minHeight: 48 }
              }}
            >
              <Box display="flex" alignItems="center" width="100%" gap={1}>
                {isAnswered && <CheckCircleIcon color="success" />}
                <Typography sx={{ fontWeight: isAnswered ? 600 : 400, flexGrow: 1 }}>
                  Emergency {index + 1}: {question.question}
                </Typography>
                {isAnswered && (
                  <Chip 
                    label="Answered" 
                    size="small" 
                    color="success" 
                    variant="filled"
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                multiline
                rows={4}
                fullWidth
                label="Carer's Response"
                placeholder="Describe how the carer would handle this emergency situation..."
                value={response?.carerAnswer || ''}
                onChange={(e) => {
                  onResponseChange(question.id, e.target.value)
                  
                  // Auto-expand next question when this one is answered
                  if (e.target.value.trim() && nextQuestionId && !expandedQuestions.includes(nextQuestionId)) {
                    setTimeout(() => onAutoExpandNext(index), 500)
                  }
                }}
                sx={{ mb: 2 }}
                variant="outlined"
              />
              
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Model Answer (for reference):
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ 
                fontStyle: 'italic', 
                backgroundColor: 'error.light', 
                p: 1, 
                borderRadius: 1,
                borderLeft: '4px solid',
                borderColor: 'error.main'
              }}>
                {question.modelAnswer}
              </Typography>
              
              {/* Auto-expand hint */}
              {isAnswered && nextQuestion && (
                <Box display="flex" alignItems="center" gap={1} mt={2} sx={{ color: 'text.secondary' }}>
                  <NavigateNextIcon fontSize="small" />
                  <Typography variant="caption">
                    Next: Emergency {index + 2}
                  </Typography>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        )
      })}
    </StepContent>
  )
}

export default EmergencyQuestionsStep