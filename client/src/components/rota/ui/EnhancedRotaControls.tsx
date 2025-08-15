import React, { useState } from 'react';
import {
  Box,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Fade,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  ViewModule as ViewModuleIcon,
  TableChart as TableChartIcon,
  ViewCompact as ViewCompactIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Download as DownloadIcon,
  FileDownload as ExcelIcon,
  Email as EmailIcon,
  Archive as ArchiveIcon,
  Share as ShareIcon
} from '@mui/icons-material';

export type ViewMode = 'table' | 'card' | 'compact';

interface PerformanceMetrics {
  totalShifts: number;
  confirmedShifts: number;
  confirmationRate: number;
  dayShifts: number;
  nightShifts: number;
  dayNightRatio: number;
  weekendShifts: number;
  coverage: 'Full' | 'Good' | 'Partial';
}

interface ExportOptions {
  onExportExcel?: () => void;
  onExportEmail?: (recipients: string[]) => void;
  onExportArchive?: (reason?: string) => void;
  isExporting?: boolean;
}

interface EnhancedRotaControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (event: React.MouseEvent<HTMLElement>, newViewMode: ViewMode) => void;
  showPerformanceMetrics: boolean;
  onTogglePerformanceMetrics: () => void;
  performanceMetrics?: PerformanceMetrics | null;
  isLoading?: boolean;
  exportOptions?: ExportOptions;
}

export const EnhancedRotaControls: React.FC<EnhancedRotaControlsProps> = ({
  viewMode,
  onViewModeChange,
  showPerformanceMetrics,
  onTogglePerformanceMetrics,
  performanceMetrics,
  isLoading = false,
  exportOptions
}) => {
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [archiveReason, setArchiveReason] = useState('');

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportExcel = () => {
    exportOptions?.onExportExcel?.();
    handleExportMenuClose();
  };

  const handleExportEmailOpen = () => {
    setEmailDialogOpen(true);
    handleExportMenuClose();
  };

  const handleExportEmailSubmit = () => {
    const recipients = emailRecipients.split(',').map(email => email.trim()).filter(email => email);
    if (recipients.length > 0) {
      exportOptions?.onExportEmail?.(recipients);
    }
    setEmailDialogOpen(false);
    setEmailRecipients('');
  };

  const handleExportArchiveOpen = () => {
    setArchiveDialogOpen(true);
    handleExportMenuClose();
  };

  const handleExportArchiveSubmit = () => {
    exportOptions?.onExportArchive?.(archiveReason || undefined);
    setArchiveDialogOpen(false);
    setArchiveReason('');
  };
  return (
    <Box>
      {/* Enhanced View Controls */}
      <Paper 
        elevation={2}
        sx={{ 
          p: 2, 
          mt: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" fontWeight="bold" color="text.secondary">
            View Mode:
          </Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={onViewModeChange}
            aria-label="view mode"
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                border: '2px solid',
                borderColor: 'divider',
                borderRadius: 2,
                mx: 0.25,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  borderColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark'
                  }
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                  borderColor: 'primary.main'
                }
              }
            }}
          >
            <ToggleButton value="table" aria-label="table view">
              <Tooltip title="Table View - Detailed schedule grid with full information">
                <TableChartIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="card" aria-label="card view">
              <Tooltip title="Card View - Mobile-friendly cards for touch interaction">
                <ViewModuleIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="compact" aria-label="compact view">
              <Tooltip title="Compact View - Space-efficient for smaller screens">
                <ViewCompactIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        {/* Performance Metrics Toggle & Export Controls */}
        <Box display="flex" alignItems="center" gap={2}>
          {/* Export Controls */}
          {exportOptions && (
            <Tooltip title="Export Options">
              <Button
                variant="outlined"
                size="small"
                startIcon={exportOptions.isExporting ? <CircularProgress size={16} /> : <ShareIcon />}
                onClick={handleExportMenuOpen}
                disabled={exportOptions.isExporting}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  fontWeight: 'bold',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    borderColor: 'primary.dark'
                  }
                }}
              >
                {exportOptions.isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </Tooltip>
          )}
          
          <Tooltip title={showPerformanceMetrics ? "Hide Performance Metrics" : "Show Performance Metrics"}>
            <IconButton
              onClick={onTogglePerformanceMetrics}
              color={showPerformanceMetrics ? 'primary' : 'default'}
              size="small"
              sx={{
                border: '2px solid',
                borderColor: showPerformanceMetrics ? 'primary.main' : 'divider',
                backgroundColor: showPerformanceMetrics ? 'primary.light' : 'transparent',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'primary.light'
                }
              }}
            >
              <TrendingUpIcon />
            </IconButton>
          </Tooltip>
          
          {performanceMetrics && !isLoading && (
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip 
                icon={<DashboardIcon />}
                label={`${performanceMetrics.totalShifts} shifts`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{
                  fontWeight: 'bold',
                  '& .MuiChip-icon': {
                    color: 'primary.main'
                  }
                }}
              />
              <Chip 
                icon={<SpeedIcon />}
                label={`${performanceMetrics.confirmationRate}% confirmed`}
                size="small"
                color={performanceMetrics.confirmationRate >= 80 ? 'success' : 'warning'}
                variant="outlined"
                sx={{
                  fontWeight: 'bold'
                }}
              />
              <Chip 
                label={`${performanceMetrics.coverage} coverage`}
                size="small"
                color={performanceMetrics.coverage === 'Full' ? 'success' : 'info'}
                variant="outlined"
                sx={{
                  fontWeight: 'bold'
                }}
              />
            </Box>
          )}
        </Box>
      </Paper>
      
      {/* Expanded Performance Metrics */}
      <Fade in={showPerformanceMetrics}>
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            mt: 1, 
            background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
            borderRadius: 3,
            border: '2px solid',
            borderColor: 'primary.light'
          }}
        >
          {performanceMetrics && !isLoading ? (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h6" color="primary.main" fontWeight="bold">
                  Weekly Performance Analytics
                </Typography>
              </Box>
              <Box 
                display="grid" 
                gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }}
                gap={3}
              >
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    SHIFT DISTRIBUTION
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    {performanceMetrics.dayShifts} Day / {performanceMetrics.nightShifts} Night
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ratio: {performanceMetrics.dayNightRatio}%
                  </Typography>
                </Box>
                
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    WEEKEND COVERAGE
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="warning.main">
                    {performanceMetrics.weekendShifts} Shifts
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Weekend allocation
                  </Typography>
                </Box>
                
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    CONFIRMATION STATUS
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {performanceMetrics.confirmedShifts}/{performanceMetrics.totalShifts}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {performanceMetrics.confirmationRate}% rate
                  </Typography>
                </Box>
                
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    COVERAGE LEVEL
                  </Typography>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    color={
                      performanceMetrics.coverage === 'Full' ? 'success.main' :
                      performanceMetrics.coverage === 'Good' ? 'warning.main' : 'error.main'
                    }
                  >
                    {performanceMetrics.coverage}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Weekly assessment
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" p={2}>
              <Typography variant="body2" color="text.secondary">
                Performance metrics will appear here when schedule data is available
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleExportExcel}>
          <ListItemIcon>
            <ExcelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Export to Excel" 
            secondary="Download as .xlsx file"
          />
        </MenuItem>
        <MenuItem onClick={handleExportEmailOpen}>
          <ListItemIcon>
            <EmailIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Email Rota" 
            secondary="Send to stakeholders"
          />
        </MenuItem>
        <MenuItem onClick={handleExportArchiveOpen}>
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Archive Week" 
            secondary="Store for records"
          />
        </MenuItem>
      </Menu>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Email Weekly Rota</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter email addresses separated by commas. The rota will be sent with an Excel attachment.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Email Recipients"
            placeholder="manager@example.com, supervisor@example.com"
            value={emailRecipients}
            onChange={(e) => setEmailRecipients(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleExportEmailSubmit} 
            variant="contained"
            disabled={!emailRecipients.trim()}
            startIcon={<EmailIcon />}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={archiveDialogOpen} onClose={() => setArchiveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Archive Weekly Rota</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will create a permanent record of the weekly rota for compliance and audit purposes.
          </Typography>
          <TextField
            fullWidth
            label="Archive Reason (Optional)"
            placeholder="End of week archival, compliance requirement, etc."
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleExportArchiveSubmit} 
            variant="contained"
            startIcon={<ArchiveIcon />}
          >
            Archive Rota
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};