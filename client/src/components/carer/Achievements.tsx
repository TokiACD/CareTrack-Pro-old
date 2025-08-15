import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  WorkspacePremium as BadgeIcon,
  TrendingUp as ProgressIcon,
  Timer as TimeIcon,
  Assignment as TaskIcon,
  School as SkillIcon,
  Psychology as ExpertiseIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { CarerPageLayout } from '../common/CarerPageLayout';
import { apiService } from '../../services/api';

interface Achievement {
  id: string;
  type: 'BADGE' | 'MILESTONE' | 'STREAK' | 'SKILL_MASTERY';
  title: string;
  description: string;
  icon: string;
  earnedAt?: Date;
  progress?: number;
  maxProgress?: number;
  isEarned: boolean;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  points: number;
}

interface AchievementData {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  achievements: Achievement[];
  recentAchievements: Achievement[];
  skillMastery: {
    competent: number;
    proficient: number;
    expert: number;
    total: number;
  };
  streaks: {
    currentLoginStreak: number;
    longestLoginStreak: number;
    currentPracticeStreak: number;
    longestPracticeStreak: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`achievements-tabpanel-${index}`}
      aria-labelledby={`achievements-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const Achievements: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);

  // Fetch achievements data
  const { data: achievementsData, isLoading } = useQuery({
    queryKey: ['carer-progress', 'achievements'],
    queryFn: () => apiService.get<AchievementData>('/api/carer-progress/achievements'),
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return '#9c27b0';
      case 'EPIC': return '#673ab7';
      case 'RARE': return '#3f51b5';
      case 'COMMON': return '#607d8b';
      default: return '#607d8b';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return 'Legendary';
      case 'EPIC': return 'Epic';
      case 'RARE': return 'Rare';
      case 'COMMON': return 'Common';
      default: return rarity;
    }
  };

  const getAchievementIcon = (type: string, iconName?: string) => {
    if (iconName) {
      // Map emoji/icon names to actual icons
      switch (iconName) {
        case '🏆': return <TrophyIcon />;
        case '⭐': return <StarIcon />;
        case '🎯': return <TaskIcon />;
        case '🔥': return <TimeIcon />;
        case '🧠': return <ExpertiseIcon />;
        case '📚': return <SkillIcon />;
        default: return <BadgeIcon />;
      }
    }

    switch (type) {
      case 'BADGE': return <BadgeIcon />;
      case 'MILESTONE': return <TrophyIcon />;
      case 'STREAK': return <TimeIcon />;
      case 'SKILL_MASTERY': return <SkillIcon />;
      default: return <StarIcon />;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getProgressPercentage = () => {
    if (!achievementsData) return 0;
    const currentLevelProgress = achievementsData.totalPoints % 1000; // Assume 1000 points per level
    return (currentLevelProgress / 1000) * 100;
  };

  if (isLoading) {
    return (
      <CarerPageLayout pageTitle="My Achievements">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography>Loading your achievements...</Typography>
        </Container>
      </CarerPageLayout>
    );
  }

  const earnedAchievements = achievementsData?.achievements.filter(a => a.isEarned) || [];
  const availableAchievements = achievementsData?.achievements.filter(a => !a.isEarned) || [];

  return (
    <CarerPageLayout pageTitle="My Achievements">
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            My Achievements
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Track your progress, celebrate milestones, and unlock badges
          </Typography>

          {/* Level & Progress */}
          <Card elevation={2} sx={{ mb: 3, background: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        border: '3px solid rgba(255,255,255,0.3)',
                        mx: 'auto',
                        mb: 1,
                        fontSize: '2rem',
                      }}
                    >
                      {user?.name?.charAt(0) || 'C'}
                    </Avatar>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      Level {achievementsData?.level || 1}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Care Professional
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Progress to Next Level
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getProgressPercentage()}
                      sx={{
                        height: 12,
                        borderRadius: 6,
                        bgcolor: 'rgba(255,255,255,0.3)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'white',
                          borderRadius: 6,
                        },
                      }}
                    />
                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                      {achievementsData?.totalPoints || 0} / {achievementsData?.nextLevelPoints || 1000} XP
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {achievementsData?.totalPoints || 0}
                        </Typography>
                        <Typography variant="caption">Total XP</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {earnedAchievements.length}
                        </Typography>
                        <Typography variant="caption">Badges Earned</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card elevation={1} sx={{ bgcolor: alpha('#4caf50', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <SkillIcon sx={{ color: '#4caf50', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#4caf50' }}>
                    {achievementsData?.skillMastery.competent || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Competent Skills
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card elevation={1} sx={{ bgcolor: alpha('#2196f3', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <ExpertiseIcon sx={{ color: '#2196f3', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2196f3' }}>
                    {achievementsData?.skillMastery.proficient || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Proficient Skills
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card elevation={1} sx={{ bgcolor: alpha('#9c27b0', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <TrophyIcon sx={{ color: '#9c27b0', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                    {achievementsData?.skillMastery.expert || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Expert Skills
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card elevation={1} sx={{ bgcolor: alpha('#ff9800', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <TimeIcon sx={{ color: '#ff9800', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff9800' }}>
                    {achievementsData?.streaks.currentLoginStreak || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Day Streak
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Recent Achievements */}
        {achievementsData?.recentAchievements && achievementsData.recentAchievements.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              🎉 Recently Earned
            </Typography>
            <Grid container spacing={2}>
              {achievementsData.recentAchievements.slice(0, 4).map((achievement) => (
                <Grid item xs={12} sm={6} md={3} key={achievement.id}>
                  <Card
                    elevation={3}
                    sx={{
                      bgcolor: alpha(getRarityColor(achievement.rarity), 0.05),
                      border: `2px solid ${alpha(getRarityColor(achievement.rarity), 0.3)}`,
                      textAlign: 'center',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[8],
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          bgcolor: alpha(getRarityColor(achievement.rarity), 0.2),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                          color: getRarityColor(achievement.rarity),
                        }}
                      >
                        {getAchievementIcon(achievement.type, achievement.icon)}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {achievement.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {achievement.description}
                      </Typography>
                      <Chip
                        label={`+${achievement.points} XP`}
                        size="small"
                        sx={{
                          bgcolor: alpha(getRarityColor(achievement.rarity), 0.1),
                          color: getRarityColor(achievement.rarity),
                          fontWeight: 600,
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Achievement Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label={`Earned (${earnedAchievements.length})`} />
            <Tab label={`Available (${availableAchievements.length})`} />
            <Tab label="Streaks & Stats" />
          </Tabs>
        </Box>

        {/* Earned Achievements Tab */}
        <TabPanel value={currentTab} index={0}>
          {earnedAchievements.length === 0 ? (
            <Alert severity="info">
              You haven't earned any achievements yet. Keep practicing and completing tasks to unlock badges!
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {earnedAchievements.map((achievement) => (
                <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      bgcolor: alpha(getRarityColor(achievement.rarity), 0.05),
                      border: `1px solid ${alpha(getRarityColor(achievement.rarity), 0.2)}`,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            bgcolor: alpha(getRarityColor(achievement.rarity), 0.2),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: getRarityColor(achievement.rarity),
                          }}
                        >
                          {getAchievementIcon(achievement.type, achievement.icon)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {achievement.title}
                          </Typography>
                          <Chip
                            label={getRarityLabel(achievement.rarity)}
                            size="small"
                            sx={{
                              bgcolor: alpha(getRarityColor(achievement.rarity), 0.1),
                              color: getRarityColor(achievement.rarity),
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {achievement.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={`${achievement.points} XP`}
                          size="small"
                          sx={{
                            bgcolor: alpha('#4caf50', 0.1),
                            color: '#4caf50',
                          }}
                        />
                        {achievement.earnedAt && (
                          <Typography variant="caption" color="text.secondary">
                            Earned {formatDate(achievement.earnedAt)}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Available Achievements Tab */}
        <TabPanel value={currentTab} index={1}>
          {availableAchievements.length === 0 ? (
            <Alert severity="success">
              Congratulations! You've earned all available achievements. Check back later for new challenges!
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {availableAchievements.map((achievement) => (
                <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                  <Card
                    elevation={1}
                    sx={{
                      height: '100%',
                      opacity: 0.8,
                      bgcolor: alpha('#9e9e9e', 0.05),
                      border: `1px solid ${alpha('#9e9e9e', 0.2)}`,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            bgcolor: alpha('#9e9e9e', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9e9e9e',
                          }}
                        >
                          {getAchievementIcon(achievement.type, achievement.icon)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            {achievement.title}
                          </Typography>
                          <Chip
                            label={getRarityLabel(achievement.rarity)}
                            size="small"
                            sx={{
                              bgcolor: alpha(getRarityColor(achievement.rarity), 0.1),
                              color: getRarityColor(achievement.rarity),
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {achievement.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={`${achievement.points} XP`}
                          size="small"
                          variant="outlined"
                        />
                        {achievement.progress !== undefined && achievement.maxProgress !== undefined && (
                          <Box sx={{ flex: 1, mx: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(achievement.progress / achievement.maxProgress) * 100}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {achievement.progress} / {achievement.maxProgress}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Streaks & Stats Tab */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                📊 Activity Streaks
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card elevation={1}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Login Streak
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Current daily login streak
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                            {achievementsData?.streaks.currentLoginStreak || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            days
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card elevation={1}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Best Login Streak
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Your longest daily login streak
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                            {achievementsData?.streaks.longestLoginStreak || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            days
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                🎯 Skill Mastery
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card elevation={1}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Competency Distribution
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Expert</Typography>
                          <Typography variant="body2">{achievementsData?.skillMastery.expert || 0}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={achievementsData?.skillMastery.total ? (achievementsData.skillMastery.expert / achievementsData.skillMastery.total) * 100 : 0}
                          sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#9c27b0', 0.1), '& .MuiLinearProgress-bar': { bgcolor: '#9c27b0' } }}
                        />
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Proficient</Typography>
                          <Typography variant="body2">{achievementsData?.skillMastery.proficient || 0}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={achievementsData?.skillMastery.total ? (achievementsData.skillMastery.proficient / achievementsData.skillMastery.total) * 100 : 0}
                          sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#2196f3', 0.1), '& .MuiLinearProgress-bar': { bgcolor: '#2196f3' } }}
                        />
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Competent</Typography>
                          <Typography variant="body2">{achievementsData?.skillMastery.competent || 0}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={achievementsData?.skillMastery.total ? (achievementsData.skillMastery.competent / achievementsData.skillMastery.total) * 100 : 0}
                          sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#4caf50', 0.1), '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' } }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>
      </Container>
    </CarerPageLayout>
  );
};

export default Achievements;