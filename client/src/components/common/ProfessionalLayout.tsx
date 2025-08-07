import React, { useState, ReactNode } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  alpha,
  Divider,
  Collapse,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Stack,
  Paper,
} from '@mui/material'
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ExpandLess,
  ExpandMore,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Notifications as NotificationIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import BrandHeader from './BrandHeader'
import ShiftNotifications from '../dashboard/ShiftNotifications'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  children?: NavigationItem[]
  badge?: string | number
  category?: string
}

interface ProfessionalLayoutProps {
  children: ReactNode
  title?: string
}

const DRAWER_WIDTH = 280
const DRAWER_WIDTH_COLLAPSED = 64

// Professional navigation structure
const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    category: 'main',
  },
  {
    id: 'users',
    label: 'User Management',
    icon: <PeopleIcon />,
    path: '/dashboard',
    category: 'management',
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: <AssignmentIcon />,
    path: '/dashboard',
    category: 'operations',
    children: [
      {
        id: 'tasks',
        label: 'Tasks',
        icon: <AssignmentIcon />,
        path: '/tasks',
      },
      {
        id: 'assignments',
        label: 'Assignments',
        icon: <AssignmentIcon />,
        path: '/assignments',
      },
      {
        id: 'rota',
        label: 'Scheduling',
        icon: <ScheduleIcon />,
        path: '/rota',
      },
    ],
  },
  {
    id: 'assessments',
    label: 'Assessments',
    icon: <AssessmentIcon />,
    path: '/assessments',
    category: 'quality',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <AnalyticsIcon />,
    path: '/dashboard',
    category: 'analytics',
    children: [
      {
        id: 'progress',
        label: 'Progress Tracking',
        icon: <AnalyticsIcon />,
        path: '/progress',
      },
      {
        id: 'reports',
        label: 'Care Records',
        icon: <AssessmentIcon />,
        path: '/dashboard',
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: <SecurityIcon />,
    path: '/dashboard',
    category: 'system',
    children: [
      {
        id: 'audit',
        label: 'Audit Logs',
        icon: <SecurityIcon />,
        path: '/audit-logs',
      },
      {
        id: 'recycle',
        label: 'Archive',
        icon: <SettingsIcon />,
        path: '/recycle-bin',
      },
    ],
  },
]

export default function ProfessionalLayout({ children, title }: ProfessionalLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [expandedItems, setExpandedItems] = useState<string[]>(['operations'])
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { showSuccess } = useNotification()

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen)
  }

  const handleExpandToggle = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    if (isMobile) {
      setDrawerOpen(false)
    }
  }

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null)
  }

  const handleLogout = () => {
    logout()
    showSuccess('Successfully logged out')
    handleUserMenuClose()
  }

  const isItemActive = (path: string) => {
    return location.pathname === path
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isActive = isItemActive(item.path)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)

    return (
      <Box key={item.id}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={hasChildren ? () => handleExpandToggle(item.id) : () => handleNavigation(item.path)}
            sx={{
              pl: 2 + level * 2,
              pr: 2,
              py: 1,
              mx: 1,
              borderRadius: 2,
              backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              border: isActive ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : '1px solid transparent',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                borderColor: alpha(theme.palette.primary.main, 0.1),
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                transition: 'color 0.2s ease-in-out',
              }}
            >
              {item.icon}
            </ListItemIcon>
            {(drawerOpen || isMobile) && (
              <>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.875rem',
                    color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                  }}
                />
                {item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.75rem',
                      backgroundColor: theme.palette.error.main,
                      color: 'white',
                      mr: 1,
                    }}
                  />
                )}
                {hasChildren && (
                  isExpanded ? <ExpandLess /> : <ExpandMore />
                )}
              </>
            )}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    )
  }

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Drawer Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerOpen || isMobile ? 'space-between' : 'center',
          minHeight: 64,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        {(drawerOpen || isMobile) && (
          <BrandHeader
            size="sm"
            variant="light"
            clickable
            onLogoClick={() => handleNavigation('/dashboard')}
          />
        )}
        {!isMobile && (
          <IconButton onClick={handleDrawerToggle} size="small">
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List disablePadding>
          {navigationItems.map(item => renderNavigationItem(item))}
        </List>
      </Box>

      {/* User Section */}
      {(drawerOpen || isMobile) && (
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: theme.palette.primary.main,
                }}
              >
                <PersonIcon fontSize="small" />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {user?.name || 'Administrator'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Healthcare Admin
                </Typography>
              </Box>
              <IconButton size="small" onClick={handleUserMenuOpen}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: isMobile ? '100%' : `calc(100% - ${drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED}px)`,
          ml: isMobile ? 0 : `${drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED}px`,
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              {title || 'Healthcare Dashboard'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <ShiftNotifications />
            
            <Chip
              icon={<HealthIcon />}
              label="System Healthy"
              size="small"
              variant="outlined"
              sx={{
                borderColor: alpha(theme.palette.success.main, 0.3),
                color: theme.palette.success.main,
                display: { xs: 'none', md: 'flex' },
              }}
            />

            <IconButton
              onClick={handleUserMenuOpen}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                },
              }}
            >
              <PersonIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? drawerOpen : true}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
            boxSizing: 'border-box',
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            backgroundColor: theme.palette.background.paper,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '64px',
          backgroundColor: theme.palette.background.default,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: 200,
          },
        }}
      >
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, px: 2 }}>
          <LogoutIcon sx={{ mr: 2, fontSize: '1.25rem' }} />
          <Box>
            <Typography variant="body2" fontWeight={600}>
              Sign Out
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Logout from dashboard
            </Typography>
          </Box>
        </MenuItem>
      </Menu>
    </Box>
  )
}

// Export professional layout component
export const HealthcareLayout = ProfessionalLayout