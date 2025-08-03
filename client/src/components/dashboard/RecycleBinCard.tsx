import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../../services/api'
import { API_ENDPOINTS } from '@caretrack/shared'

const RecycleBinCard: React.FC = () => {
  const navigate = useNavigate()

  const { data: recycleBinData, isLoading, error } = useQuery({
    queryKey: ['recycle-bin-summary'],
    queryFn: async () => {
      const response = await apiService.get(API_ENDPOINTS.RECYCLE_BIN.SUMMARY)
      return response
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const handleManageClick = () => {
    navigate('/recycle-bin')
  }

  const totalDeleted = recycleBinData?.totalDeleted || 0
  const byType = recycleBinData?.byType || {}

  return (
    <Card 
      elevation={2} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        '&:hover': { 
          elevation: 4,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}
    >
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="warning" />
            <Typography variant="h6" component="div">
              Recycle Bin
            </Typography>
          </Box>
        }
        subheader="Manage soft-deleted items"
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={handleManageClick}
            startIcon={<RestoreIcon />}
            disabled={isLoading || totalDeleted === 0}
          >
            Manage
          </Button>
        }
      />
      
      <CardContent sx={{ flexGrow: 1, pt: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load recycle bin data
          </Alert>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box>
            {/* Total Count */}
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              <Box textAlign="center">
                <Typography variant="h3" color="warning.main" fontWeight="bold">
                  {totalDeleted}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Deleted Items
                </Typography>
              </Box>
            </Box>

            {totalDeleted === 0 ? (
              <Alert severity="success" icon={false}>
                <Typography variant="body2" textAlign="center">
                  No deleted items. Your system is clean! 🎉
                </Typography>
              </Alert>
            ) : (
              <>
                <Divider sx={{ my: 2 }} />
                
                {/* Breakdown by Type */}
                <Typography variant="subtitle2" gutterBottom color="text.secondary">
                  Breakdown by Type:
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={1}>
                  {byType.adminUsers > 0 && (
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Admin Users</Typography>
                      <Chip label={byType.adminUsers} size="small" color="warning" />
                    </Box>
                  )}
                  
                  {byType.carers > 0 && (
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Carers</Typography>
                      <Chip label={byType.carers} size="small" color="warning" />
                    </Box>
                  )}
                  
                  {byType.carePackages > 0 && (
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Care Packages</Typography>
                      <Chip label={byType.carePackages} size="small" color="warning" />
                    </Box>
                  )}
                  
                  {byType.tasks > 0 && (
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Tasks</Typography>
                      <Chip label={byType.tasks} size="small" color="warning" />
                    </Box>
                  )}
                  
                  {byType.assessments > 0 && (
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Assessments</Typography>
                      <Chip label={byType.assessments} size="small" color="warning" />
                    </Box>
                  )}
                </Box>

                {totalDeleted > 20 && (
                  <Alert 
                    severity="warning" 
                    icon={<WarningIcon />}
                    sx={{ mt: 2 }}
                  >
                    <Typography variant="body2">
                      Consider cleaning up old items. Items older than 30 days can be permanently deleted.
                    </Typography>
                  </Alert>
                )}
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default RecycleBinCard