import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  NotificationsActive as NotificationsIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '@caretrack/shared';

interface ShiftNotification {
  id: string;
  type: 'NEW_APPLICATION' | 'SHIFT_EXPIRING' | 'SHIFT_ASSIGNED';
  title: string;
  message: string;
  shiftId: string;
  shiftName: string;
  createdAt: string;
  isRead: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  metadata?: {
    packageName?: string;
    carerName?: string;
    applicationCount?: number;
    expiresAt?: string;
  };
}

interface SentShift {
  id: string;
  name: string;
  status: string;
  pendingApplications: number;
  applicationCount: number;
  package: {
    name: string;
  };
  expiresAt?: string;
}

const ShiftNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Fetch shifts with applications for notifications
  const {
    data: shiftsData,
    isLoading: notificationsLoading
  } = useQuery({
    queryKey: ['shift-notifications'],
    queryFn: async () => {
      const response = await apiService.get(`${API_ENDPOINTS.SHIFT_SENDER.SENT_SHIFTS}?limit=50`);
      const shifts = response?.data || response || [];
      
      // Generate notifications from shifts data
      const notifications: ShiftNotification[] = [];
      
      shifts.forEach((shift: SentShift) => {
        // New applications notification
        if (shift.status === 'HAS_APPLICATIONS' && shift.pendingApplications > 0) {
          notifications.push({
            id: `application_${shift.id}`,
            type: 'NEW_APPLICATION',
            title: 'New Shift Applications',
            message: `${shift.pendingApplications} new application${shift.pendingApplications > 1 ? 's' : ''} for "${shift.name}"`,
            shiftId: shift.id,
            shiftName: shift.name,
            createdAt: new Date().toISOString(),
            isRead: false,
            priority: 'HIGH',
            metadata: {
              packageName: shift.package.name,
              applicationCount: shift.applicationCount
            }
          });
        }
        
        // Expiring shift notification
        if (shift.expiresAt && shift.status === 'WAITING_RESPONSES') {
          const expiresAt = new Date(shift.expiresAt);
          const now = new Date();
          const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          if (hoursUntilExpiry <= 6 && hoursUntilExpiry > 0) {
            notifications.push({
              id: `expiring_${shift.id}`,
              type: 'SHIFT_EXPIRING',
              title: 'Shift Expiring Soon',
              message: `"${shift.name}" expires in ${Math.round(hoursUntilExpiry)} hours`,
              shiftId: shift.id,
              shiftName: shift.name,
              createdAt: new Date().toISOString(),
              isRead: false,
              priority: 'MEDIUM',
              metadata: {
                packageName: shift.package.name,
                expiresAt: shift.expiresAt
              }
            });
          }
        }
        
        // Recently assigned notification
        if (shift.status === 'ASSIGNED') {
          notifications.push({
            id: `assigned_${shift.id}`,
            type: 'SHIFT_ASSIGNED',
            title: 'Shift Successfully Assigned',
            message: `"${shift.name}" has been assigned and added to rota`,
            shiftId: shift.id,
            shiftName: shift.name,
            createdAt: new Date().toISOString(),
            isRead: false,
            priority: 'LOW',
            metadata: {
              packageName: shift.package.name
            }
          });
        }
      });
      
      return notifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000 // Data is fresh for 15 seconds
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: ShiftNotification) => {
    handleMenuClose();
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'NEW_APPLICATION':
        navigate('/shift-sender/management');
        break;
      case 'SHIFT_EXPIRING':
        navigate('/shift-sender/management');
        break;
      case 'SHIFT_ASSIGNED':
        navigate('/shift-sender/management');
        break;
      default:
        navigate('/shift-sender/management');
    }
  };

  const handleViewAllShifts = () => {
    handleMenuClose();
    navigate('/shift-sender/management');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_APPLICATION':
        return <AssignmentIcon color="primary" />;
      case 'SHIFT_EXPIRING':
        return <ScheduleIcon color="warning" />;
      case 'SHIFT_ASSIGNED':
        return <PersonIcon color="success" />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getPriorityColor = (priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (priority) {
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const totalNotifications = shiftsData?.length || 0;
  const highPriorityCount = shiftsData?.filter((n: ShiftNotification) => n.priority === 'HIGH').length || 0;

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleMenuOpen}
        disabled={notificationsLoading}
      >
        <Badge 
          badgeContent={highPriorityCount} 
          color="error"
          invisible={highPriorityCount === 0}
        >
          <Badge
            badgeContent={totalNotifications}
            color="primary"
            invisible={totalNotifications === 0}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            <NotificationsIcon sx={{ color: 'text.primary' }} />
          </Badge>
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            width: 400, 
            maxHeight: 500,
            overflow: 'auto'
          }
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6">
            Shift Notifications
          </Typography>
          {totalNotifications > 0 && (
            <Typography variant="body2" color="text.secondary">
              {totalNotifications} notification{totalNotifications > 1 ? 's' : ''}
              {highPriorityCount > 0 && (
                <Chip 
                  label={`${highPriorityCount} urgent`} 
                  color="error" 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          )}
        </Box>
        
        <Divider />

        {notificationsLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={24} />
          </Box>
        ) : totalNotifications === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No shift notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You'll be notified when carers apply for shifts
            </Typography>
          </Box>
        ) : (
          <List dense>
            {shiftsData?.slice(0, 8).map((notification: ShiftNotification) => (
              <ListItem
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  borderLeft: `3px solid`,
                  borderLeftColor: notification.priority === 'HIGH' ? 'error.main' : 
                                  notification.priority === 'MEDIUM' ? 'warning.main' : 'success.main',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={notification.priority === 'HIGH' ? 'bold' : 'medium'}>
                        {notification.title}
                      </Typography>
                      <Chip
                        label={notification.priority}
                        size="small"
                        color={getPriorityColor(notification.priority)}
                        sx={{ fontSize: '0.65rem', height: 16 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {notification.metadata?.packageName} • {new Date(notification.createdAt).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {totalNotifications > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleViewAllShifts}
                startIcon={<ScheduleIcon />}
              >
                Manage All Shifts
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default ShiftNotifications;