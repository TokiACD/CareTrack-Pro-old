import React from 'react';
import {
  Paper,
  Stack,
  Button,
  Divider,
  Breadcrumbs,
  Link,
  Typography,
  Box
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface StandardPageHeaderProps {
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
}

/**
 * Standardized page header with "Back to Dashboard" button and breadcrumbs
 * Matches the exact design from User Management page
 */
export const StandardPageHeader: React.FC<StandardPageHeaderProps> = ({
  pageTitle,
  backPath = '/dashboard',
  backText = 'Back to Dashboard',
  additionalBreadcrumbs = []
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(backPath);
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        mb: 4, 
        mx: 3,
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
      }}
    >
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            variant="contained"
            size="small"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {backText}
          </Button>
          
          <Divider orientation="vertical" flexItem />
          
          <Breadcrumbs>
            <Link
              component="button"
              variant="body1"
              onClick={handleBackClick}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                textDecoration: 'none',
                color: 'text.secondary',
                fontWeight: 500,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' }
              }}
            >
              <DashboardIcon fontSize="small" />
              Healthcare Dashboard
            </Link>
            
            {additionalBreadcrumbs.map((breadcrumb, index) => (
              <Link
                key={index}
                component="button"
                variant="body1"
                onClick={breadcrumb.onClick}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  textDecoration: 'none',
                  color: 'text.secondary',
                  fontWeight: 500,
                  border: 'none',
                  background: 'none',
                  cursor: breadcrumb.onClick ? 'pointer' : 'default',
                  '&:hover': breadcrumb.onClick ? { color: 'primary.main' } : {}
                }}
              >
                {breadcrumb.label}
              </Link>
            ))}
            
            <Typography color="primary.main" fontWeight={600}>
              {pageTitle}
            </Typography>
          </Breadcrumbs>
        </Stack>
    </Paper>
  );
};

export default StandardPageHeader;