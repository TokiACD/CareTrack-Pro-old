import React from 'react'
import {
  Box,
  Typography,
  Alert,
  AlertTitle,
  Button,
  Container,
  Stack
} from '@mui/material'
import { Refresh as RefreshIcon, Warning as ErrorIcon } from '@mui/icons-material'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error | null
  resetErrorBoundary: () => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call the optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you might want to log to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error monitoring service
      // errorReportingService.captureException(error, { extra: errorInfo })
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent
            error={this.state.error}
            resetErrorBoundary={this.resetErrorBoundary}
          />
        )
      }

      // Default error fallback UI
      return <DefaultErrorFallback error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />
    }

    return this.props.children
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorIcon />
          Something went wrong
        </AlertTitle>
        <Typography variant="body2" color="text.secondary">
          An unexpected error occurred while rendering this component.
        </Typography>
      </Alert>

      <Stack spacing={2} alignItems="flex-start">
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={resetErrorBoundary}
          size="large"
        >
          Try Again
        </Button>

        <Button
          variant="outlined"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>

        {isDevelopment && error && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: 'grey.100',
              borderRadius: 1,
              width: '100%',
              maxWidth: '100%'
            }}
          >
            <Typography variant="subtitle2" color="error" gutterBottom>
              Error Details (Development Only):
            </Typography>
            <Typography
              variant="body2"
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'error.main'
              }}
            >
              {error.name}: {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
            </Typography>
          </Box>
        )}
      </Stack>
    </Container>
  )
}

// Specialized error boundaries for different parts of the app
export const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('Page Error:', error, errorInfo)
    }}
  >
    {children}
  </ErrorBoundary>
)

export const ComponentErrorBoundary: React.FC<{ children: React.ReactNode; componentName?: string }> = ({ 
  children, 
  componentName 
}) => (
  <ErrorBoundary
    fallback={({ error, resetErrorBoundary }) => (
      <Alert severity="error" sx={{ m: 2 }}>
        <AlertTitle>Component Error</AlertTitle>
        <Typography variant="body2" gutterBottom>
          {componentName ? `The ${componentName} component` : 'A component'} encountered an error.
        </Typography>
        <Button size="small" onClick={resetErrorBoundary} sx={{ mt: 1 }}>
          Retry Component
        </Button>
      </Alert>
    )}
    onError={(error, errorInfo) => {
      console.error(`Component Error in ${componentName || 'unknown component'}:`, error, errorInfo)
    }}
  >
    {children}
  </ErrorBoundary>
)

export const QueryErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={({ error, resetErrorBoundary }) => (
      <Alert severity="error" sx={{ m: 2 }}>
        <AlertTitle>Data Loading Error</AlertTitle>
        <Typography variant="body2" gutterBottom>
          Failed to load data. Please check your connection and try again.
        </Typography>
        <Button size="small" onClick={resetErrorBoundary} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Alert>
    )}
  >
    {children}
  </ErrorBoundary>
)

export default ErrorBoundary