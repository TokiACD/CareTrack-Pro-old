import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '@caretrack/shared';

interface ShiftTypeSelection {
  type: 'NON_COMPETENT' | 'COMPETENT';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning';
  features: string[];
  workflow: string[];
}

const SHIFT_TYPES: ShiftTypeSelection[] = [
  {
    type: 'NON_COMPETENT',
    title: 'Non-Competent Shift',
    description: 'Send to all available carers regardless of competency level',
    icon: <PersonIcon />,
    color: 'primary',
    features: [
      'Shows all available carers',
      'Displays competency ratings as "More Info"',
      'Admin can review skills before selecting',
      'Good for training opportunities'
    ],
    workflow: [
      '1. Select date, time, and care package',
      '2. System shows all available carers',
      '3. Send shift to selected carers via mobile app',
      '4. Carers apply through their mobile app',
      '5. Admin reviews applications and selects winner',
      '6. System updates rota and notifies carers'
    ]
  },
  {
    type: 'COMPETENT',
    title: 'Competent Shift',
    description: 'Send only to carers with required competencies',
    icon: <AssessmentIcon />,
    color: 'success',
    features: [
      'Shows only competent carers',
      'Pre-filters by task requirements',
      'Ensures quality standards',
      'Faster selection process'
    ],
    workflow: [
      '1. Select date, time, and care package',
      '2. Choose required tasks/competencies',
      '3. System shows only competent carers',
      '4. Send shift to filtered carers via mobile app',
      '5. Carers apply through their mobile app',
      '6. Admin reviews applications and selects winner',
      '7. System updates rota and notifies carers'
    ]
  }
];

interface DashboardStats {
  pendingShifts: number;
  shiftsWithApplications: number;
  assignedShifts: number;
  totalCarers: number;
}

const ShiftSenderCard: React.FC = () => {
  const navigate = useNavigate();
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ShiftTypeSelection | null>(null);

  // Fetch dashboard statistics
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['shift-sender', 'stats'],
    queryFn: async () => {
      // Get current admin's sent shifts summary
      const response = await apiService.get<any[]>(`${API_ENDPOINTS.SHIFT_SENDER.SENT_SHIFTS}?limit=100`);
      const shifts = response?.data || response || [];
      
      const pendingShifts = shifts.filter((s: any) => 
        s.status === 'PENDING' || s.status === 'WAITING_RESPONSES'
      ).length;
      
      const shiftsWithApplications = shifts.filter((s: any) => 
        s.status === 'HAS_APPLICATIONS' && s.pendingApplications > 0
      ).length;
      
      const assignedShifts = shifts.filter((s: any) => 
        s.status === 'ASSIGNED' || s.status === 'CONFIRMED'
      ).length;

      // Get total carers count
      const carersResponse = await apiService.get(`${API_ENDPOINTS.CARERS.LIST}?limit=1`);
      const totalCarers = carersResponse?.pagination?.total || 0;

      return {
        pendingShifts,
        shiftsWithApplications,
        assignedShifts,
        totalCarers
      } as DashboardStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000 // Data is fresh for 15 seconds
  });

  const handleCreateShift = (type: 'NON_COMPETENT' | 'COMPETENT') => {
    navigate('/shift-sender/create', { 
      state: { 
        shiftType: type,
        isCompetentOnly: type === 'COMPETENT'
      } 
    });
  };

  const handleViewSentShifts = () => {
    navigate('/shift-sender/management');
  };

  const handleShowInfo = (type: ShiftTypeSelection) => {
    setSelectedType(type);
    setInfoDialogOpen(true);
  };

  const handleCloseInfoDialog = () => {
    setInfoDialogOpen(false);
    setSelectedType(null);
  };

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <SendIcon />
              <Typography variant="h6">Shift Sender</Typography>
            </Box>
          }
          subheader="Send shifts to carers via mobile app for job-board style assignment"
        />
        
        <CardContent>
          {/* Statistics */}
          {statsLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : statsError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Unable to load statistics
            </Alert>
          ) : (
            <Box display="flex" gap={1} mb={3} flexWrap="wrap">
              <Chip
                icon={<ScheduleIcon />}
                label={`${stats?.pendingShifts || 0} Pending Shifts`}
                color={stats?.pendingShifts ? 'warning' : 'default'}
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<PersonIcon />}
                label={`${stats?.shiftsWithApplications || 0} Need Review`}
                color={stats?.shiftsWithApplications ? 'error' : 'default'}
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<CheckCircleIcon />}
                label={`${stats?.assignedShifts || 0} Assigned`}
                color="success"
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<WorkIcon />}
                label={`${stats?.totalCarers || 0} Total Carers`}
                color="info"
                variant="outlined"
                size="small"
              />
            </Box>
          )}

          {/* Shift Type Selection */}
          <Grid container spacing={2} mb={3}>
            {SHIFT_TYPES.map((shiftType) => (
              <Grid item xs={12} md={6} key={shiftType.type}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    '&:hover': {
                      borderColor: `${shiftType.color}.main`,
                      elevation: 4
                    }
                  }}
                  onClick={() => handleCreateShift(shiftType.type)}
                >
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Box color={`${shiftType.color}.main`}>
                      {shiftType.icon}
                    </Box>
                    <Box flexGrow={1}>
                      <Typography variant="h6" gutterBottom>
                        {shiftType.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {shiftType.description}
                      </Typography>
                      <Box display="flex" gap={1} mb={2}>
                        <Button
                          size="small"
                          variant="outlined"
                          color={shiftType.color}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowInfo(shiftType);
                          }}
                          startIcon={<InfoIcon />}
                        >
                          More Info
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color={shiftType.color}
                          startIcon={<SendIcon />}
                        >
                          Create Shift
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Management Button */}
          <Box display="flex" justifyContent="center">
            <Button
              variant="outlined"
              size="large"
              onClick={handleViewSentShifts}
              startIcon={<ScheduleIcon />}
              disabled={!stats || (stats.pendingShifts + stats.shiftsWithApplications + stats.assignedShifts) === 0}
            >
              Manage Sent Shifts
              {stats && (stats.shiftsWithApplications > 0) && (
                <Chip 
                  label={stats.shiftsWithApplications} 
                  size="small" 
                  color="error" 
                  sx={{ ml: 1 }}
                />
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Info Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={handleCloseInfoDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {selectedType?.icon}
            <Typography variant="h6">
              {selectedType?.title}
            </Typography>
            <Box flexGrow={1} />
            <Button
              onClick={handleCloseInfoDialog}
              size="small"
              color="inherit"
            >
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph>
            {selectedType?.description}
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Features:
          </Typography>
          <List dense>
            {selectedType?.features.map((feature, index) => (
              <ListItem key={index} disableGutters>
                <ListItemIcon>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={feature} />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Workflow:
          </Typography>
          <List dense>
            {selectedType?.workflow.map((step, index) => (
              <ListItem key={index} disableGutters>
                <ListItemText 
                  primary={step}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: step.startsWith('1.') || step.startsWith('2.') || 
                                 step.startsWith('3.') || step.startsWith('4.') || 
                                 step.startsWith('5.') || step.startsWith('6.') || 
                                 step.startsWith('7.') ? 'medium' : 'normal'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> The carer mobile app integration is part of the future development phase. 
              Currently, notifications would be sent via email with links to a mobile-optimized interface.
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseInfoDialog}>
            Close
          </Button>
          <Button
            variant="contained"
            color={selectedType?.color}
            onClick={() => {
              handleCloseInfoDialog();
              if (selectedType) {
                handleCreateShift(selectedType.type);
              }
            }}
            startIcon={<SendIcon />}
          >
            Create {selectedType?.title}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShiftSenderCard;