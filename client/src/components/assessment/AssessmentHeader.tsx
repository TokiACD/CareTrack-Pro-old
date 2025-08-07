import React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Box
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Quiz as QuizIcon,
  TrendingUp as ProgressIcon
} from '@mui/icons-material'
import { BreadcrumbNavigation, useBreadcrumbItems } from '../common/BreadcrumbNavigation'

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
  const breadcrumbItems = useBreadcrumbItems()
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

      {/* Breadcrumb Navigation */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <BreadcrumbNavigation 
          items={fromProgress && onNavigateProgress ? [
            breadcrumbItems.progress(),
            onNavigateCarerDetail ? breadcrumbItems.carerProgress(carerName) : { label: carerName },
            breadcrumbItems.takeAssessment(assessmentName)
          ] : [
            breadcrumbItems.assessments(),
            breadcrumbItems.takeAssessment(`${carerName} - ${assessmentName}`)
          ]}
          maxItems={4}
        />
      </Container>
    </>
  )
}

export default AssessmentHeader