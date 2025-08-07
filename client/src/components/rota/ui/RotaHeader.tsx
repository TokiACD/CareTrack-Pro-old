import React from 'react';
import {
  Box,
  Breadcrumbs,
  Link,
  Typography,
  Button
} from '@mui/material';
import {
  ArrowBack,
  Home as HomeIcon
} from '@mui/icons-material';

interface RotaHeaderProps {
  onNavigateHome: () => void;
  onNavigateBack: () => void;
}

export const RotaHeader: React.FC<RotaHeaderProps> = ({
  onNavigateHome,
  onNavigateBack
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body1"
          onClick={onNavigateHome}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            textDecoration: 'none',
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' }
          }}
        >
          <HomeIcon fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary">Rota Scheduling</Typography>
      </Breadcrumbs>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onNavigateBack}
          variant="outlined"
          size="small"
        >
          Back
        </Button>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Weekly Rota Schedule
        </Typography>
      </Box>
    </Box>
  );
};