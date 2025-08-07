import React from 'react'
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  alpha,
  useTheme,
  Chip,
  IconButton,
  useMediaQuery,
} from '@mui/material'
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material'

interface DashboardCardProps {
  title: string
  description: string
  icon: string
  color: string
  onClick: () => void
  badge?: string | number
  isActive?: boolean
  disabled?: boolean
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon,
  color,
  onClick,
  badge,
  isActive = false,
  disabled = false,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))
  
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'visible',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        border: `2px solid ${isActive ? color : 'transparent'}`,
        background: isActive 
          ? `linear-gradient(135deg, ${alpha(color, 0.05)} 0%, ${alpha(color, 0.02)} 100%)`
          : theme.palette.background.paper,
        '&:hover': disabled ? {} : {
          transform: isMobile ? 'scale(1.02)' : 'translateY(-6px)', // Different hover effect on mobile
          boxShadow: `0px 12px 24px ${alpha(color, 0.15)}, 0px 0px 0px 1px ${alpha(color, 0.1)}`,
          '& .card-icon': {
            transform: isMobile ? 'scale(1.05)' : 'scale(1.05) rotate(5deg)', // No rotation on mobile
            boxShadow: `0px 8px 16px ${alpha(color, 0.2)}`,
          },
          '& .arrow-icon': {
            transform: 'translateX(4px)',
            opacity: 1,
          },
          '& .card-accent': {
            transform: 'scaleX(1.02)',
          },
        },
        // Touch interactions for mobile
        '&:active': {
          transform: isMobile ? 'scale(0.98)' : 'translateY(-2px)',
          transition: 'transform 0.1s ease-in-out',
        },
      }}
    >
      {/* Badge */}
      {badge && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            zIndex: 1,
          }}
        >
          <Chip
            label={badge}
            size="small"
            sx={{
              backgroundColor: theme.palette.error.main,
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem',
              minWidth: 24,
              height: 24,
            }}
          />
        </Box>
      )}
      
      <CardActionArea
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        sx={{
          height: '100%',
          borderRadius: 4,
        }}
      >
        <CardContent 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            p: 3,
            '&:last-child': {
              pb: 3,
            },
          }}
        >
          {/* Header with Icon and Arrow */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            {/* Icon */}
            <Box
              className="card-icon"
              sx={{
                width: isMobile ? 60 : isTablet ? 66 : 72, // Responsive icon sizing
                height: isMobile ? 60 : isTablet ? 66 : 72,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
                border: `2px solid ${alpha(color, 0.1)}`,
                fontSize: isMobile ? '1.8rem' : isTablet ? '2rem' : '2.25rem', // Responsive font size
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0px 4px 8px ${alpha(color, 0.1)}`,
              }}
            >
              {icon}
            </Box>
            
            {/* Arrow Icon */}
            <Box
              className="arrow-icon"
              sx={{
                opacity: 0.6,
                transition: 'all 0.3s ease-in-out',
                color: theme.palette.text.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
              }}
            >
              <ArrowForwardIcon fontSize="small" />
            </Box>
          </Box>

          {/* Title */}
          <Typography
            variant="h6"
            component="h3"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              lineHeight: 1.3,
              mb: 1,
              fontSize: isMobile ? '1rem' : isTablet ? '1.05rem' : '1.1rem', // Responsive title size
            }}
          >
            {title}
          </Typography>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              flexGrow: 1,
              lineHeight: 1.5,
              fontSize: isMobile ? '0.8125rem' : '0.875rem', // Slightly smaller on mobile
              mb: isMobile ? 2 : 3, // Reduced margin on mobile
              display: isMobile ? '-webkit-box' : 'block', // Ensure text doesn't overflow on mobile
              WebkitLineClamp: isMobile ? 2 : 'none',
              WebkitBoxOrient: 'vertical',
              overflow: isMobile ? 'hidden' : 'visible',
            }}
          >
            {description}
          </Typography>

          {/* Professional accent bar with gradient */}
          <Box
            className="card-accent"
            sx={{
              width: '100%',
              height: 6,
              background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.6)} 100%)`,
              borderRadius: 3,
              transition: 'transform 0.3s ease-in-out',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${alpha(color, 0.8)} 0%, ${color} 100%)`,
                opacity: 0,
                transition: 'opacity 0.3s ease-in-out',
              },
              '&:hover::after': {
                opacity: 1,
              },
            }}
          />
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default DashboardCard

// Professional healthcare card variant
export const HealthcareCard = DashboardCard