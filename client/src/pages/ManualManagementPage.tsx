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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Settings as ManualIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Refresh as ResetIcon,
  Warning as WarningIcon,
  Security as AuditIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '@caretrack/shared';
import { useAuth } from '../contexts/AuthContext';
import { useSmartMutation } from '../hooks/useSmartMutation';
import { AdminPageLayout } from '../components/common/AdminPageLayout';

// Manual Management - Page 3 of 4 specialized pages
const ManualManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarer, setSelectedCarer] = useState('');
  const [manualRatingDialog, setManualRatingDialog] = useState<{
    open: boolean;
    carer?: any;
    task?: any;
    currentLevel?: string;
  }>({ open: false });
  const [newCompetencyLevel, setNewCompetencyLevel] = useState('');
  const [competencyNotes, setCompetencyNotes] = useState('');

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

  // Fetch all carers for selection
  const { data: carersData, isLoading: carersLoading } = useQuery({
    queryKey: ['progress', 'carers-summary'],
    queryFn: async () => {
      const response = await apiService.get(API_ENDPOINTS.PROGRESS.LIST);
      return response?.data || response || [];
    }
  });

  // Fetch detailed progress for selected carer
  const { data: carerProgressData, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['progress', 'carer-detail', selectedCarer],
    queryFn: async () => {
      if (!selectedCarer) return null;
      const response = await apiService.get(`/api/progress/carer/${selectedCarer}`);
      return response?.data || response;
    },
    enabled: !!selectedCarer
  });

  // Set manual competency mutation
  const setManualCompetencyMutation = useSmartMutation<any, Error, any>(
    async (data) => {
      return await apiService.put('/api/progress/competency', data);
    },
    {
      mutationType: 'progress.update',
      onSuccess: (data: any) => {
        setManualRatingDialog({ open: false });
        setNewCompetencyLevel('');
        setCompetencyNotes('');
        refetchProgress();
        
        if (data.requiresConfirmation) {
          setNotification({
            open: true,
            message: 'Competency rating created and pending carer confirmation',
            severity: 'success'
          });
        } else {
          setNotification({
            open: true,
            message: data.message || 'Manual competency rating set successfully',
            severity: 'success'
          });
        }
      },
      onError: (error: any) => {
        setNotification({
          open: true,
          message: error.message || 'Failed to set competency rating',
          severity: 'error'
        });
      }
    }
  );

  // Filter carers based on search
  const filteredCarers = useMemo(() => {
    if (!carersData) return [];
    return carersData.filter((carer: any) =>
      carer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [carersData, searchTerm]);

  // Get all tasks with competency ratings for selected carer
  const allTasks = useMemo(() => {
    if (!carerProgressData?.packages) return [];
    const tasks: any[] = [];
    carerProgressData.packages.forEach((pkg: any) => {
      pkg.tasks.forEach((task: any) => {
        tasks.push({
          ...task,
          packageId: pkg.packageId,
          packageName: pkg.packageName
        });
      });
    });
    return tasks;
  }, [carerProgressData]);

  const handleOpenManualRating = (carer: any, task: any) => {
    setManualRatingDialog({
      open: true,
      carer,
      task,
      currentLevel: task.competencyLevel
    });
    setNewCompetencyLevel(task.competencyLevel);
    setCompetencyNotes('');
  };

  const handleSetManualRating = () => {
    if (!manualRatingDialog.carer || !manualRatingDialog.task) return;

    setManualCompetencyMutation.mutate({
      carerId: manualRatingDialog.carer.id,
      taskId: manualRatingDialog.task.taskId,
      level: newCompetencyLevel,
      notes: competencyNotes || undefined,
      skipConfirmation: false // Allow confirmation system to work
    });
  };

  const getCompetencyColor = (level: string) => {
    switch (level) {
      case 'EXPERT': return 'success';
      case 'PROFICIENT': return 'info';
      case 'COMPETENT': return 'primary';
      case 'ADVANCED_BEGINNER': return 'warning';
      case 'NOT_COMPETENT': return 'error';
      default: return 'default';
    }
  };

  const formatCompetencyLevel = (level: string) => {
    return level.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <AdminPageLayout 
      pageTitle="Manual Management"
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
                    <ManualIcon color="primary" />
                    <Typography variant="h5" component="div">
                      Page 3: Manual Management
                    </Typography>
                  </Box>
                }
                subheader="Direct competency rating changes with audit logging and emergency overrides"
              />
              
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Alert severity="info" icon={<EditIcon />}>
                      <Typography variant="body2" fontWeight={500}>
                        Direct Rating Changes
                      </Typography>
                      <Typography variant="caption">
                        Admins can manually adjust competency levels
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Alert severity="warning" icon={<ResetIcon />}>
                      <Typography variant="body2" fontWeight={500}>
                        Special Reset Rule
                      </Typography>
                      <Typography variant="caption">
                        Setting to "Not Assessed" also resets task progress to zero
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Alert severity="success" icon={<AuditIcon />}>
                      <Typography variant="body2" fontWeight={500}>
                        Audit Logging
                      </Typography>
                      <Typography variant="caption">
                        All manual changes tracked for compliance
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Carer Selection */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="primary" />
                    <Typography variant="h6">
                      Select Carer for Manual Management
                    </Typography>
                  </Box>
                }
              />
              
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <TextField
                      placeholder="Search carers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Select Carer</InputLabel>
                      <Select
                        value={selectedCarer}
                        label="Select Carer"
                        onChange={(e) => setSelectedCarer(e.target.value)}
                        disabled={carersLoading}
                      >
                        {filteredCarers.map((carer: any) => (
                          <MenuItem key={carer.id} value={carer.id}>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {carer.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {carer.email} • {carer.overallProgress}% complete
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Task Competency Management */}
          {selectedCarer && (
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardHeader
                  title={
                    <Typography variant="h6">
                      Task Competency Management
                    </Typography>
                  }
                  subheader={carerProgressData ? `Managing competencies for ${carerProgressData.carer.name}` : ''}
                />
                
                <CardContent>
                  {progressLoading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  ) : allTasks.length === 0 ? (
                    <Alert severity="info">
                      No tasks found for this carer.
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Task Name</TableCell>
                            <TableCell>Package</TableCell>
                            <TableCell align="center">Progress</TableCell>
                            <TableCell align="center">Current Competency</TableCell>
                            <TableCell align="center">Source</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {allTasks.map((task: any) => (
                            <TableRow key={`${task.packageId}-${task.taskId}`}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {task.taskName}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {task.packageName}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                  <Typography variant="body2">
                                    {task.completionPercentage}%
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ({task.completionCount}/{task.targetCount})
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={formatCompetencyLevel(task.competencyLevel)}
                                  size="small"
                                  color={getCompetencyColor(task.competencyLevel) as any}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="caption">
                                  {task.competencySource}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<EditIcon />}
                                  onClick={() => handleOpenManualRating(carerProgressData.carer, task)}
                                >
                                  Adjust
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Manual Rating Dialog */}
        <Dialog open={manualRatingDialog.open} onClose={() => setManualRatingDialog({ open: false })} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <EditIcon color="primary" />
              Set Manual Competency Rating
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Carer:</strong> {manualRatingDialog.carer?.name}<br/>
                <strong>Task:</strong> {manualRatingDialog.task?.taskName}
              </Typography>

              <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
                <Typography variant="body2" fontWeight={500}>
                  Special Reset Rule:
                </Typography>
                <Typography variant="caption">
                  Setting competency to "Not Assessed" will also reset all task progress to zero across all packages.
                </Typography>
              </Alert>

              <FormControl fullWidth margin="dense">
                <InputLabel>Competency Level</InputLabel>
                <Select
                  value={newCompetencyLevel}
                  label="Competency Level"
                  onChange={(e) => setNewCompetencyLevel(e.target.value)}
                >
                  <MenuItem value="NOT_ASSESSED">Not Assessed</MenuItem>
                  <MenuItem value="NOT_COMPETENT">Not Competent</MenuItem>
                  <MenuItem value="ADVANCED_BEGINNER">Advanced Beginner</MenuItem>
                  <MenuItem value="COMPETENT">Competent</MenuItem>
                  <MenuItem value="PROFICIENT">Proficient</MenuItem>
                  <MenuItem value="EXPERT">Expert</MenuItem>
                </Select>
              </FormControl>

              <TextField
                margin="dense"
                label="Notes (Optional)"
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                value={competencyNotes}
                onChange={(e) => setCompetencyNotes(e.target.value)}
                placeholder="Enter any additional notes about this competency rating..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setManualRatingDialog({ open: false })}>
              Cancel
            </Button>
            <Button 
              onClick={handleSetManualRating} 
              variant="contained"
              disabled={setManualCompetencyMutation.isPending}
            >
              {setManualCompetencyMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                'Set Rating'
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AdminPageLayout>
  );
};

export default ManualManagementPage;