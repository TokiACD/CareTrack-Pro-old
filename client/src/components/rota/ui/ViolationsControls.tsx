import React from 'react';
import {
  IconButton,
  Badge
} from '@mui/material';
import {
  Warning as WarningIcon
} from '@mui/icons-material';

interface ViolationsControlsProps {
  violationCount: number;
  showAllViolations: boolean;
  onToggleShow: () => void;
}

export const ViolationsControls: React.FC<ViolationsControlsProps> = ({
  violationCount,
  showAllViolations,
  onToggleShow
}) => {
  return (
    <Badge 
      badgeContent={violationCount}
      color="error"
      max={99}
    >
      <IconButton 
        size="small"
        onClick={onToggleShow}
        sx={{ 
          color: showAllViolations ? 'primary.main' : 'text.secondary',
          backgroundColor: showAllViolations ? 'primary.light' : 'transparent'
        }}
        title="Show all scheduling issues"
      >
        <WarningIcon />
      </IconButton>
    </Badge>
  );
};