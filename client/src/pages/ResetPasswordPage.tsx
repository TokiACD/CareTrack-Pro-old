import { useState, useEffect } from 'react'
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
  Link,
  IconButton,
  InputAdornment
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { useNotification } from '../contexts/NotificationContext'
import { apiService } from '../services/api'
import { API_ENDPOINTS, ERROR_MESSAGES } from '@caretrack/shared'

interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

export function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [token, setToken] = useState<string>('')
  
  const { showSuccess, showError } = useNotification()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ResetPasswordFormData>()

  const password = watch('password')

  useEffect(() => {
    // Extract token from URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const resetToken = urlParams.get('token')
    
    if (!resetToken) {
      setError('Invalid or missing reset token')
      return
    }
    
    setToken(resetToken)
  }, [])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true)
    setError('')
    setSuccess(false)

    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      await apiService.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        token,
        password: data.password
      })
      setSuccess(true)
      showSuccess('Password has been reset successfully')
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

  const validatePassword = (value: string) => {
    if (value.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])/.test(value)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/(?=.*[A-Z])/.test(value)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/(?=.*\d)/.test(value)) {
      return 'Password must contain at least one number'
    }
    return true
  }

  if (!token && !error) {
    return (
      <Container maxWidth="sm">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    )
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
              Set New Password
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
              Choose a strong, secure password
            </Typography>
          </Box>

          <Card elevation={0} sx={{ bgcolor: 'transparent' }}>
            <CardContent sx={{ p: 4 }}>
              {success ? (
                <Box textAlign="center">
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="body1" fontWeight="500">
                      Password Reset Complete!
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Your password has been successfully reset. You can now log in with your new password.
                    </Typography>
                  </Alert>
                  
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleBackToLogin}
                    sx={{ 
                      mt: 2,
                      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                      }
                    }}
                  >
                    Go to Login
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
                      label="New Password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', {
                        required: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD,
                        validate: validatePassword
                      })}
                      error={!!errors.password}
                      helperText={errors.password?.message || 'Must be at least 8 characters with uppercase, lowercase, and number'}
                      disabled={loading}
                      autoComplete="new-password"
                      autoFocus
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => setShowPassword(!showPassword)}
                              onMouseDown={(e) => e.preventDefault()}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Confirm New Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword', {
                        required: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD,
                        validate: (value) => 
                          value === password || 'Passwords do not match'
                      })}
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                      disabled={loading}
                      autoComplete="new-password"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle confirm password visibility"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              onMouseDown={(e) => e.preventDefault()}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading || !token}
                    sx={{ 
                      py: 1.5,
                      mb: 2,
                      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                      }
                    }}
                  >
                    {loading ? 'Resetting Password...' : 'Reset Password'}
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