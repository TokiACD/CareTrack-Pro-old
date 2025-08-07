import { Box, CircularProgress, Typography, LinearProgress, useTheme, alpha, keyframes } from '@mui/material'
import Logo from './Logo'
import BrandHeader from './BrandHeader'

interface LoadingScreenProps {
  message?: string
  progress?: number
  variant?: 'splash' | 'inline' | 'overlay'
  showLogo?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// Professional loading animations
const pulseAnimation = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
`

const slideInAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const rotateAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

function LoadingScreen({ 
  message = 'Loading healthcare dashboard...', 
  progress,
  variant = 'splash',
  showLogo = true,
  size = 'lg'
}: LoadingScreenProps) {
  const theme = useTheme()
  
  if (variant === 'inline') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <CircularProgress size={size === 'sm' ? 24 : size === 'md' ? 32 : 40} />
        {message && (
          <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
            {message}
          </Typography>
        )}
      </Box>
    )
  }
  
  if (variant === 'overlay') {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.background.default, 0.8),
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
        }}
      >
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.primary">
          {message}
        </Typography>
      </Box>
    )
  }
  
  // Splash screen variant (default)
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        bgcolor: theme.palette.primary.main,
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
          background: 'radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          animation: `${pulseAnimation} 3s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          left: '15%',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.03)',
          animation: `${pulseAnimation} 4s ease-in-out infinite`,
          animationDelay: '1s',
        }}
      />
      
      {/* Main Loading Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: `${slideInAnimation} 0.8s ease-out`,
          zIndex: 1,
        }}
      >
        {/* Professional Logo Container */}
        {showLogo && (
          <Box
            sx={{
              mb: 6,
              position: 'relative',
            }}
          >
            <BrandHeader
              size="xl"
              variant="dark"
              sx={{
                '& > *': {
                  animation: `${slideInAnimation} 1s ease-out 0.2s both`,
                },
              }}
            />
          </Box>
        )}
        
        {/* Advanced Loading Indicator */}
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 4,
          }}
        >
          {/* Outer Ring */}
          <Box
            sx={{
              position: 'absolute',
              width: 80,
              height: 80,
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              animation: `${rotateAnimation} 8s linear infinite reverse`,
            }}
          />
          
          {/* Middle Ring */}
          <Box
            sx={{
              position: 'absolute',
              width: 64,
              height: 64,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              animation: `${rotateAnimation} 6s linear infinite`,
            }}
          />
          
          {/* Inner Loading Spinner */}
          <CircularProgress 
            size={48} 
            thickness={3}
            variant={progress !== undefined ? 'determinate' : 'indeterminate'}
            value={progress}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.9)',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }} 
          />
        </Box>
        
        {/* Progress Bar (if progress is provided) */}
        {progress !== undefined && (
          <Box sx={{ width: 200, mb: 3 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                },
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                mt: 1,
                fontSize: '0.75rem',
              }}
            >
              {Math.round(progress)}% Complete
            </Typography>
          </Box>
        )}
        
        {/* Loading Message */}
        <Typography
          variant="h6"
          sx={{
            color: 'rgba(255, 255, 255, 0.95)',
            fontWeight: 500,
            textAlign: 'center',
            mb: 1,
            letterSpacing: '0.5px',
          }}
        >
          {message}
        </Typography>
        
        {/* Subtitle */}
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center',
            fontWeight: 400,
          }}
        >
          Please wait while we prepare your healthcare management system
        </Typography>
        
        {/* Professional Loading Dots */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mt: 3,
            gap: 1,
          }}
        >
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.6)',
                animation: `${pulseAnimation} 1.5s ease-in-out infinite`,
                animationDelay: `${index * 0.3}s`,
              }}
            />
          ))}
        </Box>
      </Box>
      
      {/* Footer */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.75rem',
          }}
        >
          CareTrack Pro © 2024 | Professional Healthcare Management
        </Typography>
      </Box>
    </Box>
  )
}

export default LoadingScreen

// Export variants for different use cases
export const InlineLoader = (props: Omit<LoadingScreenProps, 'variant'>) => (
  <LoadingScreen {...props} variant="inline" />
)

export const OverlayLoader = (props: Omit<LoadingScreenProps, 'variant'>) => (
  <LoadingScreen {...props} variant="overlay" />
)

export const SplashLoader = (props: Omit<LoadingScreenProps, 'variant'>) => (
  <LoadingScreen {...props} variant="splash" />
)