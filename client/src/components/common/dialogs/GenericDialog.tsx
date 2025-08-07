import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export interface DialogAction {
  label: string;
  onClick: () => void;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  variant?: 'text' | 'outlined' | 'contained';
  disabled?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export interface GenericDialogProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: DialogAction[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  fullScreen?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  loading?: boolean;
  error?: string;
  showCloseButton?: boolean;
  dividers?: boolean;
  sx?: any;
}

export const GenericDialog: React.FC<GenericDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  loading = false,
  error,
  showCloseButton = true,
  dividers = false,
  sx,
  ...props
}) => {
  const handleClose = (event?: any, reason?: string) => {
    if (disableBackdropClick && reason === 'backdropClick') return;
    if (disableEscapeKeyDown && reason === 'escapeKeyDown') return;
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      sx={sx}
      {...props}
    >
      {title && (
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" component="div">
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {showCloseButton && onClose && (
              <IconButton
                aria-label="close"
                onClick={() => onClose()}
                sx={{ color: 'grey.500' }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
      )}

      <DialogContent dividers={dividers}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading...
            </Typography>
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {children}
          </>
        )}
      </DialogContent>

      {actions && actions.length > 0 && (
        <DialogActions sx={{ p: 2 }}>
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              color={action.color || 'primary'}
              variant={action.variant || 'text'}
              disabled={action.disabled || loading}
              startIcon={action.loading ? <CircularProgress size={16} /> : action.startIcon}
              endIcon={!action.loading ? action.endIcon : undefined}
            >
              {action.label}
            </Button>
          ))}
        </DialogActions>
      )}
    </Dialog>
  );
};

// Specialized confirmation dialog
export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'info' | 'warning' | 'error';
  loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  severity = 'info',
  loading = false
}) => {
  const getConfirmColor = () => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'primary';
    }
  };

  return (
    <GenericDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      actions={[
        {
          label: cancelLabel,
          onClick: onClose,
          variant: 'outlined',
          disabled: loading
        },
        {
          label: confirmLabel,
          onClick: onConfirm,
          color: getConfirmColor(),
          variant: 'contained',
          loading
        }
      ]}
    >
      <Typography>{message}</Typography>
    </GenericDialog>
  );
};

// Hook for managing dialog state
export function useDialog() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');

  const openDialog = React.useCallback(() => {
    setOpen(true);
    setError('');
  }, []);

  const closeDialog = React.useCallback(() => {
    setOpen(false);
    setLoading(false);
    setError('');
  }, []);

  const setDialogLoading = React.useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const setDialogError = React.useCallback((errorMessage: string) => {
    setError(errorMessage);
    setLoading(false);
  }, []);

  return {
    open,
    loading,
    error,
    openDialog,
    closeDialog,
    setDialogLoading,
    setDialogError
  };
}