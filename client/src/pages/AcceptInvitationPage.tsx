import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Paper
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '@caretrack/shared';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { useConfirmation } from '../hooks/useConfirmation';

interface InvitationData {
  email: string;
  name?: string;
  userType: 'ADMIN' | 'CARER';
  invitedByName: string;
  expiresAt: string;
}

const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [activeStep, setActiveStep] = useState(0);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Confirmation dialog for decline invitation
  const { confirmationState, showConfirmation, hideConfirmation, handleConfirm } = useConfirmation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const steps = ['Verify Invitation', 'Set Password', 'Complete'];

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetchInvitationDetails();
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await apiService.get<InvitationData>(
        `${API_ENDPOINTS.INVITATIONS.ACCEPT}?token=${token}`
      );
      setInvitation(response);
      setActiveStep(1);
      setLoading(false);
    } catch (error: any) {
      setError(error.message || 'Failed to load invitation details');
      setLoading(false);
    }
  };


  const handleAcceptInvitation = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const requestData: any = {
        token,
        password
      };

      console.log('🎯 [FRONTEND-DEBUG] Starting invitation acceptance:', {
        endpoint: API_ENDPOINTS.INVITATIONS.ACCEPT,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        hasPassword: !!password,
        timestamp: new Date().toISOString()
      });

      await apiService.post(API_ENDPOINTS.INVITATIONS.ACCEPT, requestData);

      console.log('✅ [FRONTEND-DEBUG] Invitation acceptance successful');
      setSuccess(true);
      setActiveStep(2);
      
      // FIXED: Removed auto-redirect - let user click "Continue to Login" button manually
    } catch (error: any) {
      console.error('❌ [FRONTEND-DEBUG] Invitation acceptance failed:', {
        error: error.message || String(error),
        stack: error.stack,
        timestamp: new Date().toISOString(),
        errorType: error?.constructor?.name || 'Unknown'
      });
      
      setError(error.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineInvitation = () => {
    showConfirmation(
      {
        title: 'Decline Invitation',
        message: 'Are you sure you want to decline this invitation?',
        details: 'This action cannot be undone. You will not be able to accept this invitation later.',
        confirmText: 'Decline',
        severity: 'warning'
      },
      async () => {
        try {
          await apiService.post(API_ENDPOINTS.INVITATIONS.DECLINE, { token });
          navigate('/login', { 
            state: { 
              message: 'Invitation declined successfully.' 
            }
          });
        } catch (error: any) {
          setError(error.message || 'Failed to decline invitation');
        }
      }
    );
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Card>
          <CardContent>
            <Alert severity="error">
              Invalid invitation link. Please check your email and try again.
            </Alert>
            <Box mt={2} textAlign="center">
              <Button variant="outlined" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" component="h1" gutterBottom color="primary">
          🏥 CareTrack Pro
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Complete Your Registration
        </Typography>
      </Box>

      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box mb={4}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h5" gutterBottom textAlign="center">
                Set Your Password
              </Typography>
              <Typography variant="body2" color="textSecondary" textAlign="center" mb={2}>
                Welcome{invitation?.userType === 'ADMIN' ? ' Admin' : ' Carer'}{invitation?.name ? `, ${invitation.name.split(' ')[0]}!` : '!'} 
                {' '}Please create a secure password for your CareTrack Pro account.
              </Typography>
              <Typography variant="body2" color="primary" textAlign="center" mb={4}>
                📧 Your account will be created with the provided email address.
              </Typography>

              <Box component="form" onSubmit={(e) => { e.preventDefault(); handleAcceptInvitation(); }}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  helperText="Password must be at least 8 characters long"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  required
                  error={confirmPassword.length > 0 && password !== confirmPassword}
                  helperText={
                    confirmPassword.length > 0 && password !== confirmPassword
                      ? 'Passwords do not match'
                      : 'Please confirm your password'
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />


                <Box mt={4} display="flex" gap={2} justifyContent="center">
                  <Button
                    variant="outlined"
                    onClick={handleDeclineInvitation}
                    disabled={submitting}
                  >
                    Decline Invitation
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting || !password || !confirmPassword || password !== confirmPassword}
                    startIcon={submitting ? <CircularProgress size={20} /> : null}
                  >
                    {submitting ? 'Creating Account...' : 'Accept & Create Account'}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          {activeStep === 2 && success && (
            <Box textAlign="center">
              <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
              <Typography variant="h4" gutterBottom color="success.main">
                Welcome to CareTrack Pro!
              </Typography>
              <Typography variant="body1" color="textSecondary" mb={3}>
                Your account has been created successfully. Click the button below to continue to the login page.
              </Typography>
              <Paper elevation={1} sx={{ p: 3, backgroundColor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  What's Next?
                </Typography>
                <Typography variant="body2" textAlign="left">
                  • Log in with your email and the password you just created
                  <br />
                  • Explore your dashboard and available features
                  <br />
                  • Contact your administrator if you need help getting started
                </Typography>
              </Paper>
              <Box mt={3}>
                <Button 
                  variant="contained" 
                  onClick={() => navigate('/login', { 
                    state: { 
                      message: 'Account created successfully! Please log in with your credentials.' 
                    }
                  })}
                  size="large"
                >
                  Continue to Login
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Box mt={3} textAlign="center">
        <Typography variant="body2" color="textSecondary">
          Need help? Contact your system administrator
        </Typography>
      </Box>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmationState.open}
        onClose={hideConfirmation}
        onConfirm={handleConfirm}
        title={confirmationState.title}
        message={confirmationState.message}
        details={confirmationState.details}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        severity={confirmationState.severity}
        isLoading={confirmationState.isLoading}
        warnings={confirmationState.warnings}
      />
    </Container>
  );
};

export default AcceptInvitationPage;