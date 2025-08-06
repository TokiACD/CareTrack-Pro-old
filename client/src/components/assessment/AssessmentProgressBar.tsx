import React from 'react'
import {
  Box,
  LinearProgress,
  Typography,
  Chip,
  Paper
} from '@mui/material'
import {
  Timer as TimerIcon,
  Save as SaveIcon,
  CloudDone as CloudDoneIcon,
  Error as ErrorIcon
} from '@mui/icons-material'

interface AssessmentStats {
  knowledge: { complete: number; total: number }
  practical: { complete: number; total: number }
  emergency: { complete: number; total: number }
}

interface AssessmentProgressBarProps {
  stats: AssessmentStats
  totalSections: number
  completedSections: number
  isEditMode: boolean
  draftStatus?: 'saving' | 'saved' | 'error'
  lastSaved?: Date
  onSaveDraft?: () => void
}

const AssessmentProgressBar: React.FC<AssessmentProgressBarProps> = ({
  stats,
  totalSections,
  completedSections,
  isEditMode,
  draftStatus,
  lastSaved,
  onSaveDraft
}) => {
  const totalQuestions = stats.knowledge.total + stats.practical.total + stats.emergency.total
  const completedQuestions = stats.knowledge.complete + stats.practical.complete + stats.emergency.complete
  const progressPercentage = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0

  const getDraftStatusIcon = () => {
    switch (draftStatus) {
      case 'saving':
        return <SaveIcon fontSize="small" />
      case 'saved':
        return <CloudDoneIcon fontSize="small" />
      case 'error':
        return <ErrorIcon fontSize="small" />
      default:
        return <TimerIcon fontSize="small" />
    }
  }

  const getDraftStatusColor = () => {
    switch (draftStatus) {
      case 'saving':
        return 'warning'
      case 'saved':
        return 'success'
      case 'error':
        return 'error'
      default:
        return 'default'
    }
  }

  const getDraftStatusText = () => {
    switch (draftStatus) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        return lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Saved'
      case 'error':
        return 'Save failed'
      default:
        return 'Not saved'
    }
  }

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">
          Assessment Progress
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {!isEditMode && (
            <Chip
              icon={getDraftStatusIcon()}
              label={getDraftStatusText()}
              size="small"
              color={getDraftStatusColor() as any}
              variant="outlined"
              onClick={onSaveDraft}
              clickable={!!onSaveDraft}
            />
          )}
          <Typography variant="body2" color="text.secondary">
            Section {completedSections + 1} of {totalSections}
          </Typography>
        </Box>
      </Box>
      
      <LinearProgress 
        variant="determinate" 
        value={progressPercentage} 
        sx={{ mb: 2, height: 8, borderRadius: 4 }} 
      />
      
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {completedQuestions} of {totalQuestions} questions completed ({Math.round(progressPercentage)}%)
        </Typography>
        <Box display="flex" gap={1}>
          {stats.knowledge.total > 0 && (
            <Chip 
              label={`Knowledge: ${stats.knowledge.complete}/${stats.knowledge.total}`}
              size="small"
              color={stats.knowledge.complete === stats.knowledge.total ? 'success' : 'default'}
              variant="outlined"
            />
          )}
          {stats.practical.total > 0 && (
            <Chip 
              label={`Practical: ${stats.practical.complete}/${stats.practical.total}`}
              size="small"
              color={stats.practical.complete === stats.practical.total ? 'success' : 'default'}
              variant="outlined"
            />
          )}
          {stats.emergency.total > 0 && (
            <Chip 
              label={`Emergency: ${stats.emergency.complete}/${stats.emergency.total}`}
              size="small"
              color={stats.emergency.complete === stats.emergency.total ? 'success' : 'default'}
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    </Paper>
  )
}

export default AssessmentProgressBar