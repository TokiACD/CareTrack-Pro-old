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

interface KnowledgeQuestion {
  id: string
  question: string
  modelAnswer: string
  order: number
}

interface KnowledgeResponseData {
  questionId: string
  carerAnswer: string
}

interface KnowledgeQuestionsStepProps {
  questions: KnowledgeQuestion[]
  responses: KnowledgeResponseData[]
  expandedQuestions: string[]
  onResponseChange: (questionId: string, answer: string) => void
  onToggleExpanded: (questionId: string) => void
  onAutoExpandNext: (currentIndex: number) => void
}

const KnowledgeQuestionsStep: React.FC<KnowledgeQuestionsStepProps> = ({
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
        Answer the following knowledge-based questions to demonstrate understanding.
      </Typography>
      
      {questions.map((question, index) => {
        const response = responses.find(r => r.questionId === question.id)
        const questionId = `knowledge-${question.id}`
        const isExpanded = expandedQuestions.includes(questionId)
        const isAnswered = response?.carerAnswer?.trim()
        const nextQuestion = questions[index + 1]
        const nextQuestionId = nextQuestion ? `knowledge-${nextQuestion.id}` : null

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
                backgroundColor: isAnswered ? 'success.light' : 'grey.50',
                '&.Mui-expanded': { minHeight: 48 }
              }}
            >
              <Box display="flex" alignItems="center" width="100%" gap={1}>
                {isAnswered && <CheckCircleIcon color="success" />}
                <Typography sx={{ fontWeight: isAnswered ? 600 : 400, flexGrow: 1 }}>
                  Question {index + 1}: {question.question}
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
                label="Carer's Answer"
                placeholder="Enter the carer's response to this question..."
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
                backgroundColor: 'grey.50', 
                p: 1, 
                borderRadius: 1,
                borderLeft: '4px solid',
                borderColor: 'primary.main'
              }}>
                {question.modelAnswer}
              </Typography>
              
              {/* Auto-expand hint */}
              {isAnswered && nextQuestion && (
                <Box display="flex" alignItems="center" gap={1} mt={2} sx={{ color: 'text.secondary' }}>
                  <NavigateNextIcon fontSize="small" />
                  <Typography variant="caption">
                    Next: Question {index + 2}
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

export default KnowledgeQuestionsStep