import React, { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  Avatar,
  Divider
} from '@mui/material'
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Person as UserIcon,
  Schedule as ClockIcon,
  CheckCircle,
  Error as AlertCircleIcon,
  Cancel as XCircleIcon,
  Assessment as ActivityIcon
} from '@mui/icons-material'
import { format } from 'date-fns'
import { useDebounce } from '../hooks/useDebounce'
import { apiService } from '../services/api'
import { AdminPageLayout } from '../components/common/AdminPageLayout'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  message: string
  performedByAdminName: string
  performedAt: string
  ipAddress?: string
  userAgent?: string
  performedBy?: {
    id: string
    name: string
    email: string
  }
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
}

interface AuditLogResponse {
  logs: AuditLog[]
  total: number
  page: number
  totalPages: number
}

interface AuditStatistics {
  activity: {
    today: number
    thisWeek: number
    thisMonth: number
    total: number
  }
  topUsers: Array<{
    adminId: string
    adminName: string
    count: number
  }>
  topActions: Array<{
    action: string
    count: number
  }>
}

const AuditLogPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [selectedEntityType, setSelectedEntityType] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  const ITEMS_PER_PAGE = 25

  // Action types for filtering
  const actionTypes = [
    'CREATE', 'UPDATE', 'DELETE', 'RESTORE',
    'LOGIN', 'LOGOUT', 'PASSWORD_RESET',
    'INVITE_USER', 'ACCEPT_INVITATION', 'DECLINE_INVITATION',
    'ASSIGN_CARER', 'UNASSIGN_CARER', 'ASSIGN_TASK', 'UNASSIGN_TASK',
    'COMPLETE_ASSESSMENT', 'SET_COMPETENCY', 'UPDATE_PROGRESS',
    'CREATE_SHIFT', 'ASSIGN_SHIFT', 'CONFIRM_SHIFT', 'CANCEL_SHIFT',
    'EXPORT_DATA', 'IMPORT_DATA', 'GENERATE_PDF'
  ]

  // Entity types for filtering
  const entityTypes = [
    'ADMIN_USER', 'CARER', 'CARE_PACKAGE', 'TASK', 
    'ASSESSMENT', 'ASSESSMENT_RESPONSE', 'INVITATION',
    'SHIFT', 'ROTA_ENTRY', 'COMPETENCY_RATING', 'ASSIGNMENT'
  ]

  useEffect(() => {
    fetchAuditLogs()
  }, [currentPage, debouncedSearchTerm, selectedAction, selectedEntityType, dateFrom, dateTo])

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchAuditLogs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString()
      })
      
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (selectedAction) params.append('action', selectedAction)
      if (selectedEntityType) params.append('entityType', selectedEntityType)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      
      const result = await apiService.getFullResponse(`/api/audit?${params}`)
      
      if (result.success && result.data) {
        setAuditLogs(result.data.logs || [])
        setTotalPages(result.data.totalPages || 1)
        setTotal(result.data.total || 0)
      } else {
        setError(result.error || 'Failed to fetch audit logs')
      }
    } catch (err) {
      setError('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const result = await apiService.get('/api/audit/statistics')
      setStatistics(result || null)
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        format
      })
      
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (selectedAction) params.append('action', selectedAction)
      if (selectedEntityType) params.append('entityType', selectedEntityType)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      
      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
      await apiService.downloadFile(`/api/audit/export?${params}`, filename)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedAction('')
    setSelectedEntityType('')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  const getActionChipColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'success'
      case 'UPDATE':
        return 'info'
      case 'DELETE':
        return 'error'
      case 'RESTORE':
        return 'warning'
      case 'LOGIN':
      case 'LOGOUT':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <CheckCircle sx={{ fontSize: 16 }} />
      case 'UPDATE':
        return <AlertCircleIcon sx={{ fontSize: 16 }} />
      case 'DELETE':
        return <XCircleIcon sx={{ fontSize: 16 }} />
      case 'LOGIN':
      case 'LOGOUT':
        return <UserIcon sx={{ fontSize: 16 }} />
      default:
        return <ActivityIcon sx={{ fontSize: 16 }} />
    }
  }

  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log)
    setDetailsOpen(true)
  }

  return (
    <AdminPageLayout pageTitle="System Audit">
      <Container maxWidth="xl" sx={{ py: 4 }}>

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            System Audit Logs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive monitoring of system activity and security events
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('json')}
          >
            Export JSON
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ClockIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {statistics.activity.today}
                </Typography>
                <Typography color="text.secondary">
                  Today
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ActivityIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {statistics.activity.thisWeek}
                </Typography>
                <Typography color="text.secondary">
                  This Week
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ClockIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {statistics.activity.thisMonth}
                </Typography>
                <Typography color="text.secondary">
                  This Month
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <UserIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {statistics.activity.total}
                </Typography>
                <Typography color="text.secondary">
                  Total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon />
              <Typography variant="h6">Filters</Typography>
            </Box>
          }
        />
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Action</InputLabel>
                <Select
                  value={selectedAction}
                  label="Action"
                  onChange={(e) => setSelectedAction(e.target.value)}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {actionTypes.map(action => (
                    <MenuItem key={action} value={action}>
                      {action.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={selectedEntityType}
                  label="Entity Type"
                  onChange={(e) => setSelectedEntityType(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {entityTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Activity Feed</Typography>
              <Typography variant="body2" color="text.secondary">
                {total} total entries
              </Typography>
            </Box>
          }
        />
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading audit logs...
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AlertCircleIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" color="error" gutterBottom>
                Error loading audit logs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {error}
              </Typography>
              <Button variant="outlined" onClick={fetchAuditLogs} sx={{ mt: 2 }}>
                Retry
              </Button>
            </Box>
          ) : auditLogs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ActivityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No audit logs found
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Action</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Performed By</TableCell>
                      <TableCell>Date/Time</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow 
                        key={log.id} 
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(log)}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Chip
                              icon={getActionIcon(log.action)}
                              label={log.action}
                              color={getActionChipColor(log.action)}
                              size="small"
                            />
                            <Chip
                              label={log.entityType.replace('_', ' ')}
                              variant="outlined"
                              size="small"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.message}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              <UserIcon sx={{ fontSize: 16 }} />
                            </Avatar>
                            <Typography variant="body2">
                              {log.performedByAdminName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(log.performedAt), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {(log.oldValues || log.newValues) && (
                            <Button size="small" variant="outlined">
                              View Details
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} entries
                </Typography>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, page) => setCurrentPage(page)}
                  color="primary"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Audit Log Details - {selectedLog?.action} {selectedLog?.entityType}
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Performed by:
                  </Typography>
                  <Typography variant="body2">
                    {selectedLog.performedByAdminName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Date/Time:
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedLog.performedAt), 'PPpp')}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedLog.oldValues && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Previous Values:
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ fontSize: '0.75rem', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
              
              {selectedLog.newValues && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    New Values:
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ fontSize: '0.75rem', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      </Container>
    </AdminPageLayout>
  )
}

export default AuditLogPage