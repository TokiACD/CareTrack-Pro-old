import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  InputAdornment,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as ConfirmIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  Email as EmailIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSmartMutation } from '../hooks/useSmartMutation';
import { AdminPageLayout } from '../components/common/AdminPageLayout';

// Confirmation Management - Page 4 of 4 specialized pages  
const ConfirmationManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConfirmation, setSelectedConfirmation] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch pending confirmations
  const { data: confirmationsData, isLoading: confirmationsLoading, refetch: refetchConfirmations } = useQuery({
    queryKey: ['progress', 'pending-confirmations'],
    queryFn: async () => {
      const response = await apiService.get('/api/progress/confirmations');
      return response?.data || [];
    }
  });

  // Process confirmation mutation (for admin override if needed)
  const processConfirmationMutation = useSmartMutation<any, Error, any>(
    async (data) => {
      return await apiService.put(`/api/progress/confirmations/${data.confirmationId}`, {
        confirmed: data.confirmed
      });
    },
    {
      mutationType: 'progress.update',
      onSuccess: (data: any) => {
        refetchConfirmations();
        setNotification({
          open: true,
          message: data.message || 'Confirmation processed successfully',
          severity: 'success'
        });
      },
      onError: (error: any) => {
        setNotification({
          open: true,
          message: error.message || 'Failed to process confirmation',
          severity: 'error'
        });
      }
    }
  );

  // Filter confirmations based on search
  const filteredConfirmations = useMemo(() => {
    if (!confirmationsData) return [];
    return confirmationsData.filter((confirmation: any) =>
      confirmation.carer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      confirmation.carer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      confirmation.task.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [confirmationsData, searchTerm]);

  // Group confirmations by status
  const confirmationStats = useMemo(() => {
    if (!confirmationsData) return { pending: 0, expiringSoon: 0, overdue: 0 };
    
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    return confirmationsData.reduce((stats: any, confirmation: any) => {
      const expiresAt = new Date(confirmation.expiresAt);
      
      if (expiresAt < now) {
        stats.overdue++;
      } else if (expiresAt < twoDaysFromNow) {
        stats.expiringSoon++;
      } else {
        stats.pending++;
      }
      
      return stats;
    }, { pending: 0, expiringSoon: 0, overdue: 0 });
  }, [confirmationsData]);

  const handleViewDetails = (confirmation: any) => {
    setSelectedConfirmation(confirmation);
    setDetailsDialogOpen(true);
  };

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, color: 'error' };
    } else if (diffDays === 0) {
      return { text: 'Expires today', color: 'warning' };
    } else if (diffDays === 1) {
      return { text: 'Expires tomorrow', color: 'warning' };
    } else if (diffDays <= 2) {
      return { text: `Expires in ${diffDays} days`, color: 'warning' };
    } else {
      return { text: `Expires in ${diffDays} days`, color: 'default' };
    }
  };

  const formatCompetencyLevel = (level: string) => {
    return level.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <AdminPageLayout 
      pageTitle="Confirmation Management"
      backPath="/progress"
      backText="Back to Progress"
      additionalBreadcrumbs={[
        {
          label: 'Progress Management',
          onClick: () => navigate('/progress')
        }
      ]}
    >
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Grid container spacing={3}>
          
          {/* Page Header */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <ConfirmIcon color="primary" />
                    <Typography variant="h5" component="div">
                      Page 4: Confirmation Management
                    </Typography>
                  </Box>
                }
                subheader="Track competency changes awaiting carer acknowledgment"
              />
              
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Alert severity="info" icon={<PersonIcon />}>
                      <Typography variant="body2" fontWeight={500}>
                        Legal Requirement
                      </Typography>
                      <Typography variant="caption">
                        New ratings don't take effect until carer confirms
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Alert severity="warning" icon={<ScheduleIcon />}>
                      <Typography variant="body2" fontWeight={500}>
                        48-Hour Reminders
                      </Typography>
                      <Typography variant="caption">
                        Automated reminders sent after 48 hours
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Alert severity="success" icon={<NotificationIcon />}>
                      <Typography variant="body2" fontWeight={500}>
                        Pre-confirmed
                      </Typography>
                      <Typography variant="caption">
                        Existing ratings auto-apply at new locations
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Alert severity="error" icon={<TimeIcon />}>
                      <Typography variant="body2" fontWeight={500}>
                        Confirmation Tracking
                      </Typography>
                      <Typography variant="caption">
                        Monitor which carers need to confirm changes
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Confirmation Statistics */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <NotificationIcon color="primary" />
                    <Typography variant="h6">
                      Confirmation Status Overview
                    </Typography>
                  </Box>
                }
              />
              
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box textAlign="center">
                      <Badge badgeContent={confirmationStats.pending} color="primary">
                        <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                      </Badge>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {confirmationStats.pending}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Confirmations
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box textAlign="center">
                      <Badge badgeContent={confirmationStats.expiringSoon} color="warning">
                        <WarningIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                      </Badge>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {confirmationStats.expiringSoon}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expiring Soon (≤2 days)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box textAlign="center">
                      <Badge badgeContent={confirmationStats.overdue} color="error">
                        <TimeIcon sx={{ fontSize: 40, color: 'error.main' }} />
                      </Badge>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {confirmationStats.overdue}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overdue
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Pending Confirmations */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="primary" />
                    <Typography variant="h6">
                      Pending Confirmations
                    </Typography>
                    <Badge badgeContent={filteredConfirmations.length} color="warning" />
                  </Box>
                }
                subheader="Competency ratings awaiting carer confirmation"
              />
              
              <CardContent>
                {/* Search */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    placeholder="Search by carer name, email, or task..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ maxWidth: 400 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {confirmationsLoading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : filteredConfirmations.length === 0 ? (
                  <Alert severity="info">
                    {searchTerm 
                      ? 'No confirmations found matching your search.' 
                      : 'No pending confirmations. All competency ratings have been confirmed by carers.'
                    }
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Carer</TableCell>
                          <TableCell>Task</TableCell>
                          <TableCell align="center">New Rating</TableCell>
                          <TableCell align="center">Set By</TableCell>
                          <TableCell align="center">Expires</TableCell>
                          <TableCell align="center">Status</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredConfirmations.map((confirmation: any) => {
                          const timeInfo = getTimeUntilExpiry(confirmation.expiresAt);
                          return (
                            <TableRow key={confirmation.id}>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    {confirmation.carer.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {confirmation.carer.email}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {confirmation.task.name}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={formatCompetencyLevel(confirmation.newLevel)}
                                  size="small"
                                  color="primary"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {confirmation.setByAdmin?.name || 'System'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {new Date(confirmation.expiresAt).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={timeInfo.text}
                                  size="small"
                                  color={timeInfo.color as any}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewDetails(confirmation)}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Confirmation Details Dialog */}
        <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <ConfirmIcon color="primary" />
              Confirmation Details
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedConfirmation && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Carer
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedConfirmation.carer.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedConfirmation.carer.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Task
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedConfirmation.task.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      New Competency Level
                    </Typography>
                    <Chip
                      label={formatCompetencyLevel(selectedConfirmation.newLevel)}
                      size="small"
                      color="primary"
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Set By
                    </Typography>
                    <Typography variant="body2">
                      {selectedConfirmation.setByAdmin?.name || 'System'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body2">
                      {new Date(selectedConfirmation.createdAt).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Expires
                    </Typography>
                    <Typography variant="body2">
                      {new Date(selectedConfirmation.expiresAt).toLocaleString()}
                    </Typography>
                  </Grid>
                  {selectedConfirmation.notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Notes
                      </Typography>
                      <Typography variant="body2">
                        {selectedConfirmation.notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={500}>
                    Important Rule:
                  </Typography>
                  <Typography variant="caption">
                    Only NEW competency assessments require confirmation. If a carer moves to a new location and already has a competency, 
                    it automatically applies (pre-confirmed) since they've already acknowledged that rating previously.
                  </Typography>
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button
              startIcon={<EmailIcon />}
              variant="outlined"
              onClick={() => {
                // TODO: Implement send reminder functionality
                setNotification({
                  open: true,
                  message: 'Reminder sent to carer',
                  severity: 'success'
                });
              }}
            >
              Send Reminder
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AdminPageLayout>
  );
};

export default ConfirmationManagementPage;