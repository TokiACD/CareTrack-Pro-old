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
  ListItemSecondaryAction,
  Divider,
  Checkbox,
  FormControlLabel,
  ListItemIcon
} from '@mui/material'
import {
  Search as SearchIcon,
  Remove as RemoveIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  PersonAdd as PersonAddIcon,
  TaskAlt as TaskAltIcon,
  AccountBox as PackageIcon
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'
import { API_ENDPOINTS, CarePackage, Carer, Task, CarerPackageAssignment, PackageTaskAssignment } from '@caretrack/shared'
import { useAuth } from '../contexts/AuthContext'
import { useSmartMutation } from '../hooks/useSmartMutation'

// Extended types for assignments
interface ExtendedCarePackage extends CarePackage {
  carerAssignments?: CarerPackageAssignment[]
  taskAssignments?: PackageTaskAssignment[]
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
      id={`assignment-tabpanel-${index}`}
      aria-labelledby={`assignment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const AssignmentsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // State management
  const [selectedPackage, setSelectedPackage] = useState<ExtendedCarePackage | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [carerDialogOpen, setCarerDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedCarerIds, setSelectedCarerIds] = useState<string[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [carerSearchTerm, setCarerSearchTerm] = useState('')
  const [taskSearchTerm, setTaskSearchTerm] = useState('')
  
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

  // Fetch packages with assignments
  const { data: packagesData, isLoading: packagesLoading, error: packagesError } = useQuery({
    queryKey: ['assignments', 'packages'],
    queryFn: async () => {
      const response = await apiService.get(API_ENDPOINTS.ASSIGNMENTS.LIST)
      return response || []
    }
  })

  // Fetch available carers for selected package
  const { data: availableCarers } = useQuery({
    queryKey: ['available-carers', selectedPackage?.id],
    queryFn: async () => {
      if (!selectedPackage?.id) return []
      const response = await apiService.get(`${API_ENDPOINTS.ASSIGNMENTS.AVAILABLE_CARERS}/${selectedPackage.id}/available-carers`)
      return response || []
    },
    enabled: !!selectedPackage?.id && carerDialogOpen
  })

  // Fetch available tasks for selected package
  const { data: availableTasks } = useQuery({
    queryKey: ['available-tasks', selectedPackage?.id],
    queryFn: async () => {
      if (!selectedPackage?.id) return []
      const response = await apiService.get(`${API_ENDPOINTS.ASSIGNMENTS.AVAILABLE_TASKS}/${selectedPackage.id}/available-tasks`)
      return response || []
    },
    enabled: !!selectedPackage?.id && taskDialogOpen
  })

  // Assign multiple carers to package mutation
  const assignCarersMutation = useSmartMutation<any, Error, { carerIds: string[]; packageId: string }>(
    async ({ carerIds, packageId }: { carerIds: string[]; packageId: string }) => {
      const results = await Promise.allSettled(
        carerIds.map(carerId => 
          apiService.post(API_ENDPOINTS.ASSIGNMENTS.CARER_TO_PACKAGE, {
            carerId,
            packageId
          })
        )
      )
      
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length
      
      return { successful, failed, total: carerIds.length }
    },
    {
      mutationType: 'assignments.create',
      customInvalidations: ['available-carers'],
      onSuccess: (data: any) => {
        setCarerDialogOpen(false)
        setSelectedCarerIds([])
        setCarerSearchTerm('')
        
        if (data.failed === 0) {
          showNotification(`${data.successful} carer(s) assigned successfully`, 'success')
        } else {
          showNotification(
            `${data.successful} carer(s) assigned successfully, ${data.failed} failed`, 
            data.successful > 0 ? 'success' : 'error'
          )
        }
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to assign carers',
          'error'
        )
      }
    }
  )

  // Remove carer from package mutation
  const removeCarerMutation = useSmartMutation<any, Error, { carerId: string; packageId: string }>(
    async ({ carerId, packageId }: { carerId: string; packageId: string }) => {
      return await apiService.delete(API_ENDPOINTS.ASSIGNMENTS.CARER_TO_PACKAGE, { carerId, packageId })
    },
    {
      mutationType: 'assignments.delete',
      onSuccess: (data: any) => {
        showNotification(data.message || 'Carer removed successfully', 'success')
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to remove carer',
          'error'
        )
      }
    }
  )

  // Assign multiple tasks to package mutation
  const assignTasksMutation = useSmartMutation<any, Error, { taskIds: string[]; packageId: string }>(
    async ({ taskIds, packageId }: { taskIds: string[]; packageId: string }) => {
      const results = await Promise.allSettled(
        taskIds.map(taskId => 
          apiService.post(API_ENDPOINTS.ASSIGNMENTS.TASK_TO_PACKAGE, {
            taskId,
            packageId
          })
        )
      )
      
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length
      
      return { successful, failed, total: taskIds.length }
    },
    {
      mutationType: 'assignments.create',
      customInvalidations: ['available-tasks'],
      onSuccess: (data: any) => {
        setTaskDialogOpen(false)
        setSelectedTaskIds([])
        setTaskSearchTerm('')
        
        if (data.failed === 0) {
          showNotification(`${data.successful} task(s) assigned successfully`, 'success')
        } else {
          showNotification(
            `${data.successful} task(s) assigned successfully, ${data.failed} failed`, 
            data.successful > 0 ? 'success' : 'error'
          )
        }
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to assign tasks',
          'error'
        )
      }
    }
  )

  // Remove task from package mutation
  const removeTaskMutation = useSmartMutation<any, Error, { taskId: string; packageId: string }>(
    async ({ taskId, packageId }: { taskId: string; packageId: string }) => {
      return await apiService.delete(API_ENDPOINTS.ASSIGNMENTS.TASK_TO_PACKAGE, { taskId, packageId })
    },
    {
      mutationType: 'assignments.delete',
      onSuccess: (data: any) => {
        showNotification(data.message || 'Task removed successfully', 'success')
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to remove task',
          'error'
        )
      }
    }
  )

  // Filter packages
  const filteredPackages = useMemo(() => {
    if (!packagesData) return []
    return (packagesData as ExtendedCarePackage[]).filter((pkg: ExtendedCarePackage) =>
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.postcode.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [packagesData, searchTerm])

  // Filter available carers based on search
  const filteredAvailableCarers = useMemo(() => {
    if (!availableCarers) return []
    const carers = availableCarers as Carer[]
    return carers.filter(carer =>
      carer.name.toLowerCase().includes(carerSearchTerm.toLowerCase()) ||
      carer.email.toLowerCase().includes(carerSearchTerm.toLowerCase())
    )
  }, [availableCarers, carerSearchTerm])

  // Filter available tasks based on search
  const filteredAvailableTasks = useMemo(() => {
    if (!availableTasks) return []
    const tasks = availableTasks as Task[]
    return tasks.filter(task =>
      task.name.toLowerCase().includes(taskSearchTerm.toLowerCase())
    )
  }, [availableTasks, taskSearchTerm])

  // Handle package selection
  const handlePackageClick = (pkg: ExtendedCarePackage) => {
    setSelectedPackage(pkg)
    setTabValue(0)
  }

  const handleBackToList = () => {
    setSelectedPackage(null)
  }

  // Handle carer assignment
  const handleAssignCarers = () => {
    if (selectedCarerIds.length > 0 && selectedPackage) {
      assignCarersMutation.mutate({
        carerIds: selectedCarerIds,
        packageId: selectedPackage.id
      })
    }
  }

  // Handle task assignment
  const handleAssignTasks = () => {
    if (selectedTaskIds.length > 0 && selectedPackage) {
      assignTasksMutation.mutate({
        taskIds: selectedTaskIds,
        packageId: selectedPackage.id
      })
    }
  }

  // Handle carer selection toggle
  const handleCarerSelectionToggle = (carerId: string) => {
    setSelectedCarerIds(prev => 
      prev.includes(carerId) 
        ? prev.filter(id => id !== carerId)
        : [...prev, carerId]
    )
  }

  // Handle task selection toggle
  const handleTaskSelectionToggle = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  // Handle select all carers
  const handleSelectAllCarers = () => {
    if (selectedCarerIds.length === filteredAvailableCarers.length) {
      setSelectedCarerIds([])
    } else {
      setSelectedCarerIds(filteredAvailableCarers.map(carer => carer.id))
    }
  }

  // Handle select all tasks
  const handleSelectAllTasks = () => {
    if (selectedTaskIds.length === filteredAvailableTasks.length) {
      setSelectedTaskIds([])
    } else {
      setSelectedTaskIds(filteredAvailableTasks.map(task => task.id))
    }
  }

  // Handle remove carer
  const handleRemoveCarer = (carerId: string) => {
    if (selectedPackage) {
      removeCarerMutation.mutate({
        carerId,
        packageId: selectedPackage.id
      })
    }
  }

  // Handle remove task
  const handleRemoveTask = (taskId: string) => {
    if (selectedPackage) {
      removeTaskMutation.mutate({
        taskId,
        packageId: selectedPackage.id
      })
    }
  }

  if (packagesError) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load assignments. Please try again.
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
          <GroupIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Assignment Management
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
            <GroupIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Assignments
          </Typography>
          {selectedPackage && (
            <Typography color="text.primary">{selectedPackage.name}</Typography>
          )}
        </Breadcrumbs>
      </Container>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        {!selectedPackage ? (
          // Package List View
          <Card elevation={2}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <PackageIcon color="primary" />
                  <Typography variant="h5" component="div">
                    Care Packages
                  </Typography>
                </Box>
              }
              subheader="Click a package to manage carer and task assignments"
            />
            
            <CardContent>
              {/* Search */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  placeholder="Search packages..."
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
              {packagesLoading && (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              )}

              {/* Packages Table */}
              {!packagesLoading && (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Package Name</TableCell>
                        <TableCell align="center">Postcode</TableCell>
                        <TableCell align="center">Assigned Carers</TableCell>
                        <TableCell align="center">Assigned Tasks</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPackages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              {searchTerm ? 'No packages found matching your search.' : 'No packages available.'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPackages.map((pkg: ExtendedCarePackage) => (
                          <TableRow
                            key={pkg.id}
                            sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {pkg.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={pkg.postcode} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={pkg.carerAssignments?.filter(a => a.isActive).length || 0}
                                size="small"
                                color="info"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={pkg.taskAssignments?.filter(a => a.isActive).length || 0}
                                size="small"
                                color="success"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handlePackageClick(pkg)}
                              >
                                Manage
                              </Button>
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
          // Package Detail View
          <Card elevation={2}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <PackageIcon color="primary" />
                  <Typography variant="h5" component="div">
                    {selectedPackage.name}
                  </Typography>
                  <Chip label={selectedPackage.postcode} size="small" variant="outlined" />
                </Box>
              }
              subheader="Manage carer and task assignments for this package"
              action={
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBackToList}
                >
                  Back to Packages
                </Button>
              }
            />
            
            <CardContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <GroupIcon />
                        Assigned Carers ({selectedPackage.carerAssignments?.filter((a: any) => a.isActive).length || 0})
                      </Box>
                    } 
                  />
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <AssignmentIcon />
                        Assigned Tasks ({selectedPackage.taskAssignments?.filter((a: any) => a.isActive).length || 0})
                      </Box>
                    } 
                  />
                </Tabs>
              </Box>

              {/* Assigned Carers Tab */}
              <TabPanel value={tabValue} index={0}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Assigned Carers</Typography>
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => setCarerDialogOpen(true)}
                  >
                    Assign Carer
                  </Button>
                </Box>

                {selectedPackage.carerAssignments?.filter((a: any) => a.isActive).length === 0 ? (
                  <Alert severity="info">
                    No carers assigned to this package yet. Click "Assign Carer" to get started.
                  </Alert>
                ) : (
                  <List>
                    {selectedPackage.carerAssignments
                      ?.filter((a: any) => a.isActive)
                      .map((assignment: any) => (
                        <React.Fragment key={assignment.id}>
                          <ListItem>
                            <ListItemText
                              primary={assignment.carer?.name}
                              secondary={`Email: ${assignment.carer?.email} • Assigned: ${new Date(assignment.assignedAt).toLocaleDateString()}`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                color="error"
                                onClick={() => handleRemoveCarer(assignment.carerId)}
                                disabled={removeCarerMutation.isPending}
                              >
                                <RemoveIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                  </List>
                )}
              </TabPanel>

              {/* Assigned Tasks Tab */}
              <TabPanel value={tabValue} index={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Assigned Tasks</Typography>
                  <Button
                    variant="contained"
                    startIcon={<TaskAltIcon />}
                    onClick={() => setTaskDialogOpen(true)}
                  >
                    Assign Task
                  </Button>
                </Box>

                {selectedPackage.taskAssignments?.filter((a: any) => a.isActive).length === 0 ? (
                  <Alert severity="info">
                    No tasks assigned to this package yet. Click "Assign Task" to get started.
                  </Alert>
                ) : (
                  <List>
                    {selectedPackage.taskAssignments
                      ?.filter((a: any) => a.isActive)
                      .map((assignment: any) => (
                        <React.Fragment key={assignment.id}>
                          <ListItem>
                            <ListItemText
                              primary={assignment.task?.name}
                              secondary={`Target Count: ${assignment.task?.targetCount} • Assigned: ${new Date(assignment.assignedAt).toLocaleDateString()}`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                color="error"
                                onClick={() => handleRemoveTask(assignment.taskId)}
                                disabled={removeTaskMutation.isPending}
                              >
                                <RemoveIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
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

      {/* Assign Carer Dialog */}
      <Dialog open={carerDialogOpen} onClose={() => setCarerDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Assign Carers to {selectedPackage?.name}
          {selectedCarerIds.length > 0 && (
            <Chip 
              label={`${selectedCarerIds.length} selected`} 
              size="small" 
              color="primary" 
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Search Field */}
            <TextField
              fullWidth
              placeholder="Search carers by name or email..."
              value={carerSearchTerm}
              onChange={(e) => setCarerSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {filteredAvailableCarers.length === 0 ? (
              <Alert severity="info">
                {carerSearchTerm 
                  ? 'No carers found matching your search.' 
                  : 'No available carers to assign. All active carers may already be assigned to this package.'
                }
              </Alert>
            ) : (
              <Box>
                {/* Select All Option */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCarerIds.length === filteredAvailableCarers.length && filteredAvailableCarers.length > 0}
                      indeterminate={selectedCarerIds.length > 0 && selectedCarerIds.length < filteredAvailableCarers.length}
                      onChange={handleSelectAllCarers}
                    />
                  }
                  label={`Select All (${filteredAvailableCarers.length})`}
                  sx={{ mb: 1 }}
                />
                
                {/* Carer List */}
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {filteredAvailableCarers.map((carer: Carer) => (
                    <ListItem key={carer.id} dense>
                      <ListItemIcon>
                        <Checkbox
                          checked={selectedCarerIds.includes(carer.id)}
                          onChange={() => handleCarerSelectionToggle(carer.id)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={carer.name}
                        secondary={carer.email}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCarerDialogOpen(false)
            setSelectedCarerIds([])
            setCarerSearchTerm('')
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignCarers}
            variant="contained"
            disabled={selectedCarerIds.length === 0 || assignCarersMutation.isPending}
          >
            {assignCarersMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              `Assign ${selectedCarerIds.length} Carer${selectedCarerIds.length === 1 ? '' : 's'}`
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Assign Tasks to {selectedPackage?.name}
          {selectedTaskIds.length > 0 && (
            <Chip 
              label={`${selectedTaskIds.length} selected`} 
              size="small" 
              color="primary" 
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Search Field */}
            <TextField
              fullWidth
              placeholder="Search tasks by name..."
              value={taskSearchTerm}
              onChange={(e) => setTaskSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {filteredAvailableTasks.length === 0 ? (
              <Alert severity="info">
                {taskSearchTerm 
                  ? 'No tasks found matching your search.' 
                  : 'No available tasks to assign. All active tasks may already be assigned to this package.'
                }
              </Alert>
            ) : (
              <Box>
                {/* Select All Option */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedTaskIds.length === filteredAvailableTasks.length && filteredAvailableTasks.length > 0}
                      indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < filteredAvailableTasks.length}
                      onChange={handleSelectAllTasks}
                    />
                  }
                  label={`Select All (${filteredAvailableTasks.length})`}
                  sx={{ mb: 1 }}
                />
                
                {/* Task List */}
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {filteredAvailableTasks.map((task: Task) => (
                    <ListItem key={task.id} dense>
                      <ListItemIcon>
                        <Checkbox
                          checked={selectedTaskIds.includes(task.id)}
                          onChange={() => handleTaskSelectionToggle(task.id)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={task.name}
                        secondary={`Target: ${task.targetCount} completions`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTaskDialogOpen(false)
            setSelectedTaskIds([])
            setTaskSearchTerm('')
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignTasks}
            variant="contained"
            disabled={selectedTaskIds.length === 0 || assignTasksMutation.isPending}
          >
            {assignTasksMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              `Assign ${selectedTaskIds.length} Task${selectedTaskIds.length === 1 ? '' : 's'}`
            )}
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

export default AssignmentsPage