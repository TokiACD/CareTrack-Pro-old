import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface CarePackage {
  id: string;
  name: string;
  postcode: string;
  isActive: boolean;
  carerCount?: number;
  scheduledHours?: number;
  totalHours?: number;
}

interface CarePackageCardsProps {
  packages: CarePackage[];
  selectedPackageId: string;
  onSelectPackage: (packageId: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
}

export const CarePackageCards: React.FC<CarePackageCardsProps> = ({
  packages,
  selectedPackageId,
  onSelectPackage,
  filter,
  onFilterChange
}) => {
  // Filter packages based on search
  const filteredPackages = packages?.filter(pkg =>
    pkg.name.toLowerCase().includes(filter.toLowerCase()) ||
    pkg.postcode.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  const getStatusColor = (pkg: CarePackage) => {
    if (!pkg.isActive) return 'default';
    if (pkg.carerCount === 0) return 'error';
    if ((pkg.scheduledHours || 0) < (pkg.totalHours || 36) * 0.5) return 'warning';
    return 'success';
  };

  const getStatusText = (pkg: CarePackage) => {
    if (!pkg.isActive) return 'Inactive';
    if (pkg.carerCount === 0) return 'No Carers';
    if ((pkg.scheduledHours || 0) < (pkg.totalHours || 36) * 0.5) return 'Under-scheduled';
    return 'Active';
  };

  return (
    <Box>
      {/* Search/Filter Header */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          size="small"
          placeholder="Search care packages..."
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: filter && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onFilterChange('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 300 }}
        />
        
        <Typography variant="body2" color="text.secondary">
          {filteredPackages.length} of {packages?.length || 0} packages
        </Typography>
      </Box>

      {/* Package Cards */}
      <Box 
        display="flex" 
        gap={2} 
        sx={{ 
          overflowX: 'auto',
          pb: 1,
          '&::-webkit-scrollbar': {
            height: 6
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: 3
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 3,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.5)'
            }
          }
        }}
      >
        {filteredPackages.length === 0 ? (
          <Card sx={{ minWidth: 300, opacity: 0.6 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {packages?.length === 0 ? 'No care packages found' : 'No packages match your search'}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          filteredPackages.map((pkg) => (
            <Card
              key={pkg.id}
              sx={{
                minWidth: 280,
                maxWidth: 320,
                cursor: 'pointer',
                border: selectedPackageId === pkg.id ? '2px solid' : '1px solid',
                borderColor: selectedPackageId === pkg.id ? 'primary.main' : 'divider',
                backgroundColor: selectedPackageId === pkg.id ? 'primary.light' : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: 2
                }
              }}
              onClick={() => onSelectPackage(pkg.id)}
            >
              <CardContent sx={{ pb: 1.5 }}>
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                  <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                    {pkg.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={getStatusText(pkg)}
                    color={getStatusColor(pkg)}
                    sx={{ fontSize: '10px' }}
                  />
                </Box>

                {/* Location */}
                <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                  <LocationIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {pkg.postcode}
                  </Typography>
                </Box>

                {/* Stats */}
                <Box display="flex" justifyContent="space-between" mt={2}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Badge badgeContent={pkg.carerCount || 0} color="primary" showZero>
                      <PeopleIcon fontSize="small" color="action" />
                    </Badge>
                    <Typography variant="caption" color="text.secondary">
                      Carers
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {pkg.scheduledHours || 0}h / {pkg.totalHours || 36}h
                    </Typography>
                  </Box>
                </Box>

                {/* Progress Bar */}
                <Box mt={1}>
                  <Box
                    sx={{
                      width: '100%',
                      height: 4,
                      backgroundColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(((pkg.scheduledHours || 0) / (pkg.totalHours || 36)) * 100, 100)}%`,
                        height: '100%',
                        backgroundColor: getStatusColor(pkg) === 'success' ? 'success.main' :
                                        getStatusColor(pkg) === 'warning' ? 'warning.main' : 'error.main',
                        borderRadius: 2,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};