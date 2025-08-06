import React from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress
} from '@mui/material'

interface CarerProgressDetail {
  carer: {
    id: string
    name: string
    email: string
    phone: string
    isActive: boolean
  }
  packages: any[]
  competencyRatings: any[]
}

interface ProgressSummaryCardsProps {
  progressData: CarerProgressDetail
}

const ProgressSummaryCards: React.FC<ProgressSummaryCardsProps> = ({
  progressData
}) => {
  // Calculate summary stats
  const totalPackages = progressData.packages.length
  const totalTasks = progressData.packages.reduce((sum, pkg) => sum + pkg.tasks.length, 0)
  const averageProgress = totalTasks > 0 
    ? progressData.packages.reduce((sum, pkg) => sum + pkg.averageProgress, 0) / totalPackages
    : 0

  const competentRatings = progressData.competencyRatings.filter(
    rating => rating.level === 'COMPETENT' || rating.level === 'PROFICIENT' || rating.level === 'EXPERT'
  ).length

  const totalRatings = progressData.competencyRatings.length
  const competencyPercentage = totalRatings > 0 ? (competentRatings / totalRatings) * 100 : 0

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={4}>
        <Card sx={{ height: 140 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Care Packages
            </Typography>
            <Typography variant="h4" component="div">
              {totalPackages}
            </Typography>
            <Typography variant="body2">
              Active assignments
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <Card sx={{ height: 140 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Overall Progress
            </Typography>
            <Typography variant="h4" component="div">
              {Math.round(averageProgress)}%
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={averageProgress}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Average across all tasks
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <Card sx={{ height: 140 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Competency Rating
            </Typography>
            <Typography variant="h4" component="div">
              {Math.round(competencyPercentage)}%
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={competencyPercentage}
                color={competencyPercentage >= 70 ? 'success' : competencyPercentage >= 50 ? 'warning' : 'error'}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {competentRatings} of {totalRatings} competent+
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ProgressSummaryCards