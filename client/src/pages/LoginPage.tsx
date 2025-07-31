import { useState } from 'react'
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
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { ERROR_MESSAGES } from '@caretrack/shared'

interface LoginFormData {
  email: string
  password: string
}

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  const { login } = useAuth()
  const { showSuccess } = useNotification()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setError('')

    try {
      await login(data.email, data.password)
      showSuccess('Successfully logged in')
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                mb: 1,
              }}
            >
              CareTrack Pro
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontWeight: 400 }}
            >
              Admin Dashboard
            </Typography>
          </Box>

          <Card elevation={0} sx={{ bgcolor: 'transparent' }}>
            <CardContent sx={{ p: 0 }}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Email Address"
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
                  />
                </Box>

                <Box sx={{ mb: 4 }}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    {...register('password', {
                      required: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD,
                    })}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Admin accounts are created by invitation only
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}