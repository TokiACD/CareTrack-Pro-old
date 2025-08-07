import React from 'react'
import { Box, Breadcrumbs, Link, Typography, useTheme } from '@mui/material'
import { Home as HomeIcon, NavigateNext } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
  icon?: React.ReactNode
  active?: boolean
}

interface BreadcrumbNavigationProps {
  /** 
   * Array of breadcrumb items in order from root to current page
   */
  items: BreadcrumbItem[]
  
  /**
   * Maximum number of breadcrumb items to show before collapsing
   * @default 4
   */
  maxItems?: number
  
  /**
   * Custom separator between breadcrumb items
   * @default NavigateNext icon
   */
  separator?: React.ReactNode
  
  /**
   * Additional styling
   */
  sx?: any
}

/**
 * Consistent breadcrumb navigation component for CareTrack Pro
 * Implements healthcare professional navigation patterns with #0a223c theme
 */
export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  items,
  maxItems = 4,
  separator = <NavigateNext fontSize="small" />,
  sx = {}
}) => {
  const theme = useTheme()
  const navigate = useNavigate()

  // Ensure we always have a home breadcrumb as the first item
  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      onClick: () => navigate('/dashboard'),
      icon: <HomeIcon fontSize="small" />,
      active: false
    },
    ...items
  ]

  const handleItemClick = (item: BreadcrumbItem, index: number) => {
    // Don't allow clicking on the last (current) item
    if (index === breadcrumbItems.length - 1) return

    if (item.onClick) {
      item.onClick()
    } else if (item.href) {
      navigate(item.href)
    }
  }

  return (
    <Box
      sx={{
        py: 2,
        px: 0,
        ...sx
      }}
    >
      <Breadcrumbs
        maxItems={maxItems}
        separator={separator}
        aria-label="Healthcare system navigation"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            color: theme.palette.text.secondary,
            mx: 1,
          },
          '& .MuiBreadcrumbs-ol': {
            flexWrap: 'wrap',
          },
        }}
      >
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          const isClickable = !isLast && (item.onClick || item.href)

          return isLast ? (
            // Current page - not clickable
            <Typography
              key={index}
              color="primary.main"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
              aria-current="page"
            >
              {item.icon && item.icon}
              {item.label}
            </Typography>
          ) : (
            // Navigable breadcrumb
            <Link
              key={index}
              component={isClickable ? 'button' : 'span'}
              onClick={isClickable ? () => handleItemClick(item, index) : undefined}
              underline="hover"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: theme.palette.text.secondary,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: isClickable ? 'pointer' : 'default',
                textDecoration: 'none',
                border: 'none',
                background: 'none',
                padding: 0,
                '&:hover': isClickable ? {
                  color: theme.palette.primary.main,
                  textDecoration: 'underline',
                } : {},
                '&:focus': isClickable ? {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: '2px',
                  borderRadius: '4px',
                } : {},
                transition: 'color 0.2s ease-in-out',
              }}
            >
              {item.icon && item.icon}
              {item.label}
            </Link>
          )
        })}
      </Breadcrumbs>
    </Box>
  )
}

/**
 * Hook to generate common breadcrumb patterns for CareTrack Pro
 */
export const useBreadcrumbItems = () => {
  const navigate = useNavigate()

  return {
    // Assessment workflows
    assessments: () => ({
      label: 'Assessments',
      href: '/assessments',
      onClick: () => navigate('/assessments'),
      icon: <Typography component="span" sx={{ mr: 0.5 }}>📋</Typography>
    }),
    
    takeAssessment: (assessmentName: string) => ({
      label: `Take: ${assessmentName}`,
      active: true,
      icon: <Typography component="span" sx={{ mr: 0.5 }}>✍️</Typography>
    }),

    // Progress tracking
    progress: () => ({
      label: 'Progress Tracking',
      href: '/progress',
      onClick: () => navigate('/progress'),
      icon: <Typography component="span" sx={{ mr: 0.5 }}>📊</Typography>
    }),

    carerProgress: (carerName: string) => ({
      label: carerName,
      active: true,
      icon: <Typography component="span" sx={{ mr: 0.5 }}>👤</Typography>
    }),

    // Rota management
    rota: () => ({
      label: 'Rota Scheduling',
      href: '/rota',
      onClick: () => navigate('/rota'),
      icon: <Typography component="span" sx={{ mr: 0.5 }}>📅</Typography>
    }),

    // Shift management
    shiftSender: () => ({
      label: 'Shift Sender',
      href: '/dashboard',
      onClick: () => navigate('/dashboard'),
      icon: <Typography component="span" sx={{ mr: 0.5 }}>📱</Typography>
    }),

    createShift: (shiftType?: string) => ({
      label: `Create ${shiftType || ''} Shift`,
      active: true,
      icon: <Typography component="span" sx={{ mr: 0.5 }}>➕</Typography>
    }),

    manageShifts: () => ({
      label: 'Shift Management',
      active: true,
      icon: <Typography component="span" sx={{ mr: 0.5 }}>⚙️</Typography>
    }),

    // Audit logs
    auditLogs: () => ({
      label: 'System Audit',
      active: true,
      icon: <Typography component="span" sx={{ mr: 0.5 }}>🔍</Typography>
    }),

    // Task management
    tasks: () => ({
      label: 'Task Management',
      href: '/tasks',
      onClick: () => navigate('/tasks'),
      icon: <Typography component="span" sx={{ mr: 0.5 }}>✅</Typography>
    }),

    // Assignment management
    assignments: () => ({
      label: 'Staff Assignments',
      href: '/assignments',
      onClick: () => navigate('/assignments'),
      icon: <Typography component="span" sx={{ mr: 0.5 }}>🔗</Typography>
    }),

    // Recycle bin
    recycleBin: () => ({
      label: 'Archive Management',
      href: '/recycle-bin',
      onClick: () => navigate('/recycle-bin'),
      icon: <Typography component="span" sx={{ mr: 0.5 }}>🗑️</Typography>
    })
  }
}

export default BreadcrumbNavigation