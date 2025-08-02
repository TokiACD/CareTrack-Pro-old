import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Security as SecurityIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '@caretrack/shared';
import { useSmartMutation } from '../../hooks/useSmartMutation';

interface EmailChangeDialogProps {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
  userType: 'ADMIN' | 'CARER';
  currentUserName?: string;
  targetUserName?: string;
  userName?: string; // For backward compatibility
  prefilledNewEmail?: string;
  isAdminChangingOtherUser?: boolean;
  targetUserId?: string;
}

interface EmailChangeRequest {
  newEmail: string;
  userType: 'ADMIN' | 'CARER';
  targetUserId?: string;
  targetUserEmail?: string;
}

const EmailChangeDialog: React.FC<EmailChangeDialogProps> = ({
  open,
  onClose,
  currentEmail,
  userType,
  currentUserName,
  targetUserName,
  userName,
  prefilledNewEmail = '',
  isAdminChangingOtherUser = false,
  targetUserId
}) => {
  const [newEmail, setNewEmail] = useState(prefilledNewEmail);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailError, setEmailError] = useState<string>('');

  // Update newEmail when prefilledNewEmail changes
  React.useEffect(() => {
    setNewEmail(prefilledNewEmail);
    validateEmail(prefilledNewEmail);
  }, [prefilledNewEmail]);

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    if (email === currentEmail) {
      setEmailError('New email must be different from current email');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleEmailChange = (email: string) => {
    setNewEmail(email);
    validateEmail(email);
    // Clear any previous messages when user starts typing
    if (message) {
      setMessage(null);
    }
  };

  const emailChangeRequest = useSmartMutation<any, Error, EmailChangeRequest>(
    async (data: EmailChangeRequest) => {
      return await apiService.post(API_ENDPOINTS.EMAIL_CHANGE.REQUEST, data);
    },
    {
      mutationType: 'users.email-change',
      onSuccess: () => {
        setMessage({
          type: 'success',
          text: 'Email change request sent! Please check both your old and new email addresses for further instructions.'
        });
        setNewEmail('');
        // Close dialog after showing success message briefly
        setTimeout(() => {
          handleClose();
        }, 2000);
      },
      onError: (error: any) => {
        setMessage({
          type: 'error',
          text: error.message || 'Failed to request email change'
        });
      }
    }
  );

  const handleClose = () => {
    setNewEmail('');
    setMessage(null);
    setEmailError('');
    onClose();
  };

  const handleSubmit = () => {
    // Basic validation
    if (!newEmail) {
      setMessage({ type: 'error', text: 'Please enter a new email address' });
      return;
    }

    // Use existing validation function
    if (!validateEmail(newEmail)) {
      return;
    }

    setMessage(null);
    emailChangeRequest.mutate({ 
      newEmail, 
      userType,
      targetUserId: isAdminChangingOtherUser ? targetUserId : undefined,
      targetUserEmail: isAdminChangingOtherUser ? currentEmail : undefined
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EmailIcon />
          <Typography variant="h6">Change Email Address</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box py={1}>
          {message && (
            <Alert severity={message.type} sx={{ mb: 2 }}>
              {message.text}
            </Alert>
          )}

          <Box mb={3}>
            <Typography variant="body1" color="textSecondary" paragraph>
              {isAdminChangingOtherUser ? (
                <>Hello {currentUserName || 'Admin'}, you are requesting to change {targetUserName}'s email address. This is a secure process that requires verification.</>
              ) : (
                <>Hello {userName || currentUserName}, you are requesting to change your email address. This is a secure process that requires verification.</>
              )}
            </Typography>
            {prefilledNewEmail && (
              <Alert severity="info" sx={{ mt: 1 }}>
                {isAdminChangingOtherUser ? (
                  <>To change this user's email address, we need to verify the new email for security purposes.</>
                ) : (
                  <>To change your email address, we need to verify your new email for security purposes.</>
                )}
              </Alert>
            )}
          </Box>

          <Box mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Current Email Address
            </Typography>
            <Typography variant="body1">
              {currentEmail}
            </Typography>
          </Box>

          <TextField
            label="New Email Address"
            type="email"
            value={newEmail}
            onChange={(e) => handleEmailChange(e.target.value)}
            fullWidth
            required
            error={!!emailError}
            helperText={emailError}
            sx={{ mb: 3 }}
            disabled={emailChangeRequest.isPending}
          />

          <Alert severity="info" icon={<SecurityIcon />}>
            <Typography variant="body2">
              <strong>Security Process:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              {isAdminChangingOtherUser ? (
                <>
                  <li>A notification will be sent to the current email address</li>
                  <li>A verification link will be sent to the new email address</li>
                  <li>The email will only change after verification of the new address</li>
                  <li>The verification link expires in 24 hours</li>
                </>
              ) : (
                <>
                  <li>A notification will be sent to your current email address</li>
                  <li>A verification link will be sent to your new email address</li>
                  <li>Your email will only change after you verify the new address</li>
                  <li>The verification link expires in 24 hours</li>
                </>
              )}
            </Box>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={emailChangeRequest.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={emailChangeRequest.isPending || !newEmail || !!emailError}
          startIcon={emailChangeRequest.isPending ? <CircularProgress size={20} /> : <SecurityIcon />}
        >
          {emailChangeRequest.isPending ? 'Requesting...' : 'Request Email Change'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailChangeDialog;