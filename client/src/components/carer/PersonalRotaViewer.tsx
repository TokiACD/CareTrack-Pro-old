import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Alert,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { CarerPageLayout } from '../common/CarerPageLayout';
import { apiService } from '../../services/api';

interface RotaEntry {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  shiftType: 'DAY' | 'NIGHT';
  isConfirmed: boolean;
  notes?: string;
  package: {
    id: string;
    name: string;
    location?: string;
  };
  confirmedAt?: Date;
  confirmedBy?: string;
}

export const PersonalRotaViewer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { showInfo } = useNotification();

  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeek);
      date.setDate(currentWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeek]);

  const startDate = weekDates[0].toISOString().split('T')[0];
  const endDate = weekDates[6].toISOString().split('T')[0];

  // Fetch personal rota data
  const { data: rotaEntries, isLoading, refetch } = useQuery({
    queryKey: ['personal-rota', user?.id, startDate, endDate],
    queryFn: () => apiService.get<RotaEntry[]>(`/api/rota?carerId=${user?.id}&startDate=${startDate}&endDate=${endDate}`),
    enabled: !!user?.id,
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date, format: 'short' | 'long' = 'short') => {
    if (format === 'long') {
      return date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getShiftsForDate = (date: Date) => {
    if (!rotaEntries) return [];
    return rotaEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.toDateString() === date.toDateString();
    });
  };

  const getTotalHoursForWeek = () => {
    if (!rotaEntries) return 0;
    return rotaEntries.reduce((total, entry) => {
      const start = new Date(`2000-01-01T${entry.startTime}`);
      const end = new Date(`2000-01-01T${entry.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };

  const getShiftTypeColor = (shiftType: string, isConfirmed: boolean) => {
    const baseColor = shiftType === 'DAY' ? '#0891b2' : '#7c3aed';
    return isConfirmed ? baseColor : alpha(baseColor, 0.6);
  };

  const handleExportSchedule = () => {
    showInfo('Export functionality will be implemented soon');
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (isLoading) {
    return (
      <CarerPageLayout pageTitle="My Schedule">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography>Loading your schedule...</Typography>
        </Container>
      </CarerPageLayout>
    );
  }

  return (
    <CarerPageLayout pageTitle="My Schedule">
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0891b2 0%, #7c3aed 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            My Schedule
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            View your assigned shifts and upcoming work schedule
          </Typography>

          {/* Week Navigation & Stats */}
          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={() => navigateWeek('prev')} size="small">
                  <PrevIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 600, mx: 2 }}>
                  {formatDate(weekDates[0], 'long')} - {formatDate(weekDates[6], 'long')}
                </Typography>
                <IconButton onClick={() => navigateWeek('next')} size="small">
                  <NextIcon />
                </IconButton>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => refetch()}
                  size="small"
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={handleExportSchedule}
                  size="small"
                >
                  Export
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Week Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card elevation={1} sx={{ bgcolor: alpha('#0891b2', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <WorkIcon sx={{ color: '#0891b2', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#0891b2' }}>
                    {rotaEntries?.length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Shifts This Week
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={1} sx={{ bgcolor: alpha('#059669', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <TimeIcon sx={{ color: '#059669', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#059669' }}>
                    {getTotalHoursForWeek()}h
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Hours
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={1} sx={{ bgcolor: alpha('#7c3aed', 0.05) }}>
                <CardContent sx={{ py: 2, textAlign: 'center' }}>
                  <CalendarIcon sx={{ color: '#7c3aed', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                    {rotaEntries?.filter(entry => entry.isConfirmed).length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Confirmed Shifts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Weekly Calendar View */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          📅 Weekly Schedule
        </Typography>

        {!rotaEntries || rotaEntries.length === 0 ? (
          <Alert severity="info" sx={{ mb: 4 }}>
            No shifts scheduled for this week. Check back later or contact your supervisor if you expected to see shifts here.
          </Alert>
        ) : (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {weekDates.map((date) => {
              const dayShifts = getShiftsForDate(date);
              return (
                <Grid item xs={12} md={6} lg={4} xl={3} key={date.toISOString()}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      minHeight: 200,
                      border: isToday(date) ? '2px solid #0891b2' : 'none',
                      bgcolor: isToday(date) ? alpha('#0891b2', 0.02) : 'background.paper',
                    }}
                  >
                    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Date Header */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: isToday(date) ? '#0891b2' : 'text.primary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {isToday(date) && <CalendarIcon sx={{ fontSize: 20 }} />}
                          {formatDate(date)}
                        </Typography>
                        {isToday(date) && (
                          <Chip
                            label="Today"
                            size="small"
                            sx={{
                              bgcolor: alpha('#0891b2', 0.1),
                              color: '#0891b2',
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </Box>

                      {/* Shifts for this day */}
                      <Box sx={{ flexGrow: 1 }}>
                        {dayShifts.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No shifts scheduled
                          </Typography>
                        ) : (
                          dayShifts.map((shift) => (
                            <Card
                              key={shift.id}
                              elevation={1}
                              sx={{
                                mb: 1,
                                bgcolor: alpha(getShiftTypeColor(shift.shiftType, shift.isConfirmed), 0.05),
                                border: `1px solid ${alpha(getShiftTypeColor(shift.shiftType, shift.isConfirmed), 0.2)}`,
                              }}
                            >
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {shift.package.name}
                                  </Typography>
                                  <Chip
                                    label={shift.shiftType}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha(getShiftTypeColor(shift.shiftType, shift.isConfirmed), 0.1),
                                      color: getShiftTypeColor(shift.shiftType, shift.isConfirmed),
                                      fontSize: '0.7rem',
                                    }}
                                  />
                                </Box>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="body2">
                                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                  </Typography>
                                </Box>

                                {shift.package.location && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                    <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                    <Typography variant="caption" color="text.secondary">
                                      {shift.package.location}
                                    </Typography>
                                  </Box>
                                )}

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Chip
                                    label={shift.isConfirmed ? 'Confirmed' : 'Pending'}
                                    size="small"
                                    sx={{
                                      bgcolor: shift.isConfirmed ? alpha('#059669', 0.1) : alpha('#ff9800', 0.1),
                                      color: shift.isConfirmed ? '#059669' : '#ff9800',
                                      fontSize: '0.65rem',
                                    }}
                                  />
                                </Box>

                                {shift.notes && (
                                  <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                                    "{shift.notes}"
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Quick Info Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            📋 Schedule Information
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your schedule shows all assigned shifts for the selected week. Confirmed shifts are shown in full color, while pending shifts appear lighter. Contact your supervisor if you have questions about your schedule.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Shift Legend:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label="Day Shift"
                  size="small"
                  sx={{
                    bgcolor: alpha('#0891b2', 0.1),
                    color: '#0891b2',
                  }}
                />
                <Chip
                  label="Night Shift"
                  size="small"
                  sx={{
                    bgcolor: alpha('#7c3aed', 0.1),
                    color: '#7c3aed',
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Status Legend:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label="Confirmed"
                  size="small"
                  sx={{
                    bgcolor: alpha('#059669', 0.1),
                    color: '#059669',
                  }}
                />
                <Chip
                  label="Pending"
                  size="small"
                  sx={{
                    bgcolor: alpha('#ff9800', 0.1),
                    color: '#ff9800',
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </CarerPageLayout>
  );
};

export default PersonalRotaViewer;