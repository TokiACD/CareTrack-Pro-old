import React from 'react';
import {
  Box,
  Typography,
  IconButton
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface WeekNavigationProps {
  selectedPackageName?: string;
  weekRange: string;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onGoToCurrentWeek: () => void;
  onRefresh: () => void;
  onClearAll: () => void;
  isRefreshing?: boolean;
  isClearingAll?: boolean;
  canClearAll?: boolean;
}

export const WeekNavigation: React.FC<WeekNavigationProps> = ({
  selectedPackageName,
  weekRange,
  onNavigateWeek,
  onGoToCurrentWeek,
  onRefresh,
  onClearAll,
  isRefreshing = false,
  isClearingAll = false,
  canClearAll = false
}) => {
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
      <Typography variant="h6" fontWeight="bold">
        {selectedPackageName} - Week Schedule
      </Typography>
      
      <Box display="flex" alignItems="center" gap={1}>
        <IconButton onClick={() => onNavigateWeek('prev')} size="small">
          <ChevronLeftIcon />
        </IconButton>
        
        <Typography variant="body2" sx={{ minWidth: 180, textAlign: 'center', fontWeight: 'medium' }}>
          {weekRange}
        </Typography>
        
        <IconButton onClick={() => onNavigateWeek('next')} size="small">
          <ChevronRightIcon />
        </IconButton>

        <IconButton onClick={onGoToCurrentWeek} size="small" color="primary" title="Current week">
          <TodayIcon />
        </IconButton>

        <IconButton onClick={onRefresh} size="small" disabled={isRefreshing} title="Refresh">
          <RefreshIcon />
        </IconButton>

        <IconButton 
          onClick={onClearAll} 
          size="small" 
          disabled={isClearingAll || !canClearAll}
          sx={{ color: 'error.main' }}
          title="Clear all"
        >
          <ClearIcon />
        </IconButton>
      </Box>
    </Box>
  );
};