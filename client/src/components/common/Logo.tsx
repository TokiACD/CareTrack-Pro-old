import { Box, SxProps, Theme } from '@mui/material'
import logoWhite from '../../assets/images/logo-white.png'

interface LogoProps {
  /**
   * Size of the logo
   * - xs: 24px height
   * - sm: 32px height  
   * - md: 40px height (default)
   * - lg: 48px height
   * - xl: 64px height
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Whether to show on dark background (uses white logo)
   */
  variant?: 'light' | 'dark'
  
  /**
   * Additional styles to apply
   */
  sx?: SxProps<Theme>
  
  /**
   * Alt text for accessibility
   */
  alt?: string
  
  /**
   * Click handler
   */
  onClick?: () => void
}

const sizeMap = {
  xs: { height: 24 },
  sm: { height: 32 },
  md: { height: 40 },
  lg: { height: 48 },
  xl: { height: 64 },
} as const

export default function Logo({ 
  size = 'md', 
  variant = 'dark', 
  sx, 
  alt = 'CareTrack Pro',
  onClick 
}: LogoProps) {
  const logoSrc = logoWhite // Always use white logo since we have dark backgrounds
  
  return (
    <Box
      component="img"
      src={logoSrc}
      alt={alt}
      onClick={onClick}
      sx={{
        ...sizeMap[size],
        width: 'auto',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...sx,
      }}
    />
  )
}