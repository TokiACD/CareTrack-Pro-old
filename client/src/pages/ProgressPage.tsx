import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingUp as ProgressIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  Settings as ManualIcon,
  CheckCircle as ConfirmIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '@caretrack/shared';
import { useAuth } from '../contexts/AuthContext';
import { AdminPageLayout } from '../components/common/AdminPageLayout';

// Progress Overview - Page 1 of 4 specialized pages
const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarer, setSelectedCarer] = useState('');

  // Fetch all carers for dropdown
  const { data: carersData, isLoading: carersLoading } = useQuery({
    queryKey: ['progress', 'carers-summary'],
    queryFn: async () => {
      const response = await apiService.get(API_ENDPOINTS.PROGRESS.LIST);
      return response?.data || response || [];
    }
  });

  // Filter carers based on search
  const filteredCarers = useMemo(() => {
    if (!carersData) return [];
    return carersData.filter((carer: any) =>
      carer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [carersData, searchTerm]);

  // Navigate to specialized pages
  const handleNavigateToAssessmentWorkflow = () => {
    navigate('/progress/assessment-workflow');
  };

  const handleNavigateToManualManagement = () => {
    navigate('/progress/manual-management');
  };

  const handleNavigateToConfirmations = () => {
    navigate('/progress/confirmations');
  };

  const handleCarerSelect = (carerId: string) => {
    setSelectedCarer(carerId);
    if (carerId) {
      navigate(`/progress/carer/${carerId}`);
    }
  };

  return (
    <AdminPageLayout pageTitle="Progress Management">
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        {/* Page 1: Progress Overview */}
        <Grid container spacing={3}>
          
          {/* Individual Carer Selection */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <ProgressIcon color="primary" />
                    <Typography variant="h5" component="div">
                      Page 1: Progress Overview
                    </Typography>
                  </Box>
                }
                subheader="Individual carer selection and progress monitoring"
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
                        onChange={(e) => handleCarerSelect(e.target.value)}
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

                {carersLoading && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <CircularProgress size={24} />
                  </Box>
                )}

                {!selectedCarer && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Select a carer above to view their detailed progress, visual progress bars, global tracking across care packages, current competency ratings, and access reset functions.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Access to Other Pages */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title="Quick Access to Specialized Pages"
                subheader="Navigate to other progress management functions"
              />
              
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<AssessmentIcon />}
                      onClick={handleNavigateToAssessmentWorkflow}
                      sx={{ height: 80, flexDirection: 'column', gap: 1 }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        Page 2: Assessment Workflow
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Guided competency assessments
                      </Typography>
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ManualIcon />}
                      onClick={handleNavigateToManualManagement}
                      sx={{ height: 80, flexDirection: 'column', gap: 1 }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        Page 3: Manual Management
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Direct competency adjustments
                      </Typography>
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ConfirmIcon />}
                      onClick={handleNavigateToConfirmations}
                      sx={{ height: 80, flexDirection: 'column', gap: 1 }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        Page 4: Confirmation Management
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Track carer confirmations
                      </Typography>
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PersonIcon />}
                      onClick={() => navigate('/progress/ready-for-assessment')}
                      sx={{ height: 80, flexDirection: 'column', gap: 1 }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        Ready for Assessment
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Carers at 100% completion
                      </Typography>
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </AdminPageLayout>
  );
};

export default ProgressPage;