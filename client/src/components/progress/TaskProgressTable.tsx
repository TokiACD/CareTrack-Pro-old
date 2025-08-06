import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  LinearProgress,
  Typography,
  Box,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Assessment,
  Info,
  Lock
} from '@mui/icons-material'

interface TaskProgressDetail {
  taskId: string
  taskName: string
  targetCount: number
  completionCount: number
  completionPercentage: number
  competencyLevel: string
  competencySource: string
  lastUpdated?: Date
  canTakeAssessment: boolean
  assessmentId?: string
  assessmentName?: string
}

interface TaskProgressTableProps {
  tasks: TaskProgressDetail[]
  onTakeAssessment?: (taskId: string, assessmentId: string) => void
  onManageCompetency?: (taskId: string, taskName: string) => void
  showAssessmentColumn?: boolean
}

const TaskProgressTable: React.FC<TaskProgressTableProps> = ({
  tasks,
  onTakeAssessment,
  onManageCompetency,
  showAssessmentColumn = true
}) => {
  const getCompetencyColor = (level: string) => {
    switch (level) {
      case 'EXPERT':
        return 'success'
      case 'PROFICIENT':
        return 'info'
      case 'COMPETENT':
        return 'primary'
      case 'ADVANCED_BEGINNER':
        return 'warning'
      case 'NOT_COMPETENT':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatCompetencyLevel = (level: string) => {
    return level.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'success'
    if (percentage >= 60) return 'info'
    if (percentage >= 40) return 'warning'
    return 'error'
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Task</TableCell>
            <TableCell align="center">Progress</TableCell>
            <TableCell align="center">Completion</TableCell>
            <TableCell align="center">Competency</TableCell>
            {showAssessmentColumn && <TableCell align="center">Assessment</TableCell>}
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.taskId} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {task.taskName}
                </Typography>
                {task.lastUpdated && (
                  <Typography variant="caption" color="text.secondary">
                    Updated: {new Date(task.lastUpdated).toLocaleDateString()}
                  </Typography>
                )}
              </TableCell>
              
              <TableCell align="center">
                <Box sx={{ minWidth: 120 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={task.completionPercentage}
                      color={getProgressColor(task.completionPercentage)}
                      sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption">
                      {task.completionPercentage}%
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              
              <TableCell align="center">
                <Typography variant="body2">
                  {task.completionCount} / {task.targetCount}
                </Typography>
              </TableCell>
              
              <TableCell align="center">
                <Chip
                  size="small"
                  label={formatCompetencyLevel(task.competencyLevel)}
                  color={getCompetencyColor(task.competencyLevel) as any}
                  variant={task.competencySource === 'MANUAL' ? 'filled' : 'outlined'}
                />
                {task.competencySource === 'MANUAL' && (
                  <Tooltip title="Manually set by administrator">
                    <Lock fontSize="small" sx={{ ml: 0.5, color: 'text.secondary' }} />
                  </Tooltip>
                )}
              </TableCell>
              
              {showAssessmentColumn && (
                <TableCell align="center">
                  {task.assessmentName ? (
                    <Chip
                      size="small"
                      label={task.assessmentName}
                      variant="outlined"
                      color="info"
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No assessment
                    </Typography>
                  )}
                </TableCell>
              )}
              
              <TableCell align="center">
                <Box display="flex" gap={1} justifyContent="center">
                  {task.canTakeAssessment && task.assessmentId && onTakeAssessment && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Assessment />}
                      onClick={() => onTakeAssessment(task.taskId, task.assessmentId!)}
                    >
                      Assess
                    </Button>
                  )}
                  
                  {onManageCompetency && (
                    <Tooltip title="Manually set competency level">
                      <IconButton
                        size="small"
                        onClick={() => onManageCompetency(task.taskId, task.taskName)}
                      >
                        <Info />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default TaskProgressTable