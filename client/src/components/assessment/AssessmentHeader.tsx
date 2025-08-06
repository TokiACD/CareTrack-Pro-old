import React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Breadcrumbs,
  Link,
  Box
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Quiz as QuizIcon,
  Person as PersonIcon,
  TrendingUp as ProgressIcon
} from '@mui/icons-material'

interface AssessmentHeaderProps {
  assessmentName: string
  carerName: string
  onNavigateBack: () => void
  onNavigateHome: () => void
  onNavigateAssessments: () => void
  userName?: string
  fromProgress?: boolean
  onNavigateProgress?: () => void
  onNavigateCarerDetail?: () => void
}

const AssessmentHeader: React.FC<AssessmentHeaderProps> = ({
  assessmentName,
  carerName,
  onNavigateBack,
  onNavigateHome,
  onNavigateAssessments,
  userName,
  fromProgress = false,
  onNavigateProgress,
  onNavigateCarerDetail
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
            <ArrowBackIcon />
          </IconButton>
          {fromProgress ? <ProgressIcon sx={{ mr: 2 }} /> : <QuizIcon sx={{ mr: 2 }} />}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {fromProgress ? 'Review Assessment' : 'Take Assessment'}
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: 1,
            overflow: 'hidden'
          }}
        >
          <Link
            underline="hover"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content'
            }}
            color="inherit"
            onClick={onNavigateHome}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboard
          </Link>
          
          <Typography variant="body2" color="text.secondary">{'>'}</Typography>
          
          {fromProgress && onNavigateProgress ? (
            <>
              <Link
                underline="hover"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content'
                }}
                color="inherit"
                onClick={onNavigateProgress}
              >
                <ProgressIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Progress
              </Link>
              
              <Typography variant="body2" color="text.secondary">{'>'}</Typography>
              
              {onNavigateCarerDetail && (
                <>
                  <Link
                    underline="hover"
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      minWidth: 'fit-content'
                    }}
                    color="inherit"
                    onClick={onNavigateCarerDetail}
                  >
                    <PersonIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                    {carerName}
                  </Link>
                  
                  <Typography variant="body2" color="text.secondary">{'>'}</Typography>
                </>
              )}
              
              <Typography
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0
                }}
                color="text.primary"
              >
                <QuizIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                {assessmentName}
              </Typography>
            </>
          ) : (
            <>
              <Link
                underline="hover"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content'
                }}
                color="inherit"
                onClick={onNavigateAssessments}
              >
                <QuizIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Assessments
              </Link>
              
              <Typography variant="body2" color="text.secondary">{'>'}</Typography>
              
              <Typography
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0
                }}
                color="text.primary"
              >
                <PersonIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                {carerName} - {assessmentName}
              </Typography>
            </>
          )}
        </Box>
      </Container>
    </>
  )
}

export default AssessmentHeader