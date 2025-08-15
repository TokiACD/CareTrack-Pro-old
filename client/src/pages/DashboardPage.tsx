import React, { useState, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Grid,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  Paper,
  Stack,
  Divider,
  Card,
  CardContent,
  alpha,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material'
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  NotificationsActive as NotificationIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'

import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '../services/api'
import { BrandHeader } from '../components/common'
import DashboardCard from '../components/dashboard/DashboardCard'
import UsersCard from '../components/dashboard/UsersCard'
import CarePackagesCard from '../components/dashboard/CarePackagesCard'
import RecycleBinCard from '../components/dashboard/RecycleBinCard'
import ProgressCard from '../components/dashboard/ProgressCard'
import PDFReportsCard from '../components/dashboard/PDFReportsCard'
import ShiftSenderCard from '../components/dashboard/ShiftSenderCard'
import ShiftNotifications from '../components/dashboard/ShiftNotifications'

// Essential Dashboard Cards - Simplified Configuration
const DASHBOARD_CARDS = [
  {
    id: 'users',
    title: 'User Management',
    description: 'Manage admin and carer accounts with role-based access',
    icon: '👥',
    color: '#0288d1',
  },
  {
    id: 'care-packages',
    title: 'Care Packages',
    description: 'Configure care packages and service locations',
    icon: '📦',
    color: '#2e7d32',
  },
  {
    id: 'tasks',
    title: 'Task Management',
    description: 'Define and monitor care tasks and completion targets',
    icon: '✅',
    color: '#ed6c02',
  },
  {
    id: 'assignments',
    title: 'Staff Assignments',
    description: 'Assign carers to packages and manage workloads',
    icon: '🔗',
    color: '#7b1fa2',
  },
  {
    id: 'assessments',
    title: 'Competency Assessments',
    description: 'Create and manage professional competency evaluations',
    icon: '📋',
    color: '#c2185b',
  },
  {
    id: 'progress',
    title: 'Progress Tracking',
    description: 'Monitor individual carer development and performance',
    icon: '📊',
    color: '#00796b',
  },
  {
    id: 'pdf-reports',
    title: 'Care Records',
    description: 'Generate comprehensive care documentation PDFs',
    icon: '📄',
    color: '#d32f2f',
  },
  {
    id: 'shift-sender',
    title: 'Shift Distribution',
    description: 'Send shift schedules and updates to care staff',
    icon: '📱',
    color: '#5d4037',
  },
  {
    id: 'rota',
    title: 'Schedule Management',
    description: 'Advanced calendar and scheduling system',
    icon: '📅',
    color: '#303f9f',
  },
  {
    id: 'recycle-bin',
    title: 'Archive Management',
    description: 'Restore or permanently remove archived items',
    icon: '🗑️',
    color: '#616161',
  },
  {
    id: 'audit-login',
    title: 'System Audit',
    description: 'Comprehensive system activity and security logs',
    icon: '🔍',
    color: '#e64a19',
  },
] as const

export const DashboardPage = memo(() => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const { user, logout } = useAuth()
  const { showSuccess } = useNotification()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Fetch carers ready for assessment
  const { data: carersReadyData, isLoading: carersReadyLoading } = useQuery({
    queryKey: ['carers-ready-for-assessment'],
    queryFn: async () => {
      const response = await apiService.get('/api/progress/ready-for-assessment')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Fetch confirmed shifts count
  const { data: confirmedShiftsData, isLoading: confirmedShiftsLoading } = useQuery({
    queryKey: ['confirmed-shifts-count'],
    queryFn: async () => {
      const response = await apiService.get('/api/shift-sender/shifts?status=CONFIRMED')
      return { count: response?.data?.length || 0 }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // All cards are displayed - no filtering needed
  const allCards = useMemo(() => DASHBOARD_CARDS, [])

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }, [])

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    showSuccess('Successfully logged out')
    handleMenuClose()
  }, [logout, showSuccess, handleMenuClose])

  const handleCardClick = useCallback((cardId: string) => {
    // Navigate to dedicated pages for certain cards
    const navigationMap: Record<string, string> = {
      'users': '/users',
      'care-packages': '/care-packages',
      'tasks': '/tasks',
      'assignments': '/assignments',
      'assessments': '/assessments',
      'progress': '/progress',
      'pdf-reports': '/pdf-reports',
      'shift-sender': '/shift-sender',
      'rota': '/rota',
      'recycle-bin': '/recycle-bin',
      'audit-login': '/audit-logs'
    }
    
    const route = navigationMap[cardId]
    if (route) {
      navigate(route)
    } else {
      // For other cards, use the existing internal navigation
      setActiveCard(cardId)
    }
  }, [navigate])

  const handleBackToDashboard = useCallback(() => {
    setActiveCard(null)
  }, [])

  const getActiveCardTitle = useCallback(() => {
    const card = DASHBOARD_CARDS.find(c => c.id === activeCard)
    return card?.title || 'Dashboard'
  }, [activeCard])

  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen(prev => !prev)
  }, [])

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const handleAssessmentCardClick = useCallback(() => {
    navigate('/progress', { state: { filterReadyForAssessment: true } })
  }, [navigate])

  // Navigation handlers for main status cards
  const handleConfirmedShiftsClick = useCallback(() => {
    navigate('/shift-sender/management', { state: { filterStatus: 'CONFIRMED' } })
  }, [navigate])

  const renderActiveCard = useMemo(() => {
    switch (activeCard) {
      case 'users':
        return <UsersCard />
      case 'care-packages':
        return <CarePackagesCard />
      case 'recycle-bin':
        return <RecycleBinCard />
      case 'progress':
        return <ProgressCard />
      case 'pdf-reports':
        return <PDFReportsCard />
      case 'shift-sender':
        return <ShiftSenderCard />
      default:
        return (
          <Box textAlign="center" py={8}>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              {getActiveCardTitle()}
            </Typography>
            <Typography color="text.secondary">
              This feature is coming soon!
            </Typography>
          </Box>
        )
    }
  }, [activeCard, getActiveCardTitle])

  return (
    <Box sx={{ 
      // Let content flow naturally - no height restrictions
      padding: 0,
      bgcolor: theme.palette.background.default, 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    }}>
      {/* Professional Header */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: theme.palette.primary.main,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
        }}
      >
        <Toolbar sx={{ py: isMobile ? 0.5 : 1, px: isMobile ? 1 : 3 }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenuToggle}
              sx={{ mr: 2, color: 'white' }}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          )}

          <Box sx={{ flexGrow: 1 }}>
            <BrandHeader 
              size={isMobile ? "sm" : "md"} 
              onClick={() => handleBackToDashboard()}
              showText={!isSmallMobile} // Hide text on very small screens
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 3 }}>
            {!isMobile && <ShiftNotifications />}

            {/* Professional User Menu */}
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                },
              }}
              onClick={handleMenuOpen}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                <PersonIcon fontSize="small" />
              </Avatar>
              {!isSmallMobile && (
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'white', 
                      fontWeight: 600,
                      fontSize: isMobile ? '0.8125rem' : '0.875rem'
                    }}
                  >
                    {user?.name || 'Admin'}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: isMobile ? '0.6875rem' : '0.75rem'
                    }}
                  >
                    Healthcare Admin
                  </Typography>
                </Box>
              )}
            </Paper>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
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
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        ModalProps={{
          keepMounted: true, // Better performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            backgroundColor: theme.palette.background.paper,
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <BrandHeader size="md" onClick={handleMobileMenuClose} />
        </Box>
        <Divider />
        <List sx={{ px: 2 }}>
          <ListItemButton onClick={() => handleMobileMenuClose()}>
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Dashboard Overview" />
          </ListItemButton>
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <ShiftNotifications />
        </Box>
      </Drawer>

      {/* Professional Dashboard Content */}
      <Container 
        maxWidth="xl" 
        sx={{ 
          py: isMobile ? 2 : 4,
          px: isMobile ? 1 : 3, // Reduced padding on mobile
        }}
      >
        {activeCard ? (
          // Active Card View with Enhanced Navigation
          <>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                mb: 4, 
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 3,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBackToDashboard}
                  variant="contained"
                  size="small"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Back to Dashboard
                </Button>
                
                <Divider orientation="vertical" flexItem />
                
                <Breadcrumbs>
                  <Link
                    component="button"
                    variant="body1"
                    onClick={handleBackToDashboard}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.5,
                      textDecoration: 'none',
                      color: 'text.secondary',
                      fontWeight: 500,
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <DashboardIcon fontSize="small" />
                    Healthcare Dashboard
                  </Link>
                  <Typography color="primary.main" fontWeight={600}>
                    {getActiveCardTitle()}
                  </Typography>
                </Breadcrumbs>
              </Stack>
            </Paper>
            
            {renderActiveCard}
          </>
        ) : (
          // Enhanced Dashboard Grid View
          <>
            {/* Professional Header Section */}
            <Box sx={{ mb: 6 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <DashboardIcon 
                    sx={{ 
                      fontSize: '2rem', 
                      color: theme.palette.primary.main 
                    }} 
                  />
                </Box>
                <Box>
                  <Typography 
                    variant="h3" 
                    component="h1" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.text.primary,
                      lineHeight: 1.2,
                    }}
                  >
                    Healthcare Management Dashboard
                  </Typography>
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    sx={{ 
                      fontWeight: 400,
                      mt: 0.5,
                    }}
                  >
                    Comprehensive care system administration and monitoring
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Main Status Cards */}
            <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: isMobile ? 4 : 6 }}>
              {/* Ready for Assessment Card */}
              <Grid item xs={12} sm={6} md={6}>
                <Card
                  elevation={0}
                  sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    height: '100%',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    }
                  }}
                  onClick={handleAssessmentCardClick}
                >
                  <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: isMobile ? 48 : 56,
                          height: isMobile ? 48 : 56,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PersonIcon sx={{ color: theme.palette.warning.main, fontSize: isMobile ? '1.5rem' : '1.75rem' }} />
                      </Box>
                      <Box>
                        <Typography 
                          variant={isMobile ? "h6" : "h5"} 
                          fontWeight={700} 
                          color="warning.main"
                          sx={{ mb: 0.5 }}
                        >
                          {carersReadyLoading ? 'Loading...' : `${carersReadyData?.count || 0}`}
                        </Typography>
                        <Typography 
                          variant="body1" 
                          fontWeight={600}
                          color="text.primary"
                          sx={{ mb: 0.5 }}
                        >
                          Ready for Assessment
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                        >
                          {carersReadyLoading ? 'Fetching data...' : carersReadyData?.count > 0 ? 'Click to view details' : 'All carers assessed'}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Confirmed Shifts Card */}
              <Grid item xs={12} sm={6} md={6}>
                <Card
                  elevation={0}
                  sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    height: '100%',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    }
                  }}
                  onClick={handleConfirmedShiftsClick}
                >
                  <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: isMobile ? 48 : 56,
                          height: isMobile ? 48 : 56,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: isMobile ? '1.5rem' : '1.75rem' }} />
                      </Box>
                      <Box>
                        <Typography 
                          variant={isMobile ? "h6" : "h5"} 
                          fontWeight={700} 
                          color="success.main"
                          sx={{ mb: 0.5 }}
                        >
                          {confirmedShiftsLoading ? 'Loading...' : `${confirmedShiftsData?.count || 0}`}
                        </Typography>
                        <Typography 
                          variant="body1" 
                          fontWeight={600}
                          color="text.primary"
                          sx={{ mb: 0.5 }}
                        >
                          Confirmed Shifts
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                        >
                          {confirmedShiftsLoading ? 'Fetching data...' : 'Click to manage shifts'}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>


            {/* Essential Dashboard Cards Grid */}
            <Grid container spacing={isMobile ? 2 : 3}>
              {allCards.map((card) => (
                <Grid 
                  item 
                  xs={12} 
                  sm={6} 
                  md={4} 
                  lg={3} 
                  key={card.id}
                >
                  <OptimizedDashboardCard
                    key={card.id}
                    card={card}
                    onClick={handleCardClick}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
    </Box>
  )
})

DashboardPage.displayName = 'DashboardPage'

// Optimized sub-components

const OptimizedDashboardCard = memo<{
  card: typeof DASHBOARD_CARDS[number]
  onClick: (cardId: string) => void
}>(({ card, onClick }) => {
  const handleClick = useCallback(() => onClick(card.id), [onClick, card.id])
  
  return (
    <DashboardCard
      title={card.title}
      description={card.description}
      icon={card.icon}
      color={card.color}
      onClick={handleClick}
      badge={undefined}
      isActive={false}
    />
  )
})

OptimizedDashboardCard.displayName = 'OptimizedDashboardCard'


// Enhanced Dashboard Component
export const HealthcareDashboard = DashboardPage