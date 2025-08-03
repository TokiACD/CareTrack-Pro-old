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
  Menu,
  MenuItem,
  Snackbar,
  Container,
  AppBar,
  Toolbar,
  Breadcrumbs,
  Link,
} from '@mui/material'
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'
import { API_ENDPOINTS, Task } from '@caretrack/shared'
import { useAuth } from '../contexts/AuthContext'
import { useSmartMutation } from '../hooks/useSmartMutation'

interface TaskFormData {
  name: string
  targetCount: number
}


const TasksPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [usageDialogOpen, setUsageDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    targetCount: 1
  })
  
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

  // Fetch tasks (only active tasks, deleted ones managed via Recycle Bin)
  const { data: tasksData, isLoading, error } = useQuery<Task[]>({
    queryKey: ['tasks', searchTerm],
    queryFn: async (): Promise<Task[]> => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await apiService.get(`${API_ENDPOINTS.TASKS.LIST}?${params}`)
      return response as Task[]
    }
  })

  // Fetch task usage
  const { data: taskUsage } = useQuery<{ data: { packageCount: number; assessmentCount: number; competencyRatingCount: number; progressRecordCount: number } } | null>({
    queryKey: ['task-usage', selectedTask?.id],
    queryFn: async () => {
      if (!selectedTask?.id) return null
      const response = await apiService.get(`${API_ENDPOINTS.TASKS.LIST}/${selectedTask.id}/usage`)
      return response as { data: { packageCount: number; assessmentCount: number; competencyRatingCount: number; progressRecordCount: number } }
    },
    enabled: !!selectedTask?.id && usageDialogOpen
  })

  // Create task mutation
  const createTaskMutation = useSmartMutation<any, Error, TaskFormData>(
    async (data: TaskFormData) => {
      return await apiService.post(API_ENDPOINTS.TASKS.CREATE, data)
    },
    {
      mutationType: 'tasks.create',
      onSuccess: () => {
        setDialogOpen(false)
        resetForm()
        showNotification('Task created successfully', 'success')
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to create task',
          'error'
        )
      }
    }
  )

  // Update task mutation
  const updateTaskMutation = useSmartMutation<any, Error, { id: string; data: Partial<TaskFormData> }>(
    async ({ id, data }: { id: string; data: Partial<TaskFormData> }) => {
      return await apiService.put(`${API_ENDPOINTS.TASKS.UPDATE}/${id}`, data)
    },
    {
      mutationType: 'tasks.update',
      onSuccess: () => {
        setDialogOpen(false)
        setEditingTask(null)
        resetForm()
        showNotification('Task updated successfully', 'success')
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to update task',
          'error'
        )
      }
    }
  )

  // Delete task mutation
  const deleteTaskMutation = useSmartMutation<any, Error, string>(
    async (id: string) => {
      return await apiService.deleteWithResponse(`${API_ENDPOINTS.TASKS.DELETE}/${id}`)
    },
    {
      mutationType: 'tasks.delete',
      onSuccess: () => {
        handleMenuClose()
        showNotification('Task deleted successfully', 'success')
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to delete task',
          'error'
        )
      }
    }
  )


  // Form handlers
  const resetForm = () => {
    setFormData({
      name: '',
      targetCount: 1
    })
  }

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task)
      setFormData({
        name: task.name,
        targetCount: task.targetCount
      })
    } else {
      setEditingTask(null)
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingTask(null)
    resetForm()
  }

  const handleSubmit = () => {
    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask.id,
        data: formData
      })
    } else {
      createTaskMutation.mutate(formData)
    }
  }

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, task: Task) => {
    setAnchorEl(event.currentTarget)
    setSelectedTask(task)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedTask(null)
  }

  const handleEdit = () => {
    if (selectedTask) {
      handleOpenDialog(selectedTask)
    }
    handleMenuClose()
  }

  const handleDelete = () => {
    if (selectedTask) {
      deleteTaskMutation.mutate(selectedTask.id)
    }
  }


  const handleShowUsage = () => {
    setUsageDialogOpen(true)
    handleMenuClose()
  }

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasksData || []
  }, [tasksData])

  // Form validation
  const isFormValid = formData.name.trim().length > 0 && formData.targetCount >= 1

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load tasks. Please try again.
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
          <AssignmentIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Task Management
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
            <AssignmentIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Tasks
          </Typography>
        </Breadcrumbs>
      </Container>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Card elevation={2}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <AssignmentIcon color="primary" />
                <Typography variant="h5" component="div">
                  Tasks
                </Typography>
              </Box>
            }
            subheader="Manage task definitions and target completion counts"
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                disabled={isLoading}
              >
                Add Task
              </Button>
            }
          />
          
          <CardContent>
            {/* Search */}
            <Box sx={{ mb: 3 }}>
              <TextField
                placeholder="Search tasks..."
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
            {isLoading && (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            )}

            {/* Tasks Table */}
            {!isLoading && (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Task Name</TableCell>
                      <TableCell align="center">Target Count</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Created</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            {searchTerm ? 'No tasks found matching your search.' : 'No tasks created yet.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task: Task) => (
                        <TableRow
                          key={task.id}
                          sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {task.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={task.targetCount}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label="Active"
                              size="small"
                              color="success"
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" color="text.secondary">
                              {new Date(task.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, task)}
                            >
                              <MoreVertIcon />
                            </IconButton>
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
      </Container>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Task Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              helperText="Enter a descriptive name for this task"
            />
            <TextField
              label="Target Count"
              type="number"
              value={formData.targetCount}
              onChange={(e) => setFormData({ ...formData, targetCount: parseInt(e.target.value) || 1 })}
              fullWidth
              required
              inputProps={{ min: 1, max: 9999 }}
              helperText="Number of completions needed to reach 100%"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!isFormValid || createTaskMutation.isPending || updateTaskMutation.isPending}
          >
            {createTaskMutation.isPending || updateTaskMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              editingTask ? 'Update' : 'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Usage Dialog */}
      <Dialog open={usageDialogOpen} onClose={() => setUsageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Task Usage: {selectedTask?.name}
        </DialogTitle>
        <DialogContent>
          {taskUsage && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6" gutterBottom>
                Usage Summary
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary">
                    {taskUsage?.data?.packageCount || 0}
                  </Typography>
                  <Typography variant="body2">Packages</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary">
                    {taskUsage?.data?.assessmentCount || 0}
                  </Typography>
                  <Typography variant="body2">Assessments</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary">
                    {taskUsage?.data?.competencyRatingCount || 0}
                  </Typography>
                  <Typography variant="body2">Competency Ratings</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary">
                    {taskUsage?.data?.progressRecordCount || 0}
                  </Typography>
                  <Typography variant="body2">Progress Records</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedTask && !selectedTask.deletedAt && (
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
        )}
        <MenuItem onClick={handleShowUsage}>
          <InfoIcon sx={{ mr: 1 }} fontSize="small" />
          View Usage
        </MenuItem>
        {selectedTask && !selectedTask.deletedAt && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            Delete
          </MenuItem>
        )}
      </Menu>

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

export default TasksPage