import { Box, Typography, SxProps, Theme } from '@mui/material'
import Logo from './Logo'

interface BrandHeaderProps {
  /**
   * Size variant for the header
   */
  size?: 'sm' | 'md' | 'lg'
  
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
   * Additional styles
   */
  sx?: SxProps<Theme>
}

const sizeConfig = {
  sm: {
    logoSize: 'sm' as const,
    textVariant: 'h6' as const,
    gap: 1,
  },
  md: {
    logoSize: 'md' as const,
    textVariant: 'h5' as const,
    gap: 1.5,
  },
  lg: {
    logoSize: 'lg' as const,
    textVariant: 'h4' as const,
    gap: 2,
  },
} as const

export default function BrandHeader({
  size = 'md',
  showLogo = true,
  showText = true,
  text = 'CareTrack Pro',
  onLogoClick,
  sx,
}: BrandHeaderProps) {
  const config = sizeConfig[size]
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: config.gap,
        ...sx,
      }}
    >
      {showLogo && (
        <Box
          sx={{
            bgcolor: 'primary.main',
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Logo 
            size={config.logoSize} 
            variant="dark" 
            onClick={onLogoClick}
          />
        </Box>
      )}
      
      {showText && (
        <Typography
          variant={config.textVariant}
          component="h1"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            userSelect: 'none',
          }}
        >
          {text}
        </Typography>
      )}
    </Box>
  )
}