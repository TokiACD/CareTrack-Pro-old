import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

export interface NotificationState {
  open: boolean;
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface NotificationManagerProps {
  notification: NotificationState;
  onClose: () => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notification,
  onClose
}) => (
  <Snackbar
    open={notification.open}
    autoHideDuration={notification.duration || 6000}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  >
    <Alert
      onClose={onClose}
      severity={notification.severity}
      variant="filled"
      sx={{ minWidth: '300px' }}
    >
      {notification.message}
    </Alert>
  </Snackbar>
);

// Hook for managing notifications
export function useNotification() {
  const [notification, setNotification] = React.useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info'
  });

  const showNotification = React.useCallback((
    message: string, 
    severity: AlertColor = 'info', 
    duration?: number
  ) => {
    setNotification({
      open: true,
      message,
      severity,
      duration
    });
  }, []);

  const hideNotification = React.useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const showSuccess = React.useCallback((message: string, duration?: number) => {
    showNotification(message, 'success', duration);
  }, [showNotification]);

  const showError = React.useCallback((message: string, duration?: number) => {
    showNotification(message, 'error', duration);
  }, [showNotification]);

  const showWarning = React.useCallback((message: string, duration?: number) => {
    showNotification(message, 'warning', duration);
  }, [showNotification]);

  const showInfo = React.useCallback((message: string, duration?: number) => {
    showNotification(message, 'info', duration);
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}