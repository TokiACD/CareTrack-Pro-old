import React from 'react'
import {
  StepContent,
  Typography,
  Card,
  CardContent,
  Box,
  Chip,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button
} from '@mui/material'
import {
  Send as SendIcon
} from '@mui/icons-material'
import { CompetencyLevel } from '@caretrack/shared'

interface TasksCovered {
  taskId: string
  task?: { name: string }
}

interface ReviewStepProps {
  tasksCovered: TasksCovered[]
  overallRating: CompetencyLevel
  onOverallRatingChange: (rating: CompetencyLevel) => void
  onSubmit: () => void
  isSubmitting: boolean
  isEditMode: boolean
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  tasksCovered,
  overallRating,
  onOverallRatingChange,
  onSubmit,
  isSubmitting,
  isEditMode
}) => {
  return (
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
            {tasksCovered?.map((taskCoverage) => (
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
              value={overallRating}
              onChange={(e) => onOverallRatingChange(e.target.value as CompetencyLevel)}
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
                      Above average performance - demonstrates mastery
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
                      Meets all required standards - satisfactory performance
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
                      Basic skills demonstrated - requires some guidance
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
                      Does not meet required standards - needs additional training
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SendIcon />}
          onClick={onSubmit}
          disabled={isSubmitting || !overallRating}
          sx={{ minWidth: 200 }}
        >
          {isSubmitting ? 'Submitting...' : (isEditMode ? 'Update Assessment' : 'Submit Assessment')}
        </Button>
        
        {!overallRating && (
          <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
            Please select an overall competency rating before submitting.
          </Typography>
        )}
      </Box>
    </StepContent>
  )
}

export default ReviewStep