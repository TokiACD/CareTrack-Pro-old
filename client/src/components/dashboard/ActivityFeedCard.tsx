import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Avatar
} from '@mui/material'
import {
  Assessment as ActivityIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowRightIcon,
  CheckCircle,
  Error as AlertCircleIcon,
  Cancel as XCircleIcon,
  Person as UserIcon,
  AccessTime as ClockIcon
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { apiService } from '../../services/api'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  message: string
  performedByAdminName: string
  performedAt: string
  ipAddress?: string
}

const ActivityFeedCard: React.FC = () => {
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecentActivity()
    
    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(fetchRecentActivity, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchRecentActivity = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiService.get<AuditLog[]>('/api/audit/recent?limit=10')
      setRecentActivity(result || [])
    } catch (err) {
      setError('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
      case 'UPDATE':
        return <AlertCircleIcon sx={{ fontSize: 16, color: 'info.main' }} />
      case 'DELETE':
        return <XCircleIcon sx={{ fontSize: 16, color: 'error.main' }} />
      case 'LOGIN':
      case 'LOGOUT':
        return <UserIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
      default:
        return <ActivityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
    }
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'success'
      case 'UPDATE':
        return 'info'
      case 'DELETE':
        return 'error'
      case 'LOGIN':
      case 'LOGOUT':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const formatEntityType = (entityType: string) => {
    return entityType.toLowerCase().replace('_', ' ')
  }

  return (
    <Card sx={{ height: 400 }}>
      <CardHeader 
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ActivityIcon />
            <Typography variant="h6">Recent Activity</Typography>
          </Box>
        }
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={fetchRecentActivity}
              disabled={loading}
              size="small"
            >
              <RefreshIcon sx={{ 
                fontSize: 20,
                ...(loading && {
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                })
              }} />
            </IconButton>
            <Button
              component={Link}
              to="/audit-logs"
              variant="text"
              size="small"
              endIcon={<ArrowRightIcon sx={{ fontSize: 16 }} />}
            >
              View All
            </Button>
          </Box>
        }
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {loading && recentActivity.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 2 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">Loading recent activity...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 2 }}>
            <AlertCircleIcon sx={{ fontSize: 32, color: 'error.main' }} />
            <Typography variant="body2" color="error.main" textAlign="center">{error}</Typography>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={fetchRecentActivity}
            >
              Try Again
            </Button>
          </Box>
        ) : recentActivity.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 2 }}>
            <ActivityIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">No recent activity</Typography>
          </Box>
        ) : (
          <Box sx={{ height: 280, overflow: 'auto', px: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentActivity.map((log) => (
                <Box 
                  key={log.id} 
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'action.hover'
                    },
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      bgcolor: 'action.selected',
                      mt: 0.5
                    }}
                  >
                    {getActionIcon(log.action)}
                  </Avatar>
                  
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip 
                        label={log.action}
                        color={getActionBadgeColor(log.action)}
                        size="small"
                        sx={{ fontSize: '0.75rem', height: 20 }}
                      />
                      <Chip 
                        label={formatEntityType(log.entityType)}
                        variant="outlined"
                        size="small"
                        sx={{ fontSize: '0.75rem', height: 20 }}
                      />
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        mb: 1,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {log.message}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.75rem', color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: 120 }}>
                        <UserIcon sx={{ fontSize: 12 }} />
                        <Typography variant="caption" noWrap>{log.performedByAdminName}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ClockIcon sx={{ fontSize: 12 }} />
                        <Typography variant="caption">
                          {formatDistanceToNow(new Date(log.performedAt), { addSuffix: true })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityFeedCard