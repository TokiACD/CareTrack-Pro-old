import React from 'react'
import {
  StepContent,
  Typography,
  Box,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { PracticalRating } from '@caretrack/shared'

interface PracticalSkill {
  id: string
  skillDescription: string
  canBeNotApplicable: boolean
  order: number
}

interface PracticalResponseData {
  skillId: string
  rating: PracticalRating
}

interface PracticalSkillsStepProps {
  skills: PracticalSkill[]
  responses: PracticalResponseData[]
  onResponseChange: (skillId: string, rating: PracticalRating) => void
}

const PracticalSkillsStep: React.FC<PracticalSkillsStepProps> = ({
  skills,
  responses,
  onResponseChange
}) => {
  const getSkillStatusColor = (rating: PracticalRating) => {
    switch (rating) {
      case PracticalRating.COMPETENT:
        return 'success'
      case PracticalRating.NEEDS_SUPPORT:
        return 'warning'
      case PracticalRating.NOT_APPLICABLE:
        return 'default'
      default:
        return 'default'
    }
  }

  const getSkillStatusLabel = (rating: PracticalRating) => {
    switch (rating) {
      case PracticalRating.COMPETENT:
        return 'Competent'
      case PracticalRating.NEEDS_SUPPORT:
        return 'Needs Support'
      case PracticalRating.NOT_APPLICABLE:
        return 'Not Applicable'
      default:
        return 'Not Rated'
    }
  }

  return (
    <StepContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Rate the carer's competency for each practical skill demonstrated.
      </Typography>
      
      {skills.map((skill, index) => {
        const response = responses.find(r => r.skillId === skill.id)
        const isRated = !!response?.rating

        return (
          <Card 
            key={skill.id} 
            variant="outlined" 
            sx={{ 
              mb: 2, 
              backgroundColor: isRated ? 'success.light' : 'background.paper',
              border: isRated ? '2px solid' : '1px solid',
              borderColor: isRated ? 'success.main' : 'divider'
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
                  {isRated && <CheckCircleIcon color="success" />}
                  <Typography variant="subtitle1" sx={{ fontWeight: isRated ? 600 : 400 }}>
                    Skill {index + 1}: {skill.skillDescription}
                  </Typography>
                </Box>
                {isRated && (
                  <Chip 
                    label={getSkillStatusLabel(response!.rating)} 
                    size="small" 
                    color={getSkillStatusColor(response!.rating) as any}
                    variant="filled"
                  />
                )}
              </Box>
              
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
                  Rate this skill:
                </FormLabel>
                <RadioGroup
                  row
                  value={response?.rating || ''}
                  onChange={(e) => onResponseChange(skill.id, e.target.value as PracticalRating)}
                >
                  <FormControlLabel
                    value={PracticalRating.COMPETENT}
                    control={<Radio color="success" />}
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <CheckCircleIcon color="success" fontSize="small" />
                        Competent
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value={PracticalRating.NEEDS_SUPPORT}
                    control={<Radio color="warning" />}
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <WarningIcon color="warning" fontSize="small" />
                        Needs Support
                      </Box>
                    }
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
    </StepContent>
  )
}

export default PracticalSkillsStep