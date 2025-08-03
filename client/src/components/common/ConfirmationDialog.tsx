import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Help as HelpIcon,
  Info as InfoIcon
} from '@mui/icons-material'

export interface ConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  severity?: 'warning' | 'error' | 'info'
  isLoading?: boolean
  warnings?: string[]
  details?: string
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'warning',
  isLoading = false,
  warnings = [],
  details
}) => {
  const getIcon = () => {
    switch (severity) {
      case 'error':
        return <DeleteIcon sx={{ color: 'error.main' }} />
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />
      case 'info':
        return <InfoIcon sx={{ color: 'info.main' }} />
      default:
        return <HelpIcon sx={{ color: 'warning.main' }} />
    }
  }

  const getButtonColor = () => {
    switch (severity) {
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
        return 'primary'
      default:
        return 'warning'
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="confirmation-dialog-title"
    >
      <DialogTitle 
        id="confirmation-dialog-title"
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: `${severity}.main`
        }}
      >
        {getIcon()}
        {title}
      </DialogTitle>
      
      <DialogContent>
        {severity === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography fontWeight="bold">This action cannot be undone!</Typography>
          </Alert>
        )}
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          {message}
        </Typography>
        
        {details && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {details}
          </Typography>
        )}
        
        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              Warning:
            </Typography>
            <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
              {warnings.map((warning, index) => (
                <li key={index}>
                  <Typography variant="body2">{warning}</Typography>
                </li>
              ))}
            </Box>
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose}
          disabled={isLoading}
          variant="outlined"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={getButtonColor()}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmationDialog