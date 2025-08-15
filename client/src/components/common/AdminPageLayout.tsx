import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  alpha,
  useTheme,
  useMediaQuery,
  Divider,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
  MoreVert as MoreVertIcon,
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { BrandHeader } from './index';
import { StandardPageHeader } from './StandardPageHeader';
import { useAuth } from '../../contexts/AuthContext';
import ShiftNotifications from '../dashboard/ShiftNotifications';

interface AdminPageLayoutProps {
  /**
   * The title of the current page
   */
  pageTitle: string;
  
  /**
   * Optional custom back navigation path (defaults to '/dashboard')
   */
  backPath?: string;
  
  /**
   * Optional custom back button text (defaults to 'Back to Dashboard')
   */
  backText?: string;
  
  /**
   * Additional breadcrumb items to show between "Healthcare Dashboard" and current page
   */
  additionalBreadcrumbs?: Array<{
    label: string;
    onClick?: () => void;
  }>;
  
  /**
   * Page content
   */
  children: React.ReactNode;
}

/**
 * Consistent layout for all admin pages with blue header bar and standardized breadcrumbs
 */
export const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  pageTitle,
  backPath = '/dashboard',
  backText = 'Back to Dashboard',
  additionalBreadcrumbs = [],
  children
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleUserMenuClose();
    // Add profile navigation if needed
  };

  return (
    <Box sx={{ 
      // Let content flow naturally - no height restrictions
      padding: 0,
      bgcolor: theme.palette.background.default, 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    }}>
      {/* Professional Header - Blue Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: theme.palette.primary.main,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
        }}
      >
        <Toolbar sx={{ py: isMobile ? 0.5 : 1, px: isMobile ? 1 : 3 }}>
          <Box sx={{ flexGrow: 1 }}>
            <BrandHeader 
              size={isMobile ? "sm" : "md"} 
              onClick={handleBackToDashboard}
              showText={!isSmallMobile}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 3 }}>
            {!isMobile && <ShiftNotifications />}

            {/* Professional User Menu */}
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  transform: 'translateY(-1px)',
                },
              }}
              onClick={handleUserMenuOpen}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.light',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              
              {!isSmallMobile && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'white',
                      fontWeight: 600,
                      lineHeight: 1.2,
                      fontSize: '0.875rem',
                    }}
                  >
                    {user?.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      lineHeight: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    Administrator
                  </Typography>
                </Box>
              )}
              
              <MoreVertIcon sx={{ color: 'rgba(255, 255, 255, 0.8)', ml: 0.5 }} fontSize="small" />
            </Paper>

            {/* User Menu */}
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                elevation: 8,
                sx: {
                  mt: 1.5,
                  minWidth: 200,
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
              
              <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile Settings</ListItemText>
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                </ListItemIcon>
                <ListItemText>Sign Out</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Standardized Page Header - Breadcrumbs */}
      <StandardPageHeader 
        pageTitle={pageTitle}
        backPath={backPath}
        backText={backText}
        additionalBreadcrumbs={additionalBreadcrumbs}
      />

      {/* Page Content */}
      {children}
    </Box>
  );
};

export default AdminPageLayout;