import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '@caretrack/shared';

interface EmailChangeDetails {
  oldEmail: string;
  newEmail: string;
  status: string;
  expiresAt: string;
  isExpired: boolean;
  userType: 'ADMIN' | 'CARER';
}

const EmailChangeVerification: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [details, setDetails] = useState<EmailChangeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = searchParams.get('token');
  const action = searchParams.get('action') || (location.pathname.includes('/cancel') ? 'cancel' : 'verify');

  const fetchDetails = async () => {
    try {
      const response = await apiService.get<EmailChangeDetails>(
        `${API_ENDPOINTS.EMAIL_CHANGE.DETAILS}?token=${token}`
      );
      setDetails(response);
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid or expired verification link' });
    } finally {
      setLoading(false);
    }
  };

  const getAppropriateLoginRedirect = (userType: 'ADMIN' | 'CARER') => {
    // TODO: Create separate carer login page
    // For now, redirect carers to main login page with a note
    if (userType === 'CARER') {
      return '/login'; // TODO: Change to '/carer-login' when carer login page is created
    }
    return '/login'; // Admin login page
  };

  const handleCancel = async () => {
    if (!token) return;

    setLoading(false); // Stop loading spinner
    setCancelling(true);
    try {
      // First get the details to know user type for proper redirect
      const detailsResponse = await apiService.get<EmailChangeDetails>(
        `${API_ENDPOINTS.EMAIL_CHANGE.DETAILS}?token=${token}`
      );
      
      await apiService.post(API_ENDPOINTS.EMAIL_CHANGE.CANCEL, { token });
      setMessage({ type: 'success', text: 'Email change request has been cancelled successfully.' });
      
      // Redirect to appropriate login page after 3 seconds
      setTimeout(() => {
        navigate(getAppropriateLoginRedirect(detailsResponse.userType));
      }, 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to cancel email change' });
      // Fallback redirect on error
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    // If this is a cancel action, automatically cancel the request
    if (action === 'cancel') {
      handleCancel();
      return; // Don't fetch details for cancel action
    }

    fetchDetails();
  }, [token, navigate, action]);

  const handleVerify = async () => {
    if (!token) return;

    setVerifying(true);
    try {
      const response = await apiService.post(API_ENDPOINTS.EMAIL_CHANGE.VERIFY, { token });
      const userType = details?.userType || 'ADMIN'; // Default to ADMIN if not available
      const loginMessage = userType === 'CARER' 
        ? 'Email address successfully updated! You can now use your new email to log in to the carer portal.'
        : 'Email address successfully updated! You can now use your new email to log in to the admin portal.';
      setMessage({ type: 'success', text: loginMessage });
      
      // Store email change success info for the main app to detect
      if (response && typeof response === 'object' && 'data' in response) {
        const responseData = response.data as any;
        localStorage.setItem('emailChangeSuccess', JSON.stringify({
          userId: responseData.userId,
          userType: responseData.userType,
          newEmail: responseData.newEmail,
          timestamp: Date.now()
        }));
      }
      
      setTimeout(() => {
        navigate(getAppropriateLoginRedirect(userType));
      }, 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to verify email change' });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <EmailIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Typography variant="h4" component="h1">
              Email Change
            </Typography>
          </Box>

          {message ? (
            <Alert severity={message.type} sx={{ mb: 3 }}>
              {message.text}
            </Alert>
          ) : details ? (
            <>
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  {action === 'cancel' ? 'Cancel Email Change' : 'Verify New Email Address'}
                </Typography>
                <Typography color="textSecondary" paragraph>
                  {action === 'cancel' 
                    ? 'You are about to cancel the email change request for your account.'
                    : 'Please verify your new email address to complete the change.'
                  }
                </Typography>
              </Box>

              <Box mb={3} p={2} bgcolor="grey.50" borderRadius={1}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Current Email
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {details.oldEmail}
                </Typography>
                
                <Divider sx={{ my: 1 }} />
                
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  New Email
                </Typography>
                <Typography variant="body1">
                  {details.newEmail}
                </Typography>
              </Box>

              {details.isExpired ? (
                <Alert severity="error" sx={{ mb: 3 }}>
                  This email change request has expired. Please initiate a new email change request from your account settings.
                </Alert>
              ) : details.status !== 'PENDING' ? (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  This email change request has already been processed.
                </Alert>
              ) : (
                <Box mb={3}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center">
                      <SecurityIcon sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        This request expires on {new Date(details.expiresAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Alert>

                  <Box display="flex" gap={2} justifyContent="center">
                    {action === 'cancel' ? (
                      <Button
                        variant="contained"
                        color="error"
                        size="large"
                        onClick={handleCancel}
                        disabled={cancelling}
                        startIcon={cancelling ? <CircularProgress size={20} /> : <CancelIcon />}
                      >
                        {cancelling ? 'Cancelling...' : 'Cancel Email Change'}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={handleVerify}
                        disabled={verifying}
                        startIcon={verifying ? <CircularProgress size={20} /> : <CheckIcon />}
                      >
                        {verifying ? 'Verifying...' : 'Verify Email Change'}
                      </Button>
                    )}
                  </Box>
                </Box>
              )}

              <Box mt={3} textAlign="center">
                <Typography variant="body2" color="textSecondary">
                  Having trouble? Contact your system administrator for assistance.
                </Typography>
              </Box>
            </>
          ) : (
            <Alert severity="error">
              Unable to load email change details. The link may be invalid or expired.
            </Alert>
          )}

          <Box mt={3} textAlign="center">
            <Button variant="text" onClick={() => navigate('/')}>
              Back to Login
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default EmailChangeVerification;