import { Box, Typography, Breadcrumbs, Link, IconButton, SxProps, Theme } from '@mui/material'
import { ArrowBack as ArrowBackIcon, Home as HomeIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import Logo from './Logo'

interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
}

interface PageHeaderProps {
  /**
   * Page title
   */
  title: string
  
  /**
   * Page subtitle/description
   */
  subtitle?: string
  
  /**
   * Breadcrumb navigation items
   */
  breadcrumbs?: BreadcrumbItem[]
  
  /**
   * Whether to show back button
   */
  showBackButton?: boolean
  
  /**
   * Back button click handler (defaults to navigate(-1))
   */
  onBack?: () => void
  
  /**
   * Whether to show the logo
   */
  showLogo?: boolean
  
  /**
   * Additional actions to render on the right
   */
  actions?: React.ReactNode
  
  /**
   * Additional styles
   */
  sx?: SxProps<Theme>
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  showBackButton = false,
  onBack,
  showLogo = false,
  actions,
  sx,
}: PageHeaderProps) {
  const navigate = useNavigate()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }
  
  return (
    <Box
      sx={{
        bgcolor: 'primary.main',
        color: 'white',
        py: 3,
        px: 3,
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Logo Section */}
        {showLogo && (
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              p: 1.5,
              mr: 2,
            }}
          >
            <Logo size="md" variant="dark" />
          </Box>
        )}
        
        {/* Content Section */}
        <Box sx={{ flexGrow: 1 }}>
          {/* Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {showBackButton && (
              <IconButton
                onClick={handleBack}
                sx={{ 
                  color: 'white',
                  mr: 1,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumbs
                separator="›"
                sx={{
                  '& .MuiBreadcrumbs-separator': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                }}
              >
                {breadcrumbs.map((breadcrumb, index) => (
                  <Link
                    key={index}
                    component={breadcrumb.onClick ? "button" : "a"}
                    href={breadcrumb.href}
                    onClick={breadcrumb.onClick}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: index === breadcrumbs.length - 1 ? 'white' : 'rgba(255, 255, 255, 0.8)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: index === breadcrumbs.length - 1 ? 500 : 400,
                      '&:hover': {
                        color: 'white',
                        textDecoration: index === breadcrumbs.length - 1 ? 'none' : 'underline',
                      },
                    }}
                  >
                    {index === 0 && <HomeIcon fontSize="small" />}
                    {breadcrumb.label}
                  </Link>
                ))}
              </Breadcrumbs>
            )}
          </Box>
          
          {/* Title and Subtitle */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  mb: subtitle ? 1 : 0,
                }}
              >
                {title}
              </Typography>
              
              {subtitle && (
                <Typography
                  variant="body1"
                  sx={{
                    opacity: 0.9,
                    fontWeight: 400,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            
            {/* Actions */}
            {actions && (
              <Box sx={{ ml: 2 }}>
                {actions}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}