import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Alert,
  Container,
  Paper,
  Link
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { useNotification } from '../contexts/NotificationContext'
import { apiService } from '../services/api'
import { API_ENDPOINTS, ERROR_MESSAGES } from '@caretrack/shared'

interface ForgotPasswordFormData {
  email: string
}

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  
  const { showSuccess, showError } = useNotification()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm<ForgotPasswordFormData>()

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      await apiService.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data)
      setSuccess(true)
      showSuccess('Password reset instructions sent to your email')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.SYSTEM.SERVER_ERROR
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    window.location.href = '/login'
  }

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        py={4}
      >
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography 
            variant="h3" 
            component="h1" 
            fontWeight="bold" 
            color="primary"
            mb={1}
          >
            🏥 CareTrack Pro
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Care Management System
          </Typography>
        </Box>

        {/* Main Card */}
        <Paper elevation={8} sx={{ width: '100%', maxWidth: 450 }}>
          <Box 
            sx={{ 
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              color: 'white',
              textAlign: 'center',
              py: 3,
              borderRadius: '4px 4px 0 0'
            }}
          >
            <Typography variant="h5" fontWeight="600">
              Reset Password
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
              Enter your email to receive reset instructions
            </Typography>
          </Box>

          <Card elevation={0} sx={{ bgcolor: 'transparent' }}>
            <CardContent sx={{ p: 4 }}>
              {success ? (
                <Box textAlign="center">
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="body1" fontWeight="500">
                      Reset Link Sent!
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      If an account with the email <strong>{getValues('email')}</strong> exists, 
                      you will receive password reset instructions shortly.
                    </Typography>
                  </Alert>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Please check your email (including spam folder) for the reset link.
                  </Typography>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBackToLogin}
                    startIcon={<ArrowBack />}
                    sx={{ mt: 2 }}
                  >
                    Back to Login
                  </Button>
                </Box>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
                    </Alert>
                  )}

                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      {...register('email', {
                        required: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD,
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: ERROR_MESSAGES.VALIDATION.INVALID_EMAIL,
                        },
                      })}
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      disabled={loading}
                      autoComplete="email"
                      autoFocus
                    />
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ 
                      py: 1.5,
                      mb: 2,
                      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                      }
                    }}
                  >
                    {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                  </Button>

                  <Box sx={{ textAlign: 'center' }}>
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={handleBackToLogin}
                      sx={{ 
                        textDecoration: 'none',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      ← Back to Login
                    </Link>
                  </Box>
                </form>
              )}
            </CardContent>
          </Card>
        </Paper>

        {/* Footer */}
        <Typography 
          variant="body2" 
          color="text.secondary"
          textAlign="center"
          sx={{ mt: 4 }}
        >
          Secure password reset powered by CareTrack Pro
        </Typography>
      </Box>
    </Container>
  )
}