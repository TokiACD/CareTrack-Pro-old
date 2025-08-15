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
  Alert,
  CircularProgress,
  Pagination,
  Avatar,
  Divider,
  Badge,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material'
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  Assessment as ReportIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Notifications as NotificationsIcon,
  Shield as ShieldIcon,
  Visibility as VisibilityIcon,
  AdminPanelSettings as AdminIcon,
  DataUsage as DataIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  Schedule as ScheduleIcon,
  Lock as LockIcon
} from '@mui/icons-material'
import { format, formatDistanceToNow } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '../services/api'
import { API_ENDPOINTS } from '@caretrack/shared'
import { AdminPageLayout } from '../components/common/AdminPageLayout'

interface SecurityEvent {
  id: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  userId?: string
  userName?: string
  ipAddress?: string
  userAgent?: string
  details: Record<string, any>
  createdAt: string
}

interface AuditAlert {
  id: string
  type: 'SECURITY' | 'COMPLIANCE' | 'SYSTEM' | 'DATA_INTEGRITY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  details: Record<string, any>
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  createdAt: string
}

interface SecurityDashboard {
  recentSecurityEvents: SecurityEvent[]
  unacknowledgedAlerts: AuditAlert[]
  statistics: {
    today: { total: number; failed: number; violations: number; suspicious: number; critical: number }
    thisWeek: { total: number; failed: number; violations: number; suspicious: number; critical: number }
    thisMonth: { total: number; failed: number; violations: number; suspicious: number; critical: number }
  }
  recentFailedLogins: any[]
  activeSessions: number
}

interface AuditActivity {
  id: string
  action: string
  entityType: string
  entityId: string
  message: string
  performedByAdminName: string
  performedAt: string
  ipAddress?: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  securityContext: any
  complianceRelevant: boolean
}

const EnhancedAuditPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)
  const [timeframe, setTimeframe] = useState('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<AuditAlert | null>(null)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [filters, setFilters] = useState({
    severity: '',
    type: '',
    acknowledged: 'false'
  })

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['enhanced-audit-dashboard'],
    queryFn: async () => {
      const response = await apiService.get(API_ENDPOINTS.ENHANCED_AUDIT.DASHBOARD)
      return response.data as SecurityDashboard
    },
    refetchInterval: autoRefresh ? 30000 : false // Auto-refresh every 30 seconds
  })

  // Fetch security monitoring data
  const { data: securityData, isLoading: securityLoading } = useQuery({
    queryKey: ['security-monitoring', timeframe],
    queryFn: async () => {
      const response = await apiService.get(`${API_ENDPOINTS.ENHANCED_AUDIT.SECURITY_MONITORING}?timeframe=${timeframe}`)
      return response.data
    },
    refetchInterval: autoRefresh ? 60000 : false
  })

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['audit-alerts', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters).toString()
      const response = await apiService.get(`${API_ENDPOINTS.ENHANCED_AUDIT.ALERTS}?${params}`)
      return response.data as AuditAlert[]
    },
    refetchInterval: autoRefresh ? 30000 : false
  })

  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const endpoint = API_ENDPOINTS.ENHANCED_AUDIT.ACKNOWLEDGE_ALERT.replace(':alertId', alertId)
      return await apiService.put(endpoint)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['enhanced-audit-dashboard'] })
      setAlertDialogOpen(false)
      setSelectedAlert(null)
    }
  })

  // Manual refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['enhanced-audit-dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['security-monitoring'] })
    queryClient.invalidateQueries({ queryKey: ['audit-alerts'] })
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error'
      case 'HIGH': return 'warning'
      case 'MEDIUM': return 'info'
      case 'LOW': return 'success'
      default: return 'default'
    }
  }

  // Get risk level color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return '#d32f2f'
      case 'HIGH': return '#f57c00'
      case 'MEDIUM': return '#1976d2'
      case 'LOW': return '#388e3c'
      default: return '#757575'
    }
  }

  // Handle alert click
  const handleAlertClick = (alert: AuditAlert) => {
    setSelectedAlert(alert)
    setAlertDialogOpen(true)
  }

  // Handle acknowledge alert
  const handleAcknowledgeAlert = () => {
    if (selectedAlert) {
      acknowledgeMutation.mutate(selectedAlert.id)
    }
  }

  if (dashboardError) {
    return (
      <AdminPageLayout pageTitle="Enhanced Audit Dashboard">
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mt: 2 }}>
            Failed to load audit dashboard data. Please try again.
          </Alert>
        </Container>
      </AdminPageLayout>
    )
  }

  const renderOverview = () => (
    <Grid container spacing={3}>
      {/* Security Statistics */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Security Overview</Typography>
                <Tooltip title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}>
                  <IconButton
                    size="small"
                    color={autoRefresh ? 'primary' : 'default'}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            }
            action={
              <Box display="flex" gap={1}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Timeframe</InputLabel>
                  <Select
                    value={timeframe}
                    label="Timeframe"
                    onChange={(e) => setTimeframe(e.target.value)}
                  >
                    <MenuItem value="1h">Last Hour</MenuItem>
                    <MenuItem value="24h">Last 24 Hours</MenuItem>
                    <MenuItem value="7d">Last 7 Days</MenuItem>
                    <MenuItem value="30d">Last 30 Days</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={dashboardLoading}
                >
                  Refresh
                </Button>
              </Box>
            }
          />
          <CardContent>
            {dashboardLoading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={1}>
                    <ShieldIcon sx={{ fontSize: 40, color: 'success.dark', mb: 1 }} />
                    <Typography variant="h4" color="success.dark">
                      {dashboardData?.statistics.today.total || 0}
                    </Typography>
                    <Typography variant="body2" color="success.dark">
                      Total Events Today
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={1}>
                    <ErrorIcon sx={{ fontSize: 40, color: 'warning.dark', mb: 1 }} />
                    <Typography variant="h4" color="warning.dark">
                      {dashboardData?.statistics.today.failed || 0}
                    </Typography>
                    <Typography variant="body2" color="warning.dark">
                      Failed Logins Today
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center" p={2} bgcolor="error.light" borderRadius={1}>
                    <WarningIcon sx={{ fontSize: 40, color: 'error.dark', mb: 1 }} />
                    <Typography variant="h4" color="error.dark">
                      {dashboardData?.statistics.today.critical || 0}
                    </Typography>
                    <Typography variant="body2" color="error.dark">
                      Critical Events Today
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Active Alerts */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <NotificationsIcon color="warning" />
                <Typography variant="h6">Active Alerts</Typography>
                <Badge 
                  badgeContent={alertsData?.filter(alert => !alert.acknowledged).length || 0} 
                  color="error"
                >
                  <Box />
                </Badge>
              </Box>
            }
          />
          <CardContent sx={{ maxHeight: 300, overflow: 'auto' }}>
            {alertsLoading ? (
              <CircularProgress size={24} />
            ) : !alertsData || alertsData.length === 0 ? (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                No active alerts
              </Alert>
            ) : (
              alertsData.slice(0, 5).map((alert) => (
                <Box
                  key={alert.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: 1,
                    borderColor: `${getSeverityColor(alert.severity)}.main`,
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleAlertClick(alert)}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip
                      label={alert.severity}
                      color={getSeverityColor(alert.severity) as any}
                      size="small"
                    />
                    <Chip
                      label={alert.type}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" fontWeight="bold">
                    {alert.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </Typography>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Security Events */}
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <TimelineIcon color="primary" />
                <Typography variant="h6">Recent Security Events</Typography>
              </Box>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Event Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData?.recentSecurityEvents.slice(0, 10).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(event.createdAt), 'MMM dd, HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.type}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.severity}
                          color={getSeverityColor(event.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon fontSize="small" />
                          <Typography variant="body2">
                            {event.userName || 'System'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <ComputerIcon fontSize="small" />
                          <Typography variant="body2">
                            {event.ipAddress || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {JSON.stringify(event.details).substring(0, 50)}...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderSecurityMonitoring = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <ShieldIcon color="primary" />
                <Typography variant="h6">Security Monitoring - {timeframe}</Typography>
              </Box>
            }
          />
          <CardContent>
            {securityLoading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={1}>
                    <Typography variant="h4" color="info.dark">
                      {securityData?.stats.totalSecurityEvents || 0}
                    </Typography>
                    <Typography variant="body2" color="info.dark">
                      Total Events
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center" p={2} bgcolor="error.light" borderRadius={1}>
                    <Typography variant="h4" color="error.dark">
                      {securityData?.stats.criticalEvents || 0}
                    </Typography>
                    <Typography variant="body2" color="error.dark">
                      Critical Events
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={1}>
                    <Typography variant="h4" color="warning.dark">
                      {securityData?.stats.failedLoginAttempts || 0}
                    </Typography>
                    <Typography variant="body2" color="warning.dark">
                      Failed Logins
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center" p={2} bgcolor="secondary.light" borderRadius={1}>
                    <Typography variant="h4" color="secondary.dark">
                      {securityData?.stats.permissionViolations || 0}
                    </Typography>
                    <Typography variant="body2" color="secondary.dark">
                      Permission Violations
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderAlerts = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <NotificationsIcon color="warning" />
                <Typography variant="h6">Security Alerts</Typography>
              </Box>
            }
            action={
              <Box display="flex" gap={1}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={filters.severity}
                    label="Severity"
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="CRITICAL">Critical</MenuItem>
                    <MenuItem value="HIGH">High</MenuItem>
                    <MenuItem value="MEDIUM">Medium</MenuItem>
                    <MenuItem value="LOW">Low</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.acknowledged === 'false'}
                      onChange={(e) => setFilters({
                        ...filters,
                        acknowledged: e.target.checked ? 'false' : ''
                      })}
                    />
                  }
                  label="Unacknowledged only"
                />
              </Box>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alertsData?.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(alert.createdAt), 'MMM dd, HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={alert.severity}
                          color={getSeverityColor(alert.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={alert.type}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {alert.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {alert.acknowledged ? (
                          <Chip
                            label="Acknowledged"
                            color="success"
                            size="small"
                            icon={<CheckCircleIcon />}
                          />
                        ) : (
                          <Chip
                            label="Pending"
                            color="warning"
                            size="small"
                            icon={<WarningIcon />}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleAlertClick(alert)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  return (
    <AdminPageLayout pageTitle="Enhanced Security Audit">
      <Container maxWidth="xl" sx={{ pb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <SecurityIcon />
                  Security Overview
                  {dashboardData?.unacknowledgedAlerts.length > 0 && (
                    <Badge badgeContent={dashboardData.unacknowledgedAlerts.length} color="error" />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <SpeedIcon />
                  Real-time Monitoring
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <NotificationsIcon />
                  Alerts & Notifications
                  {alertsData?.filter(alert => !alert.acknowledged).length > 0 && (
                    <Badge 
                      badgeContent={alertsData.filter(alert => !alert.acknowledged).length} 
                      color="error" 
                    />
                  )}
                </Box>
              }
            />
          </Tabs>
        </Box>

        {activeTab === 0 && renderOverview()}
        {activeTab === 1 && renderSecurityMonitoring()}
        {activeTab === 2 && renderAlerts()}

        {/* Alert Detail Dialog */}
        <Dialog
          open={alertDialogOpen}
          onClose={() => setAlertDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <WarningIcon color="warning" />
              Alert Details
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedAlert && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Severity
                    </Typography>
                    <Chip
                      label={selectedAlert.severity}
                      color={getSeverityColor(selectedAlert.severity) as any}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Type
                    </Typography>
                    <Chip
                      label={selectedAlert.type}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Title
                    </Typography>
                    <Typography variant="h6">
                      {selectedAlert.title}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Message
                    </Typography>
                    <Typography variant="body1">
                      {selectedAlert.message}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Details
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: 'grey.100',
                        p: 2,
                        borderRadius: 1,
                        fontSize: '0.875rem',
                        overflow: 'auto'
                      }}
                    >
                      {JSON.stringify(selectedAlert.details, null, 2)}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(selectedAlert.createdAt), 'PPpp')}
                    </Typography>
                  </Grid>
                  {selectedAlert.acknowledged && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        Acknowledged by {selectedAlert.acknowledgedBy} on{' '}
                        {format(new Date(selectedAlert.acknowledgedAt!), 'PPpp')}
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAlertDialogOpen(false)}>
              Close
            </Button>
            {selectedAlert && !selectedAlert.acknowledged && (
              <Button
                onClick={handleAcknowledgeAlert}
                color="primary"
                variant="contained"
                disabled={acknowledgeMutation.isPending}
                startIcon={acknowledgeMutation.isPending ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              >
                Acknowledge
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </AdminPageLayout>
  )
}

export default EnhancedAuditPage