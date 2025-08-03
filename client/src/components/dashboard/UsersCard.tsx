import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
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
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '@caretrack/shared';
import EmailChangeDialog from '../profile/EmailChangeDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartMutation } from '../../hooks/useSmartMutation';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`users-tabpanel-${index}`}
      aria-labelledby={`users-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  invitedBy?: string;
}

interface Carer {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  competencyStatus: 'COMPETENT' | 'NEEDS_SUPPORT' | 'NOT_ASSESSED';
  assignedPackages: Array<{ id: string; name: string }>;
  totalCompetencies: number;
  fullyAssessed: boolean;
}

interface Invitation {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  userType: 'ADMIN' | 'CARER';
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  invitedByAdmin: {
    name: string;
  };
}


interface UserFormData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  tempPassword?: string;
  isActive: boolean;
}

const UsersCard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFullyAssessedOnly, setShowFullyAssessedOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | Carer | null>(null);
  const [userType, setUserType] = useState<'admin' | 'carer'>('admin');
  const [invitationStatusFilter, setInvitationStatusFilter] = useState<'PENDING' | 'ACCEPTED'>('PENDING');
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [emailChangeUser, setEmailChangeUser] = useState<{ user: AdminUser | Carer; type: 'ADMIN' | 'CARER' } | null>(null);
  const [emailValidationError, setEmailValidationError] = useState<string>('');
  const [phoneValidationError, setPhoneValidationError] = useState<string>('');
  
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    firstName: '',
    lastName: '',
    phone: '',
    tempPassword: '',
    isActive: true
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | Carer | null>(null);
  
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

  const queryClient = useQueryClient();

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

  // Listen for email changes from verification page
  React.useEffect(() => {
    const checkEmailChangeSuccess = () => {
      const emailChangeData = localStorage.getItem('emailChangeSuccess');
      if (emailChangeData) {
        try {
          const parsedData = JSON.parse(emailChangeData);
          // Only process if it's recent (within last 30 seconds)
          if (Date.now() - parsedData.timestamp < 30000) {
            // Invalidate queries to refresh user data
            queryClient.invalidateQueries({ queryKey: ['users'] });
            showNotification(`✅ Email updated to ${parsedData.newEmail}`, 'success');
            // Clear the flag
            localStorage.removeItem('emailChangeSuccess');
          }
        } catch (error) {
          console.error('Error parsing email change data:', error);
        }
      }
    };

    // Check on mount and when tab becomes visible
    checkEmailChangeSuccess();
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkEmailChangeSuccess();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, showNotification]);

  // Fetch admin users
  const {
    data: adminsData,
    isLoading: adminsLoading,
    error: adminsError
  } = useQuery({
    queryKey: ['users', 'admins', searchTerm],
    queryFn: async () => {
      const params = searchTerm ? { search: searchTerm } : undefined;
      return await apiService.get<AdminUser[]>(`${API_ENDPOINTS.USERS.ADMINS}`, params);
    },
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 60000 // Refetch every minute
  });

  // Fetch carers
  const {
    data: carersData,
    isLoading: carersLoading,
    error: carersError
  } = useQuery({
    queryKey: ['users', 'carers', searchTerm, showFullyAssessedOnly],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (showFullyAssessedOnly) params.fullyAssessed = 'true';
      
      return await apiService.get<Carer[]>(`${API_ENDPOINTS.USERS.CARERS}`, params);
    }
  });

  // Fetch invitations
  const {
    data: invitationsData,
    isLoading: invitationsLoading,
    error: invitationsError
  } = useQuery({
    queryKey: ['invitations', searchTerm, invitationStatusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      params.status = invitationStatusFilter;
      
      return await apiService.get<Invitation[]>(`${API_ENDPOINTS.INVITATIONS.LIST}`, params);
    },
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 60000 // Refetch every minute
  });

  // Fetch all pending invitations for tab count
  const {
    data: pendingInvitationsData
  } = useQuery({
    queryKey: ['invitations-pending-count'],
    queryFn: async () => {
      return await apiService.get<Invitation[]>(`${API_ENDPOINTS.INVITATIONS.LIST}`, { status: 'PENDING' });
    },
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 60000 // Refetch every minute
  });

  // Send invitation mutation
  const sendInvitationMutation = useSmartMutation<any, Error, UserFormData>(
    async (userData: UserFormData) => {
      const endpoint = userType === 'admin' ? API_ENDPOINTS.INVITATIONS.SEND_ADMIN : API_ENDPOINTS.INVITATIONS.SEND_CARER;
      
      if (userType === 'admin') {
        return await apiService.post(endpoint, {
          email: userData.email,
          name: userData.name
        });
      } else {
        return await apiService.post(endpoint, {
          email: userData.email,
          name: userData.name
        });
      }
    },
    {
      mutationType: 'invitations.create',
      customInvalidations: ['invitations-pending-count'], // Add custom query for pending count
      onSuccess: () => {
        setDialogOpen(false);
        resetForm();
        showNotification(`✅ ${userType === 'admin' ? 'Admin' : 'Carer'} invitation sent successfully!`, 'success');
      },
      onError: (error) => {
        console.error('Failed to send invitation:', error);
        showNotification(`❌ Failed to send invitation: ${error.message}`, 'error');
      }
    }
  );

  // Update user mutation
  const updateUserMutation = useSmartMutation<any, Error, { id: string; userData: Partial<UserFormData> }>(
    async ({ id, userData }: { id: string; userData: Partial<UserFormData> }) => {
      const endpoint = userType === 'admin' 
        ? `${API_ENDPOINTS.USERS.UPDATE_ADMIN}/${id}`
        : `${API_ENDPOINTS.USERS.UPDATE_CARER}/${id}`;
      return await apiService.put(endpoint, userData);
    },
    {
      mutationType: 'users.update',
      onSuccess: () => {
        setDialogOpen(false);
        resetForm();
        showNotification(`✅ ${userType === 'admin' ? 'Admin' : 'Carer'} updated successfully!`, 'success');
      },
      onError: (error) => {
        console.error('Failed to update user:', error);
        showNotification(`❌ Failed to update user: ${error.message}`, 'error');
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useSmartMutation<any, Error, string>(
    async (id: string) => {
      const endpoint = userType === 'admin'
        ? `${API_ENDPOINTS.USERS.DELETE_ADMIN}/${id}`
        : `${API_ENDPOINTS.USERS.DELETE_CARER}/${id}`;
      return await apiService.deleteWithResponse(endpoint);
    },
    {
      mutationType: 'users.delete',
      onSuccess: () => {
        handleMenuClose();
        showNotification(`✅ ${userType === 'admin' ? 'Admin' : 'Carer'} deleted successfully!`, 'success');
      },
      onError: (error) => {
        console.error('Failed to delete user:', error);
        showNotification(`❌ Failed to delete user: ${error.message}`, 'error');
      }
    }
  );

  // Resend invitation mutation
  const resendInvitationMutation = useSmartMutation<any, Error, string>(
    async (invitationId: string) => {
      return await apiService.post(`${API_ENDPOINTS.INVITATIONS.RESEND}/${invitationId}`);
    },
    {
      mutationType: 'invitations.resend',
      customInvalidations: ['invitations-pending-count'],
      onSuccess: () => {
        showNotification('✅ Invitation resent successfully!', 'success');
      },
      onError: (error) => {
        console.error('Failed to resend invitation:', error);
        showNotification(`❌ Failed to resend invitation: ${error.message}`, 'error');
      }
    }
  );

  // Cancel invitation mutation
  const cancelInvitationMutation = useSmartMutation<any, Error, string>(
    async (invitationId: string) => {
      return await apiService.deleteWithResponse(`${API_ENDPOINTS.INVITATIONS.DELETE}/${invitationId}`);
    },
    {
      mutationType: 'invitations.delete',
      customInvalidations: ['invitations-pending-count'],
      onSuccess: () => {
        showNotification('✅ Invitation cancelled successfully!', 'success');
      },
      onError: (error) => {
        console.error('Failed to cancel invitation:', error);
        showNotification(`❌ Failed to cancel invitation: ${error.message}`, 'error');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      firstName: '',
      lastName: '',
      phone: '',
      tempPassword: '',
      isActive: true
    });
    setEditingUser(null);
    setEmailValidationError('');
    setPhoneValidationError('');
  };

  const validateEmailField = (email: string) => {
    if (!email) {
      setEmailValidationError('');
      return true; // Empty is okay, required validation is handled separately
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidationError('Please enter a valid email address');
      return false;
    }

    setEmailValidationError('');
    return true;
  };

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email });
    validateEmailField(email);
  };

  const validatePhoneField = (phone: string) => {
    if (!phone) {
      setPhoneValidationError('');
      return true; // Empty is okay since phone is optional
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check for common phone number patterns
    // UK: 10-11 digits, International: 7-15 digits
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setPhoneValidationError('Phone number must be between 7-15 digits');
      return false;
    }

    // Comprehensive phone validation - accepts various international formats
    // Supports: +44 20 1234 5678, 07123456789, +1 (555) 123-4567, etc.
    const cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');
    
    // Check if it starts with + followed by digits, or just digits
    const validFormatRegex = /^(\+\d{1,3}\d+|\d+)$/;
    if (!validFormatRegex.test(cleanPhone)) {
      setPhoneValidationError('Please enter a valid phone number (e.g., +44 20 1234 5678 or 07123456789)');
      return false;
    }

    setPhoneValidationError('');
    return true;
  };

  const handlePhoneChange = (phone: string) => {
    setFormData({ ...formData, phone });
    validatePhoneField(phone);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSearchTerm('');
    setShowFullyAssessedOnly(false);
    // Reset invitation filter to PENDING when switching to invitations tab
    if (newValue === 2) {
      setInvitationStatusFilter('PENDING');
    }
  };

  const handleAddUser = (type: 'admin' | 'carer') => {
    setUserType(type);
    setEditingUser(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEditUser = (user: AdminUser | Carer, type: 'admin' | 'carer') => {
    setUserType(type);
    setEditingUser(user);
    
    if (type === 'admin') {
      const admin = user as AdminUser;
      setFormData({
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        isActive: admin.isActive,
        tempPassword: '',
        firstName: '',
        lastName: ''
      });
    } else {
      const carer = user as Carer;
      setFormData({
        name: carer.name,
        email: carer.email,
        phone: carer.phone,
        isActive: carer.isActive,
        firstName: '',
        lastName: '',
        tempPassword: ''
      });
    }
    
    setDialogOpen(true);
  };

  const handleDeleteUser = (user: AdminUser | Carer, type: 'admin' | 'carer') => {
    if (window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      setUserType(type);
      deleteUserMutation.mutate(user.id);
    }
  };


  const handleSubmit = () => {
    // Basic validation
    if (!formData.email) {
      showNotification('❌ Email is required', 'error');
      return;
    }
    
    if (editingUser && !formData.phone) {
      showNotification('❌ Phone number is required for editing', 'error');
      return;
    }
    
    if (userType === 'admin' && !formData.name) {
      showNotification('❌ Name is required for admin users', 'error');
      return;
    }
    
    if (userType === 'carer' && !editingUser && !formData.name) {
      showNotification('❌ Full name is required for carers', 'error');
      return;
    }
    
    if (userType === 'carer' && editingUser && !formData.name) {
      showNotification('❌ Full name is required when editing carers', 'error');
      return;
    }
    
    if (editingUser) {
      // Check if email is being changed
      const emailChanged = formData.email !== editingUser.email;
      
      if (emailChanged) {
        // Use secure email change process
        setEmailChangeUser({
          user: editingUser,
          type: userType === 'admin' ? 'ADMIN' : 'CARER'
        });
        setEmailChangeDialogOpen(true);
        setDialogOpen(false); // Close edit dialog
        return;
      }
      
      // Update other fields normally (excluding email)
      const { email, firstName, lastName, tempPassword, ...updateData } = formData;
      updateUserMutation.mutate({
        id: editingUser.id,
        userData: updateData
      });
    } else {
      sendInvitationMutation.mutate(formData);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, user: AdminUser | Carer) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const filteredAdmins = useMemo(() => {
    if (!adminsData) return [];
    return Array.isArray(adminsData) ? adminsData : [];
  }, [adminsData]);

  const filteredCarers = useMemo(() => {
    if (!carersData) return [];
    return Array.isArray(carersData) ? carersData : [];
  }, [carersData]);

  const filteredInvitations = useMemo(() => {
    if (!invitationsData) return [];
    return Array.isArray(invitationsData) ? invitationsData : [];
  }, [invitationsData]);

  const pendingInvitationsCount = useMemo(() => {
    if (!pendingInvitationsData) return 0;
    return Array.isArray(pendingInvitationsData) ? pendingInvitationsData.length : 0;
  }, [pendingInvitationsData]);

  const getCompetencyChip = (status: string) => {
    const color = status === 'COMPETENT' ? 'success' : 
                 status === 'NEEDS_SUPPORT' ? 'warning' : 'default';
    const label = status === 'COMPETENT' ? 'Competent' :
                 status === 'NEEDS_SUPPORT' ? 'Needs Support' : 'Not Assessed';
    
    return <Chip size="small" color={color} label={label} />;
  };

  const getInvitationStatusChip = (status: string) => {
    let color: 'default' | 'primary' | 'success' | 'error' | 'warning' = 'default';
    let label = status;
    
    switch (status) {
      case 'PENDING':
        color = 'primary';
        label = 'Pending';
        break;
      case 'ACCEPTED':
        color = 'success';
        label = 'Accepted';
        break;
      case 'DECLINED':
        color = 'error';
        label = 'Declined';
        break;
      case 'EXPIRED':
        color = 'warning';
        label = 'Expired';
        break;
    }
    
    return <Chip size="small" color={color} label={label} />;
  };

  const handleResendInvitation = (invitationId: string) => {
    if (window.confirm('Are you sure you want to resend this invitation?')) {
      resendInvitationMutation.mutate(invitationId);
    }
  };

  const handleCancelInvitation = (invitationId: string) => {
    if (window.confirm('Are you sure you want to cancel this invitation? This action cannot be undone.')) {
      cancelInvitationMutation.mutate(invitationId);
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <GroupIcon />
            <Typography variant="h6">Users Management</Typography>
          </Box>
        }
        action={
          activeTab <= 1 ? (
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PersonAddIcon />}
                onClick={() => handleAddUser(activeTab === 0 ? 'admin' : 'carer')}
              >
                Invite {activeTab === 0 ? 'Admin' : 'Carer'}
              </Button>
            </Box>
          ) : null
        }
      />
      
      <CardContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              label={`Admin Users (${filteredAdmins?.length || 0})`}
              icon={<GroupIcon />}
              iconPosition="start"
            />
            <Tab 
              label={`Carers (${filteredCarers?.length || 0})`}
              icon={<AssessmentIcon />}
              iconPosition="start"
            />
            <Tab 
              label={`Invitations (${pendingInvitationsCount})`}
              icon={<EmailIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Search and Filters */}
        <Box display="flex" gap={2} mb={2} alignItems="center">
          <TextField
            placeholder={`Search ${activeTab === 0 ? 'admin users' : activeTab === 1 ? 'carers' : 'invitations'}...`}
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
          
          {activeTab === 1 && (
            <FormControlLabel
              control={
                <Switch
                  checked={showFullyAssessedOnly}
                  onChange={(e) => setShowFullyAssessedOnly(e.target.checked)}
                  size="small"
                />
              }
              label="Fully Assessed Only"
            />
          )}
          
          {activeTab === 2 && (
            <ToggleButtonGroup
              value={invitationStatusFilter}
              exclusive
              onChange={(_, newValue) => {
                if (newValue !== null) {
                  setInvitationStatusFilter(newValue);
                }
              }}
              size="small"
            >
              <ToggleButton value="PENDING">
                Pending
              </ToggleButton>
              <ToggleButton value="ACCEPTED">
                Accepted
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>

        {/* Admin Users Tab */}
        <TabPanel value={activeTab} index={0}>
          {adminsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : adminsError ? (
            <Alert severity="error">
              Failed to load admin users. Please try again.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAdmins.map((admin: AdminUser) => (
                    <TableRow key={admin.id} hover>
                      <TableCell>{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.phone}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small"
                          color={admin.isActive ? 'success' : 'default'}
                          label={admin.isActive ? 'Active' : 'Inactive'}
                        />
                      </TableCell>
                      <TableCell>
                        {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, admin)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAdmins.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="textSecondary">
                          No admin users found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Carers Tab */}
        <TabPanel value={activeTab} index={1}>
          {carersLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : carersError ? (
            <Alert severity="error">
              Failed to load carers. Please try again.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Competency Status</TableCell>
                    <TableCell>Assigned Packages</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCarers.map((carer: Carer) => (
                    <TableRow key={carer.id} hover>
                      <TableCell>{carer.name}</TableCell>
                      <TableCell>{carer.email}</TableCell>
                      <TableCell>{carer.phone}</TableCell>
                      <TableCell>{getCompetencyChip(carer.competencyStatus)}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {carer.assignedPackages.map((pkg: { id: string; name: string }) => (
                            <Chip 
                              key={pkg.id} 
                              size="small" 
                              variant="outlined" 
                              label={pkg.name} 
                            />
                          ))}
                          {carer.assignedPackages.length === 0 && (
                            <Typography variant="body2" color="textSecondary">
                              No packages assigned
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small"
                          color={carer.isActive ? 'success' : 'default'}
                          label={carer.isActive ? 'Active' : 'Inactive'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, carer)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCarers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="textSecondary">
                          No carers found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Invitations Tab */}
        <TabPanel value={activeTab} index={2}>
          {invitationsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : invitationsError ? (
            <Alert severity="error">
              Failed to load invitations. Please try again.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Invited By</TableCell>
                    <TableCell>Invited Date</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvitations.map((invitation: Invitation) => (
                    <TableRow key={invitation.id} hover>
                      <TableCell>
                        {invitation.name}
                      </TableCell>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small"
                          color={invitation.userType === 'ADMIN' ? 'primary' : 'secondary'}
                          label={invitation.userType === 'ADMIN' ? 'Admin' : 'Carer'}
                        />
                      </TableCell>
                      <TableCell>{getInvitationStatusChip(invitation.status)}</TableCell>
                      <TableCell>{invitation.invitedByAdmin.name}</TableCell>
                      <TableCell>{new Date(invitation.invitedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                          {new Date() > new Date(invitation.expiresAt) && (
                            <Chip size="small" color="error" label="Expired" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" gap={0.5} justifyContent="flex-end">
                          {invitation.status === 'PENDING' && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => handleResendInvitation(invitation.id)}
                                disabled={resendInvitationMutation.isPending}
                                title="Resend invitation"
                              >
                                <RefreshIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleCancelInvitation(invitation.id)}
                                disabled={cancelInvitationMutation.isPending}
                                title="Cancel invitation"
                                sx={{ color: 'error.main' }}
                              >
                                <CancelIcon />
                              </IconButton>
                            </>
                          )}
                          {invitation.status === 'ACCEPTED' && (
                            <Typography variant="body2" color="textSecondary">
                              -
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvitations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="textSecondary">
                          No invitations found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem 
            onClick={() => {
              if (selectedUser) {
                handleEditUser(selectedUser, activeTab === 0 ? 'admin' : 'carer');
                handleMenuClose();
              }
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem 
            onClick={() => {
              if (selectedUser) {
                handleDeleteUser(selectedUser, activeTab === 0 ? 'admin' : 'carer');
              }
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Add/Edit User Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            {editingUser ? `Edit ${userType === 'admin' ? 'Admin User' : 'Carer'}` : `Invite New ${userType === 'admin' ? 'Admin User' : 'Carer'}`}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              {userType === 'admin' ? (
                <>
                  <TextField
                    label="Full Name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    fullWidth
                    required
                    error={!!emailValidationError}
                    helperText={emailValidationError}
                  />
                  {editingUser && (
                    <TextField
                      label="Phone Number"
                      value={formData.phone || ''}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      fullWidth
                      required
                      error={!!phoneValidationError}
                      helperText={phoneValidationError || 'Enter phone number with country code (e.g., +44 20 1234 5678)'}
                      placeholder="+44 20 1234 5678"
                    />
                  )}
                  {!editingUser && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      An invitation email will be sent with instructions to set up their password. Users will enter their phone number during account setup.
                    </Alert>
                  )}
                </>
              ) : (
                <>
                  <TextField
                    label="Full Name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    fullWidth
                    required
                    error={!!emailValidationError}
                    helperText={emailValidationError}
                  />
                  {editingUser && (
                    <TextField
                      label="Phone Number"
                      value={formData.phone || ''}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      fullWidth
                      required
                      error={!!phoneValidationError}
                      helperText={phoneValidationError || 'Enter phone number with country code (e.g., +44 20 1234 5678)'}
                      placeholder="+44 20 1234 5678"
                    />
                  )}
                  {!editingUser && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      An invitation email will be sent with instructions to set up their password. Users will enter their phone number during account setup.
                    </Alert>
                  )}
                </>
              )}
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={sendInvitationMutation.isPending || updateUserMutation.isPending || !!emailValidationError || !!phoneValidationError}
            >
              {sendInvitationMutation.isPending || updateUserMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                editingUser ? 'Update' : 'Send Invitation'
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

        {/* Email Change Dialog */}
        {emailChangeUser && currentUser && (
          <EmailChangeDialog
            open={emailChangeDialogOpen}
            onClose={() => {
              setEmailChangeDialogOpen(false);
              setEmailChangeUser(null);
            }}
            currentEmail={emailChangeUser.user.email}
            userType={emailChangeUser.type}
            currentUserName={currentUser.name}
            targetUserName={emailChangeUser.type === 'ADMIN' 
              ? (emailChangeUser.user as AdminUser).name 
              : (emailChangeUser.user as Carer).name
            }
            prefilledNewEmail={formData.email}
            isAdminChangingOtherUser={true}
            targetUserId={emailChangeUser.user.id}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default UsersCard;