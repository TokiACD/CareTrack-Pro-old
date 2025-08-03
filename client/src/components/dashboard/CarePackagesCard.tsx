import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Snackbar
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '@caretrack/shared';
import { useSmartMutation } from '../../hooks/useSmartMutation';

interface CarePackage {
  id: string;
  name: string;
  postcode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedCarers: Array<{ id: string; name: string }>;
  assignedTasks: Array<{ id: string; name: string }>;
  carerCount: number;
  taskCount: number;
}

interface PackageFormData {
  name: string;
  postcode: string;
  isActive: boolean;
}

const CarePackagesCard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CarePackage | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPackage, setSelectedPackage] = useState<CarePackage | null>(null);
  
  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    postcode: '',
    isActive: true
  });
  
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


  // Helper function to show notifications
  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Fetch care packages
  const {
    data: packagesData,
    isLoading: packagesLoading,
    error: packagesError
  } = useQuery({
    queryKey: ['packages', searchTerm],
    queryFn: async () => {
      console.log('🔍 Fetching care packages with search term:', searchTerm);
      const params = searchTerm ? { search: searchTerm } : undefined;
      const result = await apiService.get<CarePackage[]>(`${API_ENDPOINTS.CARE_PACKAGES.LIST}`, params);
      console.log('📦 Fetched care packages:', result);
      return result;
    }
  });

  // Create package mutation
  const createPackageMutation = useSmartMutation<any, Error, PackageFormData>(
    async (packageData: PackageFormData) => {
      console.log('🚀 Creating care package:', packageData);
      const result = await apiService.post(API_ENDPOINTS.CARE_PACKAGES.CREATE, packageData);
      console.log('✅ Package created:', result);
      return result;
    },
    {
      mutationType: 'packages.create',
      onSuccess: (data) => {
        console.log('🔄 Smart invalidation after successful creation', data);
        setDialogOpen(false);
        resetForm();
        showNotification('✅ Care package created successfully!', 'success');
      },
      onError: (error: any) => {
        console.error('❌ Failed to create care package:', error);
        console.error('❌ Error details:', {
          message: error.message,
          response: error.response,
          request: error.request
        });
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create care package';
        showNotification(`❌ ${errorMessage}`, 'error');
      }
    }
  );

  // Update package mutation
  const updatePackageMutation = useSmartMutation<any, Error, { id: string; packageData: Partial<PackageFormData> }>(
    async ({ id, packageData }: { id: string; packageData: Partial<PackageFormData> }) => {
      return await apiService.put(`${API_ENDPOINTS.CARE_PACKAGES.UPDATE}/${id}`, packageData);
    },
    {
      mutationType: 'packages.update',
      onSuccess: () => {
        setDialogOpen(false);
        resetForm();
        showNotification('✅ Care package updated successfully!', 'success');
      },
      onError: (error: any) => {
        console.error('Failed to update care package:', error);
        const errorMessage = error.response?.data?.message || 'Failed to update care package';
        showNotification(`❌ ${errorMessage}`, 'error');
      }
    }
  );

  // Delete package mutation
  const deletePackageMutation = useSmartMutation<any, Error, string>(
    async (id: string) => {
      return await apiService.deleteWithResponse(`${API_ENDPOINTS.CARE_PACKAGES.DELETE}/${id}`);
    },
    {
      mutationType: 'packages.delete',
      onSuccess: (data: any) => {
        handleMenuClose();
        
        // Show warnings if any
        const warnings = data?.warnings;
        if (warnings && warnings.length > 0) {
          showNotification(`✅ Care package deleted. Note: ${warnings.join(', ')}`, 'success');
        } else {
          showNotification('✅ Care package deleted successfully!', 'success');
        }
      },
      onError: (error: any) => {
        console.error('Failed to delete care package:', error);
        const errorMessage = error.response?.data?.message || 'Failed to delete care package';
        showNotification(`❌ ${errorMessage}`, 'error');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      postcode: '',
      isActive: true
    });
    setEditingPackage(null);
  };

  const handleAddPackage = () => {
    setEditingPackage(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEditPackage = (pkg: CarePackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      postcode: pkg.postcode,
      isActive: pkg.isActive
    });
    setDialogOpen(true);
  };

  const handleDeletePackage = (pkg: CarePackage) => {
    const hasAssignments = pkg.carerCount > 0 || pkg.taskCount > 0;
    const warningText = hasAssignments 
      ? `This package has ${pkg.carerCount} carers and ${pkg.taskCount} tasks assigned. All assignments will be deactivated.`
      : '';
    
    const confirmMessage = `Are you sure you want to delete "${pkg.name}"? This action cannot be undone. ${warningText}`;
    
    if (window.confirm(confirmMessage)) {
      deletePackageMutation.mutate(pkg.id);
    }
  };

  const validatePostcode = (value: string): string | null => {
    if (!value) {
      return 'Postcode is required';
    }
    
    // Remove spaces and convert to uppercase for validation
    const cleanedPostcode = value.replace(/\s/g, '').toUpperCase();
    
    // UK postcode outward code pattern (first part only for privacy)
    // Formats: A9, A99, AA9, AA99, A9A, AA9A (e.g., M1, M60, SW1A, B33)
    const ukOutwardCodePattern = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?$/;
    
    if (!ukOutwardCodePattern.test(cleanedPostcode)) {
      return 'Please enter a valid UK postcode area (e.g., SW1A, M1, B33, E14)';
    }
    
    return null;
  };

  // Helper function to format postcode outward code as user types
  const formatPostcodeInput = (value: string): string => {
    // Remove all spaces and convert to uppercase, limit to 4 characters max
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    
    // Allow only letters and numbers, max 4 characters for outward code
    const alphanumeric = cleaned.replace(/[^A-Z0-9]/g, '').slice(0, 4);
    
    return alphanumeric;
  };

  const handleSubmit = () => {
    // Basic validation
    if (!formData.name.trim()) {
      showNotification('❌ Package name is required', 'error');
      return;
    }
    
    const postcodeError = validatePostcode(formData.postcode);
    if (postcodeError) {
      showNotification(`❌ ${postcodeError}`, 'error');
      return;
    }
    
    if (editingPackage) {
      updatePackageMutation.mutate({
        id: editingPackage.id,
        packageData: formData
      });
    } else {
      createPackageMutation.mutate(formData);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, pkg: CarePackage) => {
    setAnchorEl(event.currentTarget);
    setSelectedPackage(pkg);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPackage(null);
  };

  const filteredPackages = useMemo(() => {
    if (!packagesData) {
      console.log('📊 No packages data');
      return [];
    }
    console.log('📊 Processing packages data:', packagesData);
    const result = Array.isArray(packagesData) ? packagesData : [];
    console.log('📊 Filtered packages result:', result);
    return result;
  }, [packagesData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <BusinessIcon />
            <Typography variant="h6">Care Packages</Typography>
          </Box>
        }
        action={
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddPackage}
          >
            Add Package
          </Button>
        }
      />
      
      <CardContent>
        {/* Search */}
        <Box display="flex" gap={2} mb={2} alignItems="center">
          <TextField
            placeholder="Search care packages..."
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

        {/* Package Table */}
        {packagesLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : packagesError ? (
          <Alert severity="error">
            Failed to load care packages: {String(packagesError)}. Please try again.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Postcode</TableCell>
                  <TableCell>Assigned Carers</TableCell>
                  <TableCell>Assigned Tasks</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPackages.map((pkg: CarePackage) => (
                  <TableRow key={pkg.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {pkg.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={pkg.postcode} 
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <GroupIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {pkg.carerCount}
                        </Typography>
                        {pkg.assignedCarers.length > 0 && (
                          <Box ml={1}>
                            {pkg.assignedCarers.slice(0, 2).map((carer) => (
                              <Chip 
                                key={carer.id}
                                size="small" 
                                label={carer.name} 
                                variant="outlined"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                            {pkg.assignedCarers.length > 2 && (
                              <Chip 
                                size="small" 
                                label={`+${pkg.assignedCarers.length - 2} more`}
                                variant="outlined"
                                color="secondary"
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <AssignmentIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {pkg.taskCount}
                        </Typography>
                        {pkg.assignedTasks.length > 0 && (
                          <Box ml={1}>
                            {pkg.assignedTasks.slice(0, 2).map((task) => (
                              <Chip 
                                key={task.id}
                                size="small" 
                                label={task.name} 
                                variant="outlined"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                            {pkg.assignedTasks.length > 2 && (
                              <Chip 
                                size="small" 
                                label={`+${pkg.assignedTasks.length - 2} more`}
                                variant="outlined"
                                color="secondary"
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="small"
                        color={pkg.isActive ? 'success' : 'default'}
                        label={pkg.isActive ? 'Active' : 'Inactive'}
                      />
                    </TableCell>
                    <TableCell>{formatDate(pkg.createdAt)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, pkg)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPackages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">
                        No care packages found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem 
            onClick={() => {
              if (selectedPackage) {
                handleEditPackage(selectedPackage);
                handleMenuClose();
              }
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem 
            onClick={() => {
              if (selectedPackage) {
                handleDeletePackage(selectedPackage);
              }
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Add/Edit Package Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            {editingPackage ? 'Edit Care Package' : 'Add New Care Package'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                label="Package Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
                helperText="Enter a unique name for this care package"
              />
              <TextField
                label="Postcode Area"
                value={formData.postcode}
                onChange={(e) => {
                  const formattedValue = formatPostcodeInput(e.target.value);
                  setFormData({ ...formData, postcode: formattedValue });
                }}
                fullWidth
                required
                inputProps={{ maxLength: 4 }}
                placeholder="e.g., SW1A, M1, B33"
                helperText="Enter UK postcode area only (first part for privacy)"
                error={formData.postcode.length > 0 && validatePostcode(formData.postcode) !== null}
              />
              
              {!editingPackage && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  After creating the package, you can assign carers and tasks through the Assignments card.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
            >
              {createPackageMutation.isPending || updatePackageMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                editingPackage ? 'Update' : 'Create'
              )}
            </Button>
          </DialogActions>
        </Dialog>

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

export default CarePackagesCard;