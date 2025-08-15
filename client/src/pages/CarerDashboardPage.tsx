import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Notifications as NotificationsIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CarerPageLayout } from '../components/common/CarerPageLayout';
import DashboardCard from '../components/dashboard/DashboardCard';

export const CarerDashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Carer dashboard cards configuration
  const carerCards = [
    {
      id: 'daily-tasks',
      title: 'Today\'s Tasks',
      description: 'Log your daily care activities and track completion',
      icon: '📋',
      color: '#0891b2', // Cyan-600
      onClick: () => navigate('/carer-dashboard/daily-tasks'),
      badge: '3 pending',
    },
    {
      id: 'my-progress',
      title: 'My Progress',
      description: 'View your competency levels and achievements',
      icon: '📈',
      color: '#059669', // Emerald-600
      onClick: () => navigate('/carer-dashboard/progress'),
      badge: '85% complete',
    },
    {
      id: 'available-shifts',
      title: 'Available Shifts',
      description: 'Browse and apply for upcoming care shifts',
      icon: '🕐',
      color: '#7c3aed', // Violet-600
      onClick: () => navigate('/carer-dashboard/shifts'),
      badge: '5 new',
    },
    {
      id: 'my-schedule',
      title: 'My Schedule',
      description: 'View your upcoming shifts and confirmed assignments',
      icon: '📅',
      color: '#dc2626', // Red-600
      onClick: () => navigate('/carer/schedule'),
      badge: 'This week',
    },
    {
      id: 'confirmations',
      title: 'Pending Confirmations',
      description: 'Review and confirm your competency assessments',
      icon: '✅',
      color: '#ea580c', // Orange-600
      onClick: () => navigate('/carer/confirmations'),
      badge: '2 pending',
    },
    {
      id: 'achievements',
      title: 'My Achievements',
      description: 'View your badges, certifications and milestones',
      icon: '🏆',
      color: '#ca8a04', // Yellow-600
      onClick: () => navigate('/carer/achievements'),
      badge: 'New!',
    },
  ];

  return (
    <CarerPageLayout pageTitle="Personal Dashboard">
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0891b2 0%, #059669 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            Welcome back, {user?.name?.split(' ')[0]}!
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Your personal care dashboard - track your progress and manage your care work
          </Typography>

          {/* Quick Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: alpha('#0891b2', 0.05),
                  border: `1px solid ${alpha('#0891b2', 0.1)}`,
                }}
              >
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ color: '#0891b2' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        85%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Overall Progress
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: alpha('#059669', 0.05),
                  border: `1px solid ${alpha('#059669', 0.1)}`,
                }}
              >
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StarIcon sx={{ color: '#059669' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        12
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Competencies
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: alpha('#7c3aed', 0.05),
                  border: `1px solid ${alpha('#7c3aed', 0.1)}`,
                }}
              >
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkIcon sx={{ color: '#7c3aed' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        5
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        This Week's Shifts
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: alpha('#dc2626', 0.05),
                  border: `1px solid ${alpha('#dc2626', 0.1)}`,
                }}
              >
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ color: '#dc2626' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Today
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Next Shift
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Main Dashboard Cards */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: 3,
            color: 'text.primary',
          }}
        >
          Quick Actions
        </Typography>

        <Grid container spacing={3}>
          {carerCards.map((card) => (
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={4} 
              key={card.id}
            >
              <DashboardCard
                title={card.title}
                description={card.description}
                icon={card.icon}
                color={card.color}
                onClick={card.onClick}
                badge={card.badge}
              />
            </Grid>
          ))}
        </Grid>

        {/* Recent Activity Section */}
        <Box sx={{ mt: 6 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: 3,
              color: 'text.primary',
            }}
          >
            Recent Activity
          </Typography>

          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <NotificationsIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: 'text.secondary',
                    mb: 2 
                  }} 
                />
                <Typography variant="h6" color="text.secondary">
                  No recent activity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your recent care activities and updates will appear here
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </CarerPageLayout>
  );
};

export default CarerDashboardPage;