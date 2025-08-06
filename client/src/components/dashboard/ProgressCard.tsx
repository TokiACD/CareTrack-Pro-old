import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Snackbar
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingUp as ProgressIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  Work as PackageIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, Carer } from '@caretrack/shared';

interface CarerProgressSummary extends Carer {
  packageCount: number;
  overallProgress: number;
  needsAssessment: boolean;
  lastActivity?: Date;
}

const ProgressCard: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
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


  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Fetch carers with progress summary
  const {
    data: carersData,
    isLoading: carersLoading,
    error: carersError
  } = useQuery({
    queryKey: ['progress', 'carers', searchTerm],
    queryFn: async () => {
      const params = searchTerm ? { search: searchTerm } : undefined;
      const response = await apiService.get<CarerProgressSummary[]>(`${API_ENDPOINTS.PROGRESS.LIST}`, params);
      
      // Extract data from the response structure
      const result = (response as any)?.data || response;
      return result;
    }
  });

  // Filter carers based on search
  const filteredCarers = useMemo(() => {
    if (!carersData) {
      return [];
    }
    
    const result = Array.isArray(carersData) ? carersData : [];
    return result;
  }, [carersData]);

  const handleViewCarerProgress = (carer: CarerProgressSummary) => {
    navigate(`/progress/carer/${carer.id}`);
  };

  const getProgressColor = (progress: number): 'error' | 'warning' | 'info' | 'success' => {
    if (progress < 25) return 'error';
    if (progress < 50) return 'warning';
    if (progress < 75) return 'info';
    return 'success';
  };

  const formatDate = (dateString?: Date) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <ProgressIcon />
            <Typography variant="h6">Progress Tracking</Typography>
          </Box>
        }
        subheader="Monitor individual carer progress and competency assessments"
      />
      
      <CardContent>
        {/* Search */}
        <Box display="flex" gap={2} mb={2} alignItems="center">
          <TextField
            placeholder="Search carers..."
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
            sx={{ flexGrow: 1 }}
          />
        </Box>

        {/* Summary Stats */}
        <Box display="flex" gap={2} mb={3}>
          <Chip
            icon={<PersonIcon />}
            label={`${filteredCarers.length} Active Carers`}
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<AssessmentIcon />}
            label={`${filteredCarers.filter(c => c.needsAssessment).length} Need Assessment`}
            color={filteredCarers.filter(c => c.needsAssessment).length > 0 ? 'warning' : 'success'}
            variant="outlined"
          />
          <Chip
            icon={<PackageIcon />}
            label={`${filteredCarers.reduce((acc, c) => acc + c.packageCount, 0)} Package Assignments`}
            color="info"
            variant="outlined"
          />
        </Box>

        {/* Progress Table */}
        {carersLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : carersError ? (
          <Alert severity="error">
            Failed to load carer progress data: {String(carersError)}. Please try again.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Carer</TableCell>
                  <TableCell align="center">Packages</TableCell>
                  <TableCell align="center">Overall Progress</TableCell>
                  <TableCell align="center">Assessment Status</TableCell>
                  <TableCell align="center">Last Activity</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCarers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm ? 'No carers found matching your search.' : 'No active carers found.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCarers.map((carer: CarerProgressSummary) => (
                    <TableRow
                      key={carer.id}
                      sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {carer.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {carer.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={carer.packageCount}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ minWidth: 120 }}>
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <LinearProgress
                              variant="determinate"
                              value={carer.overallProgress}
                              color={getProgressColor(carer.overallProgress)}
                              sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption">
                              {Math.round(carer.overallProgress)}%
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={carer.needsAssessment ? 'Assessment Needed' : 'Up to Date'}
                          size="small"
                          color={carer.needsAssessment ? 'warning' : 'success'}
                          variant={carer.needsAssessment ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {formatDate(carer.lastActivity)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewCarerProgress(carer)}
                          startIcon={<ProgressIcon />}
                        >
                          View Progress
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Success/Error Notifications */}
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

export default ProgressCard;