import React from 'react'
import {
  Box,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material'
import {
  Assessment,
  CheckCircle,
  Refresh,
  Lock,
  CheckCircleOutline,
  Info
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

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

interface CarerPackageProgress {
  packageId: string
  packageName: string
  packagePostcode: string
  assignedAt: Date
  tasks: TaskProgressDetail[]
  averageProgress: number
  competencyRatings: any[]
}

interface PackageProgressTabProps {
  packageData: CarerPackageProgress
  onManageCompetency: (task: TaskProgressDetail) => void
  onResetProgress: (taskId: string, packageId: string, taskName: string) => void
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

const getCompetencyLabel = (level: string) => {
  switch (level) {
    case 'EXPERT': return 'Expert'
    case 'PROFICIENT': return 'Proficient'
    case 'COMPETENT': return 'Competent'
    case 'ADVANCED_BEGINNER': return 'Advanced Beginner'
    case 'NOT_COMPETENT': return 'Not Competent'
    case 'NOT_ASSESSED': return 'Not Assessed'
    default: return level
  }
}

const getProgressColor = (progress: number): 'error' | 'warning' | 'info' | 'success' => {
  if (progress < 25) return 'error'
  if (progress < 50) return 'warning'
  if (progress < 75) return 'info'
  return 'success'
}

const groupTasksByAssessment = (tasks: TaskProgressDetail[]) => {
  const assessmentGroups = new Map<string, { assessmentName: string; tasks: TaskProgressDetail[] }>()
  const standaloneTasks: TaskProgressDetail[] = []
  
  tasks.forEach(task => {
    if (task.assessmentId && task.assessmentName) {
      if (!assessmentGroups.has(task.assessmentId)) {
        assessmentGroups.set(task.assessmentId, {
          assessmentName: task.assessmentName,
          tasks: []
        })
      }
      assessmentGroups.get(task.assessmentId)!.tasks.push(task)
    } else {
      standaloneTasks.push(task)
    }
  })
  
  return {
    assessmentGroups: Array.from(assessmentGroups.entries()).map(([id, group]) => ({
      assessmentId: id,
      assessmentName: group.assessmentName,
      tasks: group.tasks
    })),
    standaloneTasks
  }
}

const getAssessmentGroupState = (tasks: TaskProgressDetail[]) => {
  const allTasksComplete = tasks.every(task => task.completionPercentage === 100)
  
  const hasAssessmentRating = tasks.some(task => 
    task.competencyLevel !== 'NOT_ASSESSED' && task.competencySource === 'ASSESSMENT'
  )
  
  if (hasAssessmentRating) {
    return {
      state: 'completed',
      label: 'Assessment Complete',
      icon: <CheckCircleOutline />,
      color: 'success' as const,
      variant: 'contained' as const,
      description: 'Assessment has been completed'
    }
  } else if (allTasksComplete) {
    return {
      state: 'ready',
      label: 'Take Assessment',
      icon: <Assessment />,
      color: 'primary' as const,
      variant: 'contained' as const,
      description: 'All tasks complete - ready to take assessment'
    }
  } else {
    const completedTasks = tasks.filter(task => task.completionPercentage === 100).length
    return {
      state: 'locked',
      label: `${completedTasks}/${tasks.length} Complete`,
      icon: <Lock />,
      color: 'inherit' as const,
      variant: 'outlined' as const,
      description: 'Complete all tasks to unlock assessment',
      disabled: true
    }
  }
}

const TaskRow: React.FC<{
  task: TaskProgressDetail
  packageData: CarerPackageProgress
  onManageCompetency: (task: TaskProgressDetail) => void
  onResetProgress: (taskId: string, packageId: string, taskName: string) => void
}> = ({ task, packageData, onManageCompetency, onResetProgress }) => {
  return (
    <TableRow 
      key={task.taskId}
      sx={{
        backgroundColor: task.assessmentId ? 'rgba(33, 150, 243, 0.02)' : 'inherit',
        '&:hover': {
          backgroundColor: task.assessmentId ? 'rgba(33, 150, 243, 0.06)' : 'rgba(0, 0, 0, 0.04)'
        }
      }}
    >
      <TableCell>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Typography variant="subtitle2">{task.taskName}</Typography>
        </Box>
        {task.lastUpdated && (
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date(task.lastUpdated).toLocaleDateString()}
          </Typography>
        )}
      </TableCell>
      <TableCell align="center">
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={task.completionPercentage} 
            color={getProgressColor(task.completionPercentage)}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary">
            {task.completionPercentage}%
          </Typography>
        </Box>
      </TableCell>
      <TableCell align="center">
        <Box sx={{ minWidth: 140 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LinearProgress
              variant="determinate"
              value={task.completionPercentage}
              color={getProgressColor(task.completionPercentage)}
              sx={{ 
                flexGrow: 1, 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'rgba(0,0,0,0.1)'
              }}
            />
            <Typography variant="caption" fontWeight="medium">
              {task.completionPercentage}%
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mt={0.5}>
            <Typography variant="caption" color="text.secondary">
              {task.completionCount}/{task.targetCount} completed
            </Typography>
            {task.completionPercentage === 100 && (
              <Chip
                size="small"
                label="Complete"
                color="success"
                variant="filled"
                sx={{ fontSize: '0.65rem', height: 18 }}
              />
            )}
          </Box>
        </Box>
      </TableCell>
      <TableCell align="center">
        <Box display="flex" alignItems="center" gap={0.5}>
          <Chip
            label={getCompetencyLabel(task.competencyLevel)}
            size="small"
            sx={{
              backgroundColor: getCompetencyColor(task.competencyLevel),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
          {task.competencySource === 'MANUAL' && (
            <Tooltip title="Manually set by administrator">
              <Info sx={{ fontSize: 16, color: 'info.main' }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell align="center">
        <Box display="flex" alignItems="center" gap={0.5}>
          <IconButton
            size="small"
            onClick={() => onManageCompetency(task)}
            title="Set Competency"
          >
            <CheckCircle />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onResetProgress(task.taskId, packageData.packageId, task.taskName)}
            title="Reset Progress"
            color="warning"
          >
            <Refresh />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  )
}

const PackageProgressTab: React.FC<PackageProgressTabProps> = ({
  packageData,
  onManageCompetency,
  onResetProgress,
  carerId
}) => {
  const navigate = useNavigate()

  const renderTaskProgressTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Task Name</TableCell>
            <TableCell align="center">Progress</TableCell>
            <TableCell align="center">Completion</TableCell>
            <TableCell align="center">Competency</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(() => {
            const { assessmentGroups, standaloneTasks } = groupTasksByAssessment(packageData.tasks)
            
            return (
              <>
                {/* Assessment Groups */}
                {assessmentGroups.map((group) => (
                  <React.Fragment key={group.assessmentId}>
                    {/* Assessment Header Row */}
                    <TableRow>
                      <TableCell 
                        colSpan={5} 
                        sx={{ 
                          backgroundColor: 'rgba(33, 150, 243, 0.1)',
                          borderTop: '2px solid rgba(33, 150, 243, 0.3)',
                          py: 2
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Assessment color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                              Assessment: {group.assessmentName}
                            </Typography>
                            <Chip 
                              label={`${group.tasks.length} tasks`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                          <Box>
                            {(() => {
                              const assessmentState = getAssessmentGroupState(group.tasks)
                              return (
                                <Tooltip title={assessmentState.description}>
                                  <span>
                                    <Button
                                      size="medium"
                                      variant={assessmentState.variant}
                                      color={assessmentState.color}
                                      startIcon={assessmentState.icon}
                                      disabled={assessmentState.disabled}
                                      onClick={() => {
                                        if (assessmentState.state === 'ready' && carerId) {
                                          navigate(`/assessments/${group.assessmentId}/take/${carerId}`)
                                        }
                                      }}
                                      sx={{ minWidth: 160 }}
                                    >
                                      {assessmentState.label}
                                    </Button>
                                  </span>
                                </Tooltip>
                              )
                            })()}
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Assessment Tasks */}
                    {group.tasks.map((task) => (
                      <TaskRow
                        key={task.taskId}
                        task={task}
                        packageData={packageData}
                        onManageCompetency={onManageCompetency}
                        onResetProgress={onResetProgress}
                      />
                    ))}
                  </React.Fragment>
                ))}
                
                {/* Standalone Tasks */}
                {standaloneTasks.length > 0 && (
                  <>
                    {assessmentGroups.length > 0 && (
                      <TableRow>
                        <TableCell 
                          colSpan={5} 
                          sx={{ 
                            backgroundColor: 'rgba(158, 158, 158, 0.1)',
                            borderTop: '1px solid rgba(158, 158, 158, 0.3)',
                            py: 1
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
                              Individual Tasks
                            </Typography>
                            <Chip 
                              label={`${standaloneTasks.length} tasks`}
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {standaloneTasks.map((task) => (
                      <TaskRow
                        key={task.taskId}
                        task={task}
                        packageData={packageData}
                        onManageCompetency={onManageCompetency}
                        onResetProgress={onResetProgress}
                      />
                    ))}
                  </>
                )}
              </>
            )
          })()}
        </TableBody>
      </Table>
    </TableContainer>
  )

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {packageData.packageName} ({packageData.packagePostcode})
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Assigned: {new Date(packageData.assignedAt).toLocaleDateString()} • 
          Average Progress: {packageData.averageProgress}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={packageData.averageProgress}
          sx={{ height: 8, borderRadius: 4, mb: 2 }}
        />
      </Box>
      {renderTaskProgressTable()}
    </Box>
  )
}

export default PackageProgressTab