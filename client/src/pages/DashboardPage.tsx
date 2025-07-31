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
  Link
} from '@mui/material'
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon
} from '@mui/icons-material'

import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { DashboardCard } from '../components/dashboard/DashboardCard'
import UsersCard from '../components/dashboard/UsersCard'
import CarePackagesCard from '../components/dashboard/CarePackagesCard'

// Dashboard card configurations
const DASHBOARD_CARDS = [
  {
    id: 'users',
    title: 'Users',
    description: 'Manage admin and carer accounts',
    icon: '👥',
    color: '#1976d2',
  },
  {
    id: 'care-packages',
    title: 'Care Packages',
    description: 'Manage care packages and locations',
    icon: '📦',
    color: '#388e3c',
  },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Manage tasks and completion targets',
    icon: '✅',
    color: '#f57c00',
  },
  {
    id: 'assignments',
    title: 'Assignments',
    description: 'Assign carers and tasks to packages',
    icon: '🔗',
    color: '#7b1fa2',
  },
  {
    id: 'assessments',
    title: 'Assessments',
    description: 'Create and manage competency assessments',
    icon: '📋',
    color: '#c2185b',
  },
  {
    id: 'progress',
    title: 'Progress',
    description: 'Monitor individual carer progress',
    icon: '📊',
    color: '#00796b',
  },
  {
    id: 'shift-sender',
    title: 'Shift Sender',
    description: 'Send shifts to carers',
    icon: '📱',
    color: '#5d4037',
  },
  {
    id: 'rota',
    title: 'Rota',
    description: 'Schedule management calendar',
    icon: '📅',
    color: '#303f9f',
  },
  {
    id: 'recycle-bin',
    title: 'Recycle Bin',
    description: 'Manage deleted items',
    icon: '🗑️',
    color: '#616161',
  },
  {
    id: 'audit-login',
    title: 'Audit Login',
    description: 'Track system activity',
    icon: '🔍',
    color: '#e64a19',
  },
] as const

export function DashboardPage() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  
  const { user, logout } = useAuth()
  const { showSuccess } = useNotification()
  const navigate = useNavigate()

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
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            CareTrack Pro
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton color="inherit">
              <NotificationsIcon sx={{ color: 'text.primary' }} />
            </IconButton>

            <Chip
              label={user?.name || 'Admin'}
              avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><PersonIcon /></Avatar>}
              onClick={handleMenuOpen}
              sx={{ cursor: 'pointer' }}
            />

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
            >
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Dashboard Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {activeCard ? (
          // Active Card View
          <>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToDashboard}
                variant="outlined"
                size="small"
              >
                Back to Dashboard
              </Button>
              
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
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  <HomeIcon fontSize="small" />
                  Dashboard
                </Link>
                <Typography color="text.primary">{getActiveCardTitle()}</Typography>
              </Breadcrumbs>
            </Box>
            
            {renderActiveCard()}
          </>
        ) : (
          // Dashboard Grid View
          <>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" component="h2" gutterBottom>
                Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your care system from the cards below
              </Typography>
            </Box>

            {/* Dashboard Summary - Placeholder for future alerts */}
            <Box sx={{ mb: 4 }}>
              <Chip 
                label="System Status: All services operational" 
                color="success" 
                sx={{ mr: 2 }}
              />
              <Chip 
                label="0 carers need assessment" 
                color="info" 
              />
            </Box>

            {/* Dashboard Cards Grid */}
            <Grid container spacing={3}>
              {DASHBOARD_CARDS.map((card) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={card.id}>
                  <DashboardCard
                    title={card.title}
                    description={card.description}
                    icon={card.icon}
                    color={card.color}
                    onClick={() => handleCardClick(card.id)}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
    </Box>
  )
}