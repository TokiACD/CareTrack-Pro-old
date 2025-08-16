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
  Button,
  Chip,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, AdminUser as SharedAdminUser, Carer as SharedCarer, Invitation as SharedInvitation, UsersApiResponse } from '@caretrack/shared';
import EmailChangeDialog from '../profile/EmailChangeDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartMutation } from '../../hooks/useSmartMutation';
import ConfirmationDialog from '../common/ConfirmationDialog';
import CarerDeletionDialog from '../common/CarerDeletionDialog';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useAdminDashboardRefresh } from '../../hooks/useSmartRefresh';
import {
  UserFormDialog,
  NotificationSnackbar,
  AdminUsersTable,
  CarersTable,
  InvitationsTable
} from './index';

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

// Extended AdminUser interface with UI-specific fields
interface ExtendedAdminUser extends SharedAdminUser {
  invitedBy?: string;
}

// Extended Carer interface with UI-specific fields
interface ExtendedCarer extends SharedCarer {
  competencyStatus: 'COMPETENT' | 'NEEDS_SUPPORT' | 'NOT_ASSESSED';
  assignedPackages: Array<{ id: string; name: string }>;
  totalCompetencies: number;
  fullyAssessed: boolean;
}

// Extended Invitation interface with UI-specific fields
interface ExtendedInvitation extends Omit<SharedInvitation, 'invitedByAdmin'> {
  invitedByAdmin: {
    name: string;
  };
}


interface UserFormData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  tempPassword?: string;
  isActive: boolean;
}

const UsersCard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFullyAssessedOnly, setShowFullyAssessedOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedAdminUser | ExtendedCarer | null>(null);
  const [userType, setUserType] = useState<'admin' | 'carer'>('admin');
  const [invitationStatusFilter, setInvitationStatusFilter] = useState<'PENDING' | 'ACCEPTED'>('PENDING');
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [emailChangeUser, setEmailChangeUser] = useState<{ user: ExtendedAdminUser | ExtendedCarer; type: 'ADMIN' | 'CARER' } | null>(null);
  const [emailValidationError, setEmailValidationError] = useState<string>('');
  
  // Confirmation dialog for deletions
  const { confirmationState, showConfirmation, hideConfirmation, handleConfirm } = useConfirmation();
  
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    firstName: '',
    lastName: '',
    tempPassword: '',
    isActive: true
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<ExtendedAdminUser | ExtendedCarer | null>(null);
  
  // Carer deletion dialog state
  const [carerDeletionDialogOpen, setCarerDeletionDialogOpen] = useState(false);
  const [carerToDelete, setCarerToDelete] = useState<ExtendedCarer | null>(null);
  
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

  // Smart refresh system for reliable data updates
  const { refresh, refreshOnNavigation } = useAdminDashboardRefresh({
    refreshOnMount: false // Disable refresh on mount to prevent redundant calls
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

  // Gentle refresh when component mounts to ensure fresh data
  React.useEffect(() => {
    // Don't force refresh immediately to avoid rate limiting
    // The queries will fetch naturally due to shorter staleTime
  }, []);

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
      const response = await apiService.getUsersResponse<ExtendedAdminUser[]>(`${API_ENDPOINTS.USERS.ADMINS}`, params);
      return response.data || [];
    },
    staleTime: 5000, // Short but reasonable stale time
    refetchOnWindowFocus: true
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
      
      // CRITICAL FIX: Only pass params if they exist, otherwise pass undefined
      const hasParams = Object.keys(params).length > 0;
      const apiParams = hasParams ? params : undefined;
      
      const response = await apiService.getUsersResponse<ExtendedCarer[]>(`${API_ENDPOINTS.USERS.CARERS}`, apiParams);
      return response.data || [];
    },
    staleTime: 30000, // 30 seconds stale time
    refetchOnWindowFocus: true
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
      
      const response = await apiService.getFullResponse<ExtendedInvitation[]>(`${API_ENDPOINTS.INVITATIONS.LIST}`, params);
      return response.data || [];
    },
    staleTime: 30000, // 30 seconds stale time
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 60000 // Refetch every minute
  });

  // Fetch all pending invitations for tab count
  const {
    data: pendingInvitationsData
  } = useQuery({
    queryKey: ['invitations-pending-count'],
    queryFn: async () => {
      const response = await apiService.getFullResponse<ExtendedInvitation[]>(`${API_ENDPOINTS.INVITATIONS.LIST}`, { status: 'PENDING' });
      return response.data || [];
    },
    staleTime: 30000, // 30 seconds stale time
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
      tempPassword: '',
      isActive: true
    });
    setEditingUser(null);
    setEmailValidationError('');
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


  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    const tabNames = ['Admin Users', 'Carers', 'Invitations'];
    refreshOnNavigation(tabNames[newValue]);
    
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

  const handleEditUser = (user: ExtendedAdminUser | ExtendedCarer, type: 'admin' | 'carer') => {
    setUserType(type);
    setEditingUser(user);
    
    if (type === 'admin') {
      const admin = user as ExtendedAdminUser;
      setFormData({
        name: admin.name,
        email: admin.email,
        isActive: admin.isActive,
        tempPassword: '',
        firstName: '',
        lastName: ''
      });
    } else {
      const carer = user as ExtendedCarer;
      setFormData({
        name: carer.name,
        email: carer.email,
        isActive: carer.isActive,
        firstName: '',
        lastName: '',
        tempPassword: ''
      });
    }
    
    setDialogOpen(true);
  };

  const handleDeleteUser = (user: ExtendedAdminUser | ExtendedCarer, type: 'admin' | 'carer') => {
    if (type === 'carer') {
      // Use specialized carer deletion dialog with CQC compliance
      setCarerToDelete(user as ExtendedCarer);
      setCarerDeletionDialogOpen(true);
    } else {
      // Use standard confirmation dialog for admin users
      showConfirmation(
        {
          title: 'Delete Admin User',
          message: `Are you sure you want to delete "${user.name}"?`,
          details: 'This action cannot be undone. The user will be moved to the recycle bin.',
          confirmText: 'Delete',
          severity: 'error'
        },
        () => {
          setUserType(type);
          deleteUserMutation.mutate(user.id);
        }
      );
    }
  };

  const handleCarerDeletionConfirm = () => {
    if (carerToDelete) {
      setUserType('carer');
      deleteUserMutation.mutate(carerToDelete.id);
      setCarerDeletionDialogOpen(false);
      setCarerToDelete(null);
    }
  };

  const handleCarerDeletionClose = () => {
    setCarerDeletionDialogOpen(false);
    setCarerToDelete(null);
  };


  const handleSubmit = () => {
    // Basic validation
    if (!formData.email) {
      showNotification('❌ Email is required', 'error');
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

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, user: ExtendedAdminUser | ExtendedCarer) => {
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
    showConfirmation(
      {
        title: 'Resend Invitation',
        message: 'Are you sure you want to resend this invitation?',
        details: 'A new invitation email will be sent to the user.',
        confirmText: 'Resend',
        severity: 'info'
      },
      () => {
        resendInvitationMutation.mutate(invitationId);
      }
    );
  };

  const handleCancelInvitation = (invitationId: string) => {
    showConfirmation(
      {
        title: 'Cancel Invitation',
        message: 'Are you sure you want to cancel this invitation?',
        details: 'This action cannot be undone. The invitation will be permanently cancelled.',
        confirmText: 'Cancel Invitation',
        severity: 'warning'
      },
      () => {
        cancelInvitationMutation.mutate(invitationId);
      }
    );
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
          <AdminUsersTable
            admins={filteredAdmins}
            isLoading={adminsLoading}
            error={adminsError}
            onMenuClick={handleMenuClick}
          />
        </TabPanel>

        {/* Carers Tab */}
        <TabPanel value={activeTab} index={1}>
          <CarersTable
            carers={filteredCarers}
            isLoading={carersLoading}
            error={carersError}
            onMenuClick={handleMenuClick}
            getCompetencyChip={getCompetencyChip}
          />
        </TabPanel>

        {/* Invitations Tab */}
        <TabPanel value={activeTab} index={2}>
          <InvitationsTable
            invitations={filteredInvitations}
            isLoading={invitationsLoading}
            error={invitationsError}
            onResendInvitation={handleResendInvitation}
            onCancelInvitation={handleCancelInvitation}
            getInvitationStatusChip={getInvitationStatusChip}
            isResendingInvitation={resendInvitationMutation.isPending}
            isCancellingInvitation={cancelInvitationMutation.isPending}
          />
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
        <UserFormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          editingUser={editingUser}
          userType={userType}
          formData={formData}
          setFormData={setFormData}
          handleEmailChange={handleEmailChange}
          emailValidationError={emailValidationError}
          isSubmitting={sendInvitationMutation.isPending || updateUserMutation.isPending}
        />

        {/* Success/Error Notifications */}
        <NotificationSnackbar
          notification={notification}
          onClose={handleCloseNotification}
        />

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
              ? (emailChangeUser.user as ExtendedAdminUser).name 
              : (emailChangeUser.user as ExtendedCarer).name
            }
            prefilledNewEmail={formData.email}
            isAdminChangingOtherUser={true}
            targetUserId={emailChangeUser.user.id}
          />
        )}

        {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmationState.open}
        onClose={hideConfirmation}
        onConfirm={handleConfirm}
        title={confirmationState.title}
        message={confirmationState.message}
        details={confirmationState.details}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        severity={confirmationState.severity}
        isLoading={confirmationState.isLoading}
        warnings={confirmationState.warnings}
      />

      {/* Carer Deletion Dialog with CQC Compliance */}
      {carerToDelete && (
        <CarerDeletionDialog
          open={carerDeletionDialogOpen}
          onClose={handleCarerDeletionClose}
          onConfirm={handleCarerDeletionConfirm}
          carerName={carerToDelete.name}
          carerId={carerToDelete.id}
          isDeleting={deleteUserMutation.isPending}
        />
      )}
      </CardContent>
    </Card>
  );
};

export default UsersCard;