import { Box, Typography, SxProps, Theme, useTheme } from '@mui/material'
import Logo from './Logo'

interface BrandHeaderProps {
  /**
   * Size variant for the header
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Whether to show the logo
   */
  showLogo?: boolean
  
  /**
   * Whether to show the text
   */
  showText?: boolean
  
  /**
   * Custom text to display instead of "CareTrack Pro"
   */
  text?: string
  
  /**
   * Logo click handler
   */
  onLogoClick?: () => void
  
  /**
   * Color variant for different backgrounds
   */
  variant?: 'light' | 'dark'
  
  /**
   * Whether the header should be clickable
   */
  clickable?: boolean
  
  /**
   * Additional styles
   */
  sx?: SxProps<Theme>
}

const sizeConfig = {
  sm: {
    logoSize: 'sm' as const,
    textVariant: 'h6' as const,
    gap: 1,
    padding: 1.5,
  },
  md: {
    logoSize: 'md' as const,
    textVariant: 'h5' as const,
    gap: 2,
    padding: 2,
  },
  lg: {
    logoSize: 'lg' as const,
    textVariant: 'h4' as const,
    gap: 2.5,
    padding: 2.5,
  },
  xl: {
    logoSize: 'xl' as const,
    textVariant: 'h3' as const,
    gap: 3,
    padding: 3,
  },
} as const

export default function BrandHeader({
  size = 'md',
  showLogo = true,
  showText = true,
  text = 'CareTrack Pro',
  onLogoClick,
  variant = 'light',
  clickable = false,
  sx,
}: BrandHeaderProps) {
  const theme = useTheme()
  const config = sizeConfig[size]
  const isClickable = clickable || !!onLogoClick
  
  const handleClick = () => {
    if (onLogoClick) {
      onLogoClick()
    }
  }
  
  return (
    <Box
      onClick={isClickable ? handleClick : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: config.gap,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        borderRadius: 3,
        padding: isClickable ? 1 : 0,
        '&:hover': isClickable ? {
          backgroundColor: variant === 'light' 
            ? 'rgba(10, 34, 60, 0.04)' 
            : 'rgba(255, 255, 255, 0.08)',
          transform: 'translateY(-1px)',
        } : {},
        ...sx,
      }}
    >
      {showLogo && (
        <Box
          sx={{
            backgroundColor: variant === 'light' ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            p: config.padding,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: variant === 'dark' ? 'blur(8px)' : 'none',
            border: variant === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: variant === 'light' 
              ? '0px 2px 4px rgba(10, 34, 60, 0.08)'
              : '0px 4px 8px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': isClickable ? {
              transform: 'scale(1.02)',
              boxShadow: variant === 'light' 
                ? '0px 4px 8px rgba(10, 34, 60, 0.12)'
                : '0px 6px 12px rgba(0, 0, 0, 0.3)',
            } : {},
          }}
        >
          <Logo 
            size={config.logoSize} 
            variant="dark" 
          />
        </Box>
      )}
      
      {showText && (
        <Typography
          variant={config.textVariant}
          component="h1"
          sx={{
            fontWeight: 700,
            color: variant === 'light' ? theme.palette.primary.main : '#ffffff',
            userSelect: 'none',
            letterSpacing: '-0.02em',
            textShadow: variant === 'dark' ? '0px 2px 4px rgba(0, 0, 0, 0.3)' : 'none',
            background: variant === 'light' ? 'none' : 'linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%)',
            backgroundClip: variant === 'dark' ? 'text' : 'none',
            WebkitBackgroundClip: variant === 'dark' ? 'text' : 'none',
            WebkitTextFillColor: variant === 'dark' ? 'transparent' : 'inherit',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {text}
        </Typography>
      )}
    </Box>
  )
}

// Export named component as well
export { BrandHeader }