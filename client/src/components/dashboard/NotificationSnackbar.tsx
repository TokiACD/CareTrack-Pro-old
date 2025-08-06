import React from 'react'
import {
  Snackbar,
  Alert
} from '@mui/material'

interface NotificationState {
  open: boolean
  message: string
  severity: 'success' | 'error' | 'warning' | 'info'
}

interface NotificationSnackbarProps {
  notification: NotificationState
  onClose: () => void
  autoHideDuration?: number
}

const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  notification,
  onClose,
  autoHideDuration = 4000
}) => {
  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert 
        onClose={onClose} 
        severity={notification.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  )
}

export default NotificationSnackbar