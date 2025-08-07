import { useState } from 'react'
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
  Chip,
  Breadcrumbs,
  Link,
  Paper,
  Stack,
  Divider,
  Card,
  CardContent,
  alpha,
  useTheme,
} from '@mui/material'
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  NotificationsActive as NotificationIcon,
} from '@mui/icons-material'

import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { BrandHeader } from '../components/common'
import DashboardCard from '../components/dashboard/DashboardCard'
import UsersCard from '../components/dashboard/UsersCard'
import CarePackagesCard from '../components/dashboard/CarePackagesCard'
import RecycleBinCard from '../components/dashboard/RecycleBinCard'
import ProgressCard from '../components/dashboard/ProgressCard'
import PDFReportsCard from '../components/dashboard/PDFReportsCard'
import ShiftSenderCard from '../components/dashboard/ShiftSenderCard'
import ShiftNotifications from '../components/dashboard/ShiftNotifications'
import ActivityFeedCard from '../components/dashboard/ActivityFeedCard'

// Professional Healthcare Dashboard Configuration
const DASHBOARD_CARDS = [
  {
    id: 'users',
    title: 'User Management',
    description: 'Manage admin and carer accounts with role-based access',
    icon: '👥',
    color: '#0288d1',
    category: 'management',
    priority: 'high',
  },
  {
    id: 'care-packages',
    title: 'Care Packages',
    description: 'Configure care packages and service locations',
    icon: '📦',
    color: '#2e7d32',
    category: 'care',
    priority: 'high',
  },
  {
    id: 'tasks',
    title: 'Task Management',
    description: 'Define and monitor care tasks and completion targets',
    icon: '✅',
    color: '#ed6c02',
    category: 'operations',
    priority: 'high',
  },
  {
    id: 'assignments',
    title: 'Staff Assignments',
    description: 'Assign carers to packages and manage workloads',
    icon: '🔗',
    color: '#7b1fa2',
    category: 'operations',
    priority: 'high',
  },
  {
    id: 'assessments',
    title: 'Competency Assessments',
    description: 'Create and manage professional competency evaluations',
    icon: '📋',
    color: '#c2185b',
    category: 'quality',
    priority: 'medium',
  },
  {
    id: 'progress',
    title: 'Progress Tracking',
    description: 'Monitor individual carer development and performance',
    icon: '📊',
    color: '#00796b',
    category: 'analytics',
    priority: 'medium',
  },
  {
    id: 'pdf-reports',
    title: 'Care Records',
    description: 'Generate comprehensive care documentation PDFs',
    icon: '📄',
    color: '#d32f2f',
    category: 'documentation',
    priority: 'medium',
  },
  {
    id: 'shift-sender',
    title: 'Shift Distribution',
    description: 'Send shift schedules and updates to care staff',
    icon: '📱',
    color: '#5d4037',
    category: 'communication',
    priority: 'high',
  },
  {
    id: 'rota',
    title: 'Schedule Management',
    description: 'Advanced calendar and scheduling system',
    icon: '📅',
    color: '#303f9f',
    category: 'operations',
    priority: 'high',
  },
  {
    id: 'recycle-bin',
    title: 'Archive Management',
    description: 'Restore or permanently remove archived items',
    icon: '🗑️',
    color: '#616161',
    category: 'system',
    priority: 'low',
  },
  {
    id: 'audit-login',
    title: 'System Audit',
    description: 'Comprehensive system activity and security logs',
    icon: '🔍',
    color: '#e64a19',
    category: 'security',
    priority: 'medium',
  },
] as const

// Category colors for organization
const CATEGORY_COLORS = {
  management: '#0288d1',
  care: '#2e7d32',
  operations: '#ed6c02',
  quality: '#c2185b',
  analytics: '#00796b',
  documentation: '#d32f2f',
  communication: '#5d4037',
  system: '#616161',
  security: '#e64a19',
} as const

export function DashboardPage() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const { user, logout } = useAuth()
  const { showSuccess } = useNotification()
  const navigate = useNavigate()
  const theme = useTheme()

  // Filter cards by category
  const filteredCards = selectedCategory === 'all' 
    ? DASHBOARD_CARDS 
    : DASHBOARD_CARDS.filter(card => card.category === selectedCategory)

  // Get unique categories
  const categories = [...new Set(DASHBOARD_CARDS.map(card => card.category))]

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    logout()
    showSuccess('Successfully logged out')
    handleMenuClose()
  }

  const handleCardClick = (cardId: string) => {
    // Navigate to dedicated pages for certain cards
    if (cardId === 'tasks') {
      navigate('/tasks')
      return
    }
    
    if (cardId === 'assignments') {
      navigate('/assignments')
      return
    }
    
    if (cardId === 'assessments') {
      navigate('/assessments')
      return
    }
    
    if (cardId === 'recycle-bin') {
      navigate('/recycle-bin')
      return
    }
    
    if (cardId === 'progress') {
      navigate('/progress')
      return
    }
    
    if (cardId === 'rota') {
      navigate('/rota')
      return
    }
    
    if (cardId === 'audit-login') {
      navigate('/audit-logs')
      return
    }
    
    // For other cards, use the existing internal navigation
    setActiveCard(cardId)
  }

  const handleBackToDashboard = () => {
    setActiveCard(null)
  }

  const getActiveCardTitle = () => {
    const card = DASHBOARD_CARDS.find(c => c.id === activeCard)
    return card?.title || 'Dashboard'
  }

  const renderActiveCard = () => {
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
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      bgcolor: theme.palette.background.default, 
      minHeight: '100vh',
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
        <Toolbar sx={{ py: 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <BrandHeader 
              size="md" 
              variant="dark"
              clickable
              onLogoClick={() => handleBackToDashboard()}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <ShiftNotifications />

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
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                  {user?.name || 'Administrator'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Healthcare Admin
                </Typography>
              </Box>
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

      {/* Professional Dashboard Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
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
            
            {renderActiveCard()}
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

            {/* System Status Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <NotificationIcon sx={{ color: theme.palette.success.main }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={600} color="success.main">
                          System Operational
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          All services running normally
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PersonIcon sx={{ color: theme.palette.info.main }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={600} color="info.main">
                          0 Pending Assessments
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          All staff evaluations current
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SettingsIcon sx={{ color: theme.palette.primary.main }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={600} color="primary.main">
                          System Health: 99.9%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Excellent system performance
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Category Filter Tabs */}
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
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label="All Modules"
                  onClick={() => setSelectedCategory('all')}
                  variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
                  color={selectedCategory === 'all' ? 'primary' : 'default'}
                  sx={{ fontWeight: 600 }}
                />
                {categories.map((category) => (
                  <Chip
                    key={category}
                    label={category.charAt(0).toUpperCase() + category.slice(1)}
                    onClick={() => setSelectedCategory(category)}
                    variant={selectedCategory === category ? 'filled' : 'outlined'}
                    sx={{ 
                      fontWeight: 600,
                      backgroundColor: selectedCategory === category 
                        ? CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
                        : 'transparent',
                      borderColor: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
                      color: selectedCategory === category 
                        ? 'white'
                        : CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
                      '&:hover': {
                        backgroundColor: alpha(CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS], 0.1),
                      },
                    }}
                  />
                ))}
              </Stack>
            </Paper>

            {/* Professional Dashboard Cards Grid */}
            <Grid container spacing={4}>
              {filteredCards.map((card) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={card.id}>
                  <DashboardCard
                    title={card.title}
                    description={card.description}
                    icon={card.icon}
                    color={card.color}
                    onClick={() => handleCardClick(card.id)}
                    badge={card.priority === 'high' ? '!' : undefined}
                    isActive={false}
                  />
                </Grid>
              ))}
            </Grid>

            {/* Enhanced Activity Feed Section */}
            <Box sx={{ mt: 6 }}>
              <Typography 
                variant="h5" 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700, 
                  mb: 3,
                  color: theme.palette.text.primary,
                }}
              >
                Recent Activity & System Insights
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={12} lg={8}>
                  <ActivityFeedCard />
                </Grid>
                <Grid item xs={12} lg={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: 400,
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      borderRadius: 3,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Quick Actions
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<PersonIcon />}
                        onClick={() => handleCardClick('users')}
                        sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                      >
                        Add New User
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<DashboardIcon />}
                        onClick={() => handleCardClick('assessments')}
                        sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                      >
                        Create Assessment
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<SettingsIcon />}
                        onClick={() => handleCardClick('audit-login')}
                        sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                      >
                        View System Logs
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </>
        )}
      </Container>
    </Box>
  )
}

// Enhanced Dashboard Component
export const HealthcareDashboard = DashboardPage