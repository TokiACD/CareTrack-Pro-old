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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination
} from '@mui/material'
import {
  Search as SearchIcon,
  Restore as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Delete as DeleteIcon,
  CleaningServices as CleanupIcon,
  Warning as WarningIcon,
  Check as CheckIcon
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'
import { API_ENDPOINTS } from '@caretrack/shared'
import { useAuth } from '../contexts/AuthContext'
import { useSmartMutation } from '../hooks/useSmartMutation'

// Define entity type options
const entityTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'adminUsers', label: 'Admin Users' },
  { value: 'carers', label: 'Carers' },
  { value: 'carePackages', label: 'Care Packages' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'assessments', label: 'Assessments' }
]

interface DeletedItem {
  id: string
  entityType: string
  displayName: string
  deletedAt: string
  createdAt: string
  updatedAt: string
  email?: string
  phone?: string
  postcode?: string
  targetCount?: number
}

const RecycleBinPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [entityType, setEntityType] = useState('all')
  const [page, setPage] = useState(1)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DeletedItem | null>(null)
  
  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'warning'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // Helper function to show notifications
  const showNotification = (message: string, severity: 'success' | 'error' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity
    })
  }

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }))
  }

  // Fetch deleted items
  const { data: recycleBinData, isLoading, error, refetch } = useQuery({
    queryKey: ['recycle-bin', page, searchTerm, entityType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(entityType !== 'all' && { entityType })
      })
      const response = await apiService.getFullResponse(`${API_ENDPOINTS.RECYCLE_BIN.LIST}?${params}`)
      return response
    }
  })

  // Restore item mutation
  const restoreItemMutation = useSmartMutation<any, Error, { entityType: string; entityId: string }>(
    async ({ entityType, entityId }) => {
      return await apiService.post(API_ENDPOINTS.RECYCLE_BIN.RESTORE, { entityType, entityId })
    },
    {
      mutationType: 'recycle-bin.restore',
      onSuccess: (data: any) => {
        setRestoreDialogOpen(false)
        setSelectedItem(null)
        refetch()
        showNotification(data.message || 'Item restored successfully', 'success')
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to restore item',
          'error'
        )
      }
    }
  )

  // Permanent delete mutation
  const permanentDeleteMutation = useSmartMutation<any, Error, { entityType: string; entityId: string }>(
    async ({ entityType, entityId }) => {
      return await apiService.delete(API_ENDPOINTS.RECYCLE_BIN.PERMANENT_DELETE, { entityType, entityId })
    },
    {
      mutationType: 'recycle-bin.delete',
      onSuccess: (data: any) => {
        setDeleteDialogOpen(false)
        setSelectedItem(null)
        refetch()
        showNotification(data.message || 'Item permanently deleted', 'success')
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to permanently delete item',
          'error'
        )
      }
    }
  )

  // Cleanup old items mutation
  const cleanupMutation = useSmartMutation<any, Error, void>(
    async () => {
      return await apiService.post(API_ENDPOINTS.RECYCLE_BIN.CLEANUP)
    },
    {
      mutationType: 'recycle-bin.cleanup',
      onSuccess: (data: any) => {
        setCleanupDialogOpen(false)
        refetch()
        showNotification(data.message || 'Cleanup completed successfully', 'success')
      },
      onError: (error: any) => {
        showNotification(
          error.message || 'Failed to cleanup old items',
          'error'
        )
      }
    }
  )

  // Handle actions
  const handleRestore = (item: DeletedItem) => {
    setSelectedItem(item)
    setRestoreDialogOpen(true)
  }

  const handlePermanentDelete = (item: DeletedItem) => {
    setSelectedItem(item)
    setDeleteDialogOpen(true)
  }

  const handleCleanup = () => {
    setCleanupDialogOpen(true)
  }

  const confirmRestore = () => {
    if (selectedItem) {
      restoreItemMutation.mutate({
        entityType: selectedItem.entityType,
        entityId: selectedItem.id
      })
    }
  }

  const confirmDelete = () => {
    if (selectedItem) {
      permanentDeleteMutation.mutate({
        entityType: selectedItem.entityType,
        entityId: selectedItem.id
      })
    }
  }

  const confirmCleanup = () => {
    cleanupMutation.mutate()
  }

  // Format entity type for display
  const formatEntityType = (type: string) => {
    const typeMap: Record<string, string> = {
      adminUsers: 'Admin User',
      carers: 'Carer',
      carePackages: 'Care Package',
      tasks: 'Task',
      assessments: 'Assessment'
    }
    return typeMap[type] || type
  }

  // Get entity type color
  const getEntityTypeColor = (type: string) => {
    const colorMap: Record<string, any> = {
      adminUsers: 'primary',
      carers: 'info',
      carePackages: 'success',
      tasks: 'warning',
      assessments: 'secondary'
    }
    return colorMap[type] || 'default'
  }

  const items = recycleBinData?.data || []
  const pagination = recycleBinData?.pagination || { page: 1, totalPages: 1, total: 0 }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load recycle bin data. Please try again.
        </Alert>
      </Container>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'warning.main' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <DeleteIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Recycle Bin
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
            <DeleteIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Recycle Bin
          </Typography>
        </Breadcrumbs>
      </Container>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Card elevation={2}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <DeleteIcon color="warning" />
                <Typography variant="h5" component="div">
                  Recycle Bin
                </Typography>
              </Box>
            }
            subheader="Manage soft-deleted items - restore or permanently delete"
            action={
              <Button
                variant="contained"
                color="warning"
                startIcon={<CleanupIcon />}
                onClick={handleCleanup}
                disabled={items.length === 0}
              >
                Cleanup Old Items
              </Button>
            }
          />
          
          <CardContent>
            {/* Filters */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                placeholder="Search deleted items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={entityType}
                  label="Entity Type"
                  onChange={(e) => setEntityType(e.target.value)}
                >
                  {entityTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Loading State */}
            {isLoading && (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            )}

            {/* Items Table */}
            {!isLoading && (
              <>
                {items.length === 0 ? (
                  <Alert severity="success" icon={<CheckIcon />}>
                    <Typography variant="body1">
                      No deleted items found. {searchTerm || entityType !== 'all' ? 'Try adjusting your filters.' : 'Your recycle bin is empty!'}
                    </Typography>
                  </Alert>
                ) : (
                  <>
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Deleted</TableCell>
                            <TableCell>Originally Created</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {items.map((item: DeletedItem) => (
                            <TableRow key={`${item.entityType}-${item.id}`}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {item.displayName}
                                </Typography>
                                {item.email && (
                                  <Typography variant="caption" color="text.secondary">
                                    {item.email}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={formatEntityType(item.entityType)}
                                  size="small"
                                  color={getEntityTypeColor(item.entityType)}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {new Date(item.deletedAt).toLocaleDateString()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(item.deletedAt).toLocaleTimeString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box display="flex" justifyContent="center" gap={1}>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleRestore(item)}
                                    title="Restore item"
                                  >
                                    <RestoreIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handlePermanentDelete(item)}
                                    title="Permanently delete"
                                  >
                                    <DeleteForeverIcon />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <Box display="flex" justifyContent="center" mt={3}>
                        <Pagination
                          count={pagination.totalPages}
                          page={page}
                          onChange={(_, newPage) => setPage(newPage)}
                          color="primary"
                        />
                      </Box>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)}>
        <DialogTitle>Restore Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to restore "{selectedItem?.displayName}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will make the item active again and visible in the main application.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmRestore}
            color="success"
            variant="contained"
            disabled={restoreItemMutation.isPending}
            startIcon={restoreItemMutation.isPending ? <CircularProgress size={16} /> : <RestoreIcon />}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ color: 'error.main' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon />
            Permanent Delete
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography fontWeight="bold">This action cannot be undone!</Typography>
          </Alert>
          <Typography>
            Are you sure you want to permanently delete "{selectedItem?.displayName}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will completely remove the item from the database. All related data and history will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={permanentDeleteMutation.isPending}
            startIcon={permanentDeleteMutation.isPending ? <CircularProgress size={16} /> : <DeleteForeverIcon />}
          >
            Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cleanup Confirmation Dialog */}
      <Dialog open={cleanupDialogOpen} onClose={() => setCleanupDialogOpen(false)}>
        <DialogTitle>Cleanup Old Items</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete all items that have been in the recycle bin for more than 30 days.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmCleanup}
            color="warning"
            variant="contained"
            disabled={cleanupMutation.isPending}
            startIcon={cleanupMutation.isPending ? <CircularProgress size={16} /> : <CleanupIcon />}
          >
            Cleanup
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

export default RecycleBinPage