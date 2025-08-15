import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Breadcrumbs,
  Link,
  Badge
} from '@mui/material';
import {
  ArrowBack,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  NotificationImportant as NotificationIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { API_ENDPOINTS } from '@caretrack/shared';
import { BreadcrumbNavigation, useBreadcrumbItems } from '../components/common/BreadcrumbNavigation';
import { AdminPageLayout } from '../components/common/AdminPageLayout';

interface ShiftApplication {
  id: string;
  shiftId: string;
  carerId: string;
  appliedAt: string;
  status: 'PENDING' | 'SELECTED' | 'REJECTED';
  notes?: string;
  carer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    competencyRatings?: Array<{
      taskId: string;
      level: string;
      task: { name: string };
    }>;
  };
}

interface SentShift {
  id: string;
  packageId: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredCompetencies: string[];
  isCompetentOnly: boolean;
  status: 'PENDING' | 'WAITING_RESPONSES' | 'HAS_APPLICATIONS' | 'ASSIGNED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  selectedCarerId?: string;
  expiresAt?: string;
  createdAt: string;
  applicationCount: number;
  pendingApplications: number;
  package: {
    name: string;
    postcode: string;
  };
  selectedCarer?: {
    name: string;
  };
  applications: ShiftApplication[];
}

const ShiftManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const breadcrumbItems = useBreadcrumbItems();
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Handle filter state from dashboard navigation
  useEffect(() => {
    const state = location.state as { filterStatus?: string } | null;
    if (state?.filterStatus) {
      setStatusFilter(state.filterStatus);
      // Set appropriate tab based on filter
      if (state.filterStatus === 'CONFIRMED') {
        setSelectedTab(2); // Assigned tab includes confirmed shifts
      }
    }
  }, [location.state]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShift, setSelectedShift] = useState<SentShift | null>(null);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState<ShiftApplication[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<SentShift | null>(null);

  // Fetch sent shifts
  const {
    data: shiftsData,
    isLoading: shiftsLoading,
    refetch: refetchShifts
  } = useQuery({
    queryKey: ['sent-shifts', statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await apiService.get(`${API_ENDPOINTS.SHIFT_SENDER.SENT_SHIFTS}?${params}`);
      return response?.data || response || [];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Select carer mutation
  const selectCarerMutation = useMutation({
    mutationFn: async ({ shiftId, carerId }: { shiftId: string; carerId: string }) => {
      const response = await apiService.post(API_ENDPOINTS.SHIFT_SENDER.SELECT_CARER, {
        shiftId,
        carerId
      });
      return response?.data || response;
    },
    onSuccess: (data) => {
      showSuccess('Carer selected successfully and added to rota');
      queryClient.invalidateQueries({ queryKey: ['sent-shifts'] });
      setApplicationDialogOpen(false);
      setSelectedShift(null);
    },
    onError: (error: any) => {
      showError(error?.response?.data?.error || 'Failed to select carer');
    }
  });

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await apiService.delete(`/api/shift-sender/shifts/${shiftId}`);
      return response?.data || response;
    },
    onSuccess: () => {
      showSuccess('Shift deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['sent-shifts'] });
      setDeleteDialogOpen(false);
      setShiftToDelete(null);
    },
    onError: (error: any) => {
      showError(error?.response?.data?.error || 'Failed to delete shift');
    }
  });

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'PENDING':
        return 'info';
      case 'WAITING_RESPONSES':
        return 'warning';
      case 'HAS_APPLICATIONS':
        return 'error';
      case 'ASSIGNED':
        return 'success';
      case 'CONFIRMED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      case 'COMPLETED':
        return 'primary';
      case 'EXPIRED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'Created';
      case 'WAITING_RESPONSES':
        return 'Sent to Carers';
      case 'HAS_APPLICATIONS':
        return 'Has Applications';
      case 'ASSIGNED':
        return 'Assigned';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'CANCELLED':
        return 'Cancelled';
      case 'COMPLETED':
        return 'Completed';
      case 'EXPIRED':
        return 'Expired';
      default:
        return status;
    }
  };

  const handleViewApplications = async (shift: SentShift) => {
    try {
      const response = await apiService.get(
        API_ENDPOINTS.SHIFT_SENDER.GET_APPLICATIONS.replace(':shiftId', shift.id)
      );
      setSelectedApplications(response?.data?.applications || []);
      setSelectedShift(shift);
      setApplicationDialogOpen(true);
    } catch (error) {
      showError('Failed to load applications');
    }
  };

  const handleSelectCarer = (carerId: string) => {
    if (selectedShift) {
      selectCarerMutation.mutate({
        shiftId: selectedShift.id,
        carerId
      });
    }
  };

  const handleDeleteShift = (shift: SentShift) => {
    setShiftToDelete(shift);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteShift = () => {
    if (shiftToDelete) {
      deleteShiftMutation.mutate(shiftToDelete.id);
    }
  };

  const cancelDeleteShift = () => {
    setDeleteDialogOpen(false);
    setShiftToDelete(null);
  };

  const getFilteredShifts = () => {
    if (!shiftsData) return [];
    
    let filtered = shiftsData;
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((shift: SentShift) => shift.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter((shift: SentShift) => 
        shift.package.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.package.postcode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getTabCounts = () => {
    if (!shiftsData) return { all: 0, needsReview: 0, assigned: 0 };
    
    const all = shiftsData.length;
    const needsReview = shiftsData.filter((s: SentShift) => s.status === 'HAS_APPLICATIONS' && s.pendingApplications > 0).length;
    const assigned = shiftsData.filter((s: SentShift) => s.status === 'ASSIGNED' || s.status === 'CONFIRMED').length;
    
    return { all, needsReview, assigned };
  };

  const tabCounts = getTabCounts();

  return (
    <AdminPageLayout 
      pageTitle="Shift Management"
      backPath="/dashboard"
      backText="Back to Dashboard"
      additionalBreadcrumbs={[
        {
          label: 'Shift Distribution',
          onClick: () => navigate('/shift-sender')
        }
      ]}
    >
      <Container maxWidth="xl" sx={{ py: 4 }}>

      {/* Header */}
      <Box sx={{ mb: 4 }}>

        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            variant="outlined"
            size="small"
          >
            Back to Dashboard
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => refetchShifts()}
            variant="outlined"
            size="small"
            disabled={shiftsLoading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Card>
        <CardHeader
          title="Shift Management"
          subheader="Monitor and manage shifts sent to carers"
        />
        <CardContent>
          {/* Tabs */}
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
            <Tab 
              label={`All Shifts (${tabCounts.all})`}
              onClick={() => setStatusFilter('ALL')}
            />
            <Tab 
              label={
                <Badge badgeContent={tabCounts.needsReview} color="error">
                  <Box display="flex" alignItems="center" gap={1}>
                    <NotificationIcon fontSize="small" />
                    Needs Review
                  </Box>
                </Badge>
              }
              onClick={() => setStatusFilter('HAS_APPLICATIONS')}
            />
            <Tab 
              label={`Assigned (${tabCounts.assigned})`}
              onClick={() => setStatusFilter('ASSIGNED')}
            />
          </Tabs>

          {/* Filters */}
          <Box display="flex" gap={2} mb={3} alignItems="center">
            <TextField
              placeholder="Search shifts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="PENDING">Created</MenuItem>
                <MenuItem value="WAITING_RESPONSES">Sent to Carers</MenuItem>
                <MenuItem value="HAS_APPLICATIONS">Has Applications</MenuItem>
                <MenuItem value="ASSIGNED">Assigned</MenuItem>
                <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="EXPIRED">Expired</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Shifts Table */}
          {shiftsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : getFilteredShifts().length === 0 ? (
            <Alert severity="info">
              {searchTerm || statusFilter !== 'ALL' 
                ? 'No shifts match your current filters.' 
                : 'No shifts have been sent yet. Create your first shift from the dashboard.'}
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Shift Details</TableCell>
                    <TableCell>Date & Time</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Applications</TableCell>
                    <TableCell align="center">Assigned To</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredShifts().map((shift: SentShift) => (
                    <TableRow key={shift.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {shift.package.name} ({shift.package.postcode})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {shift.isCompetentOnly ? 'Competent Only' : 'Non-Competent'} Shift
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {new Date(shift.date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {shift.startTime} - {shift.endTime}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getStatusLabel(shift.status)}
                          color={getStatusColor(shift.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2">
                            {shift.applicationCount}
                          </Typography>
                          {shift.pendingApplications > 0 && (
                            <Chip
                              label={`${shift.pendingApplications} pending`}
                              color="error"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {shift.selectedCarer ? (
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {shift.selectedCarer.name}
                            </Typography>
                            <Chip label="Assigned" color="success" size="small" />
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Not assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={1} alignItems="center" justifyContent="center">
                          {shift.applicationCount > 0 && shift.status === 'HAS_APPLICATIONS' ? (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleViewApplications(shift)}
                              startIcon={<AssignmentIcon />}
                              color="primary"
                            >
                              Review & Select
                            </Button>
                          ) : shift.applicationCount > 0 ? (
                            <IconButton
                              onClick={() => handleViewApplications(shift)}
                              size="small"
                              title="View Applications"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No applications
                            </Typography>
                          )}
                          
                          {/* Delete button - only show for non-assigned shifts */}
                          {shift.status !== 'ASSIGNED' && shift.status !== 'CONFIRMED' && shift.status !== 'COMPLETED' && (
                            <IconButton
                              onClick={() => handleDeleteShift(shift)}
                              size="small"
                              color="error"
                              title="Delete Shift"
                              disabled={deleteShiftMutation.isPending}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Application Selection Dialog */}
      <Dialog
        open={applicationDialogOpen}
        onClose={() => setApplicationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AssignmentIcon />
            <Box>
              <Typography variant="h6">
                Applications for: {selectedShift?.package.name} ({selectedShift?.package.postcode})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedApplications.length} applications received • {new Date(selectedShift?.date || '').toLocaleDateString()} {selectedShift?.startTime}-{selectedShift?.endTime}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedApplications.length === 0 ? (
            <Alert severity="info">
              No applications have been received for this shift yet.
            </Alert>
          ) : (
            <List>
              {selectedApplications.map((application) => (
                <ListItem key={application.id} divider>
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="body1" fontWeight="medium">
                          {application.carer.name}
                        </Typography>
                        <Chip
                          label={application.status}
                          color={application.status === 'SELECTED' ? 'success' : 
                                 application.status === 'REJECTED' ? 'error' : 'default'}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {application.carer.email} • {application.carer.phone}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Applied: {new Date(application.appliedAt).toLocaleString()}
                        </Typography>
                        {application.notes && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Notes:</strong> {application.notes}
                          </Typography>
                        )}
                        {/* Show competency ratings */}
                        {application.carer.competencyRatings && application.carer.competencyRatings.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Competencies:
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {application.carer.competencyRatings.map((rating) => (
                                <Chip
                                  key={rating.taskId}
                                  label={`${rating.task.name}: ${rating.level.replace('_', ' ')}`}
                                  size="small"
                                  color={rating.level === 'EXPERT' ? 'success' : 
                                         rating.level === 'COMPETENT' ? 'primary' : 'default'}
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  {application.status === 'PENDING' && (
                    <Box>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleSelectCarer(application.carerId)}
                        disabled={selectCarerMutation.isPending}
                        startIcon={selectCarerMutation.isPending ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                      >
                        Select
                      </Button>
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setApplicationDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDeleteShift}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            <Typography variant="h6">
              Confirm Delete Shift
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {shiftToDelete && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> This action cannot be undone. The shift and all its applications will be permanently deleted.
                </Typography>
              </Alert>
              
              <Typography variant="body1" gutterBottom>
                Are you sure you want to delete this shift?
              </Typography>
              
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Shift Details:
                </Typography>
                <Typography><strong>Package:</strong> {shiftToDelete.package.name} ({shiftToDelete.package.postcode})</Typography>
                <Typography><strong>Date:</strong> {new Date(shiftToDelete.date).toLocaleDateString()}</Typography>
                <Typography><strong>Time:</strong> {shiftToDelete.startTime} - {shiftToDelete.endTime}</Typography>
                <Typography><strong>Type:</strong> {shiftToDelete.isCompetentOnly ? 'Competent Only' : 'Non-Competent'}</Typography>
                <Typography><strong>Status:</strong> {getStatusLabel(shiftToDelete.status)}</Typography>
                {shiftToDelete.applicationCount > 0 && (
                  <Typography><strong>Applications:</strong> {shiftToDelete.applicationCount} received</Typography>
                )}
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button 
            onClick={cancelDeleteShift}
            disabled={deleteShiftMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteShift}
            color="error"
            variant="contained"
            disabled={deleteShiftMutation.isPending}
            startIcon={deleteShiftMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteShiftMutation.isPending ? 'Deleting...' : 'Delete Shift'}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </AdminPageLayout>
  );
};

export default ShiftManagementPage;