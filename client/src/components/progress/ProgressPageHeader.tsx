import React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Breadcrumbs,
  Link
} from '@mui/material'
import {
  ArrowBack,
  Home as HomeIcon,
  TrendingUp as ProgressIcon,
  Person as PersonIcon
} from '@mui/icons-material'

interface ProgressPageHeaderProps {
  carerName: string
  onNavigateBack: () => void
  onNavigateHome: () => void
  onNavigateDashboard: () => void
  userName?: string
}

const ProgressPageHeader: React.FC<ProgressPageHeaderProps> = ({
  carerName,
  onNavigateBack,
  onNavigateHome,
  onNavigateDashboard,
  userName
}) => {
  return (
    <>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onNavigateBack}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <ProgressIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Carer Progress Detail
          </Typography>
          {userName && (
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Welcome, {userName}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      {/* Breadcrumbs */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={onNavigateHome}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboard
          </Link>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={onNavigateDashboard}
          >
            <ProgressIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Progress
          </Link>
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            <PersonIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            {carerName}
          </Typography>
        </Breadcrumbs>
      </Container>
    </>
  )
}

export default ProgressPageHeader