import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  Divider,
  Chip,
  LinearProgress,
  keyframes,
  alpha,
  useTheme,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  Person as PersonIcon,
  HealthAndSafety as HealthIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { ERROR_MESSAGES } from '@caretrack/shared'
import { BrandHeader } from '../components/common'

interface LoginFormData {
  email: string
  password: string
}

// Professional animations
const slideUpAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const fadeInAnimation = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const pulseAnimation = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginProgress, setLoginProgress] = useState(0)
  const [isAnimated, setIsAnimated] = useState(false)
  
  const { login } = useAuth()
  const { showSuccess } = useNotification()
  const theme = useTheme()

  useEffect(() => {
    setIsAnimated(true)
  }, [])
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setError('')
    setLoginProgress(0)

    try {
      // Simulate professional login progress
      const progressInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      await login(data.email, data.password)
      
      setLoginProgress(100)
      showSuccess('Successfully authenticated - Welcome to CareTrack Pro')
    } catch (err) {
      console.error('❌ Login failed:', err)
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS)
      setLoginProgress(0)
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Floating Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          right: '10%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          animation: `${pulseAnimation} 4s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '8%',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.03)',
          animation: `${pulseAnimation} 6s ease-in-out infinite`,
          animationDelay: '2s',
        }}
      />
      
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            animation: isAnimated ? `${slideUpAnimation} 0.8s ease-out` : 'none',
            transform: isAnimated ? 'translateY(0)' : 'translateY(30px)',
            opacity: isAnimated ? 1 : 0,
            transition: 'all 0.8s ease-out',
            mx: { xs: 1, sm: 0 }, // Add margin on mobile
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 0,
              borderRadius: 4,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0px 24px 48px rgba(10, 34, 60, 0.15)',
              overflow: 'hidden',
            }}
          >
            {/* Header Section */}
            <Box
              sx={{
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                p: { xs: 3, sm: 4 }, // Responsive padding
                textAlign: 'center',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
              }}
            >
              <Box sx={{ mb: 3 }}>
                <BrandHeader 
                  size="lg" 
                  sx={{
                    justifyContent: 'center',
                    animation: isAnimated ? `${fadeInAnimation} 1s ease-out 0.3s both` : 'none',
                  }}
                />
              </Box>
              
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={1} 
                justifyContent="center" 
                sx={{ mb: 2, alignItems: 'center' }}
              >
                <Chip
                  icon={<SecurityIcon />}
                  label="Secure Login"
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    minHeight: { xs: 32, sm: 28 }, // Touch-friendly on mobile
                  }}
                />
                <Chip
                  icon={<HealthIcon />}
                  label="Healthcare Grade"
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: alpha(theme.palette.success.main, 0.3),
                    color: theme.palette.success.main,
                    fontWeight: 600,
                    minHeight: { xs: 32, sm: 28 }, // Touch-friendly on mobile
                  }}
                />
              </Stack>
              
              <Typography
                variant="h5"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  mb: 1,
                }}
              >
                Healthcare System Login
              </Typography>
              
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  fontWeight: 500,
                  opacity: 0.8,
                }}
              >
                Professional Care Management System
              </Typography>
            </Box>

            {/* Login Form Section */}
            <Box sx={{ p: { xs: 3, sm: 4 } }}>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Stack spacing={{ xs: 2.5, sm: 3 }}>
                  {/* Email Field */}
                  <Box>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      {...register('email', {
                        required: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD,
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: ERROR_MESSAGES.VALIDATION.INVALID_EMAIL,
                        },
                      })}
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      disabled={loading}
                      autoComplete="email"
                      autoFocus
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover fieldset': {
                            borderColor: alpha(theme.palette.primary.main, 0.5),
                          },
                        },
                        '& .MuiInputLabel-root': {
                          fontWeight: 500,
                        },
                      }}
                    />
                  </Box>

                  {/* Password Field */}
                  <Box>
                    <TextField
                      fullWidth
                      label="Secure Password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', {
                        required: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD,
                      })}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      disabled={loading}
                      autoComplete="current-password"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <ShieldIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => setShowPassword(!showPassword)}
                              onMouseDown={(e) => e.preventDefault()}
                              edge="end"
                              sx={{
                                color: 'text.secondary',
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                },
                              }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover fieldset': {
                            borderColor: alpha(theme.palette.primary.main, 0.5),
                          },
                        },
                        '& .MuiInputLabel-root': {
                          fontWeight: 500,
                        },
                      }}
                    />
                  </Box>

                  {/* Error Alert */}
                  {error && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        borderRadius: 3,
                        '& .MuiAlert-message': {
                          fontWeight: 500,
                        },
                      }}
                    >
                      {error}
                    </Alert>
                  )}

                  {/* Loading Progress */}
                  {loading && (
                    <Box>
                      <LinearProgress
                        variant="determinate"
                        value={loginProgress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                          },
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          textAlign: 'center',
                          mt: 1,
                          color: 'text.secondary',
                          fontWeight: 500,
                        }}
                      >
                        Authenticating... {loginProgress}%
                      </Typography>
                    </Box>
                  )}

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                      py: 1.8,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      boxShadow: '0px 4px 12px rgba(10, 34, 60, 0.3)',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                        boxShadow: '0px 6px 16px rgba(10, 34, 60, 0.4)',
                        transform: 'translateY(-2px)',
                      },
                      '&:disabled': {
                        background: alpha(theme.palette.primary.main, 0.3),
                        transform: 'none',
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {loading ? (
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography>Authenticating</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {[0, 1, 2].map((index) => (
                            <Box
                              key={index}
                              sx={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                bgcolor: 'currentColor',
                                animation: `${pulseAnimation} 1.4s ease-in-out infinite`,
                                animationDelay: `${index * 0.2}s`,
                              }}
                            />
                          ))}
                        </Box>
                      </Stack>
                    ) : (
                      'Sign In to CareTrack Pro'
                    )}
                  </Button>

                  {/* Divider */}
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Need Help?
                    </Typography>
                  </Divider>

                  {/* Forgot Password Link */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Link
                      href="/forgot-password"
                      variant="body2"
                      sx={{
                        textDecoration: 'none',
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        '&:hover': {
                          textDecoration: 'underline',
                          color: theme.palette.primary.dark,
                        },
                      }}
                    >
                      Reset Password →
                    </Link>
                  </Box>
                </Stack>
              </form>
            </Box>

            {/* Footer Section */}
            <Box
              sx={{
                p: 3,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                textAlign: 'center',
              }}
            >
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  🔒 User accounts are created by invitation only
                </Typography>
                
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Chip
                    icon={<SecurityIcon />}
                    label="GDPR Compliant"
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: alpha(theme.palette.success.main, 0.3),
                      color: theme.palette.success.main,
                      fontSize: '0.75rem',
                    }}
                  />
                  <Chip
                    icon={<ShieldIcon />}
                    label="Enterprise Security"
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: alpha(theme.palette.info.main, 0.3),
                      color: theme.palette.info.main,
                      fontSize: '0.75rem',
                    }}
                  />
                </Stack>
                
                <Typography variant="caption" color="text.secondary">
                  © 2023 Joshs care company Ltd. All rights reserved.
                </Typography>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

// Export enhanced login component
export const HealthcareLogin = LoginPage