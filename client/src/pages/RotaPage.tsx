import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { DragDropContext } from 'react-beautiful-dnd';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { WeeklyCalendar } from '../components/rota/WeeklyCalendar';
import { CarerTabs } from '../components/rota/CarerTabs';
import { CarePackageCards } from '../components/rota/CarePackageCards';
import { ViolationsSidebar } from '../components/rota/ViolationsSidebar';
import { ComponentErrorBoundary, QueryErrorBoundary } from '../components/common/ErrorBoundary';
import { SmartLoading } from '../components/common';
import { RotaHeader, WeekNavigation, ViolationsControls, EnhancedRotaControls } from '../components/rota/ui';
import { AdminPageLayout } from '../components/common/AdminPageLayout';
import {
  useRotaData,
  useRotaMutations,
  useRotaDragAndDrop,
  useRotaViolations
} from '../hooks/rota';


type ViewMode = 'table' | 'card' | 'compact';

const RotaPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);
  const { showSuccess, showError } = useNotification();
  
  // Custom hooks
  const {
    selectedPackageId,
    packageFilter,
    currentWeekStart,
    selectedPackage,
    carePackages,
    isPackagesLoading,
    packagesError,
    weeklyData,
    isWeeklyLoading,
    weeklyError,
    refetchWeekly,
    handlePackageChange,
    setPackageFilter,
    navigateWeek,
    goToCurrentWeek,
    formatWeekRange
  } = useRotaData();
  
  const { createRotaEntryMutation, clearAllEntriesMutation } = useRotaMutations(
    selectedPackageId, 
    currentWeekStart
  );

  // Export mutations
  const exportExcelMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPackageId) throw new Error('No package selected');
      const blob = await apiService.exportRotaToExcel(selectedPackageId, currentWeekStart.toISOString());
      
      // Download the file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rota_${selectedPackage?.name?.replace(/\s+/g, '_')}_${currentWeekStart.toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      showSuccess('Excel file downloaded successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.error || 'Failed to export to Excel');
    }
  });

  const exportEmailMutation = useMutation({
    mutationFn: async (recipients: string[]) => {
      if (!selectedPackageId) throw new Error('No package selected');
      return await apiService.emailWeeklyRota(selectedPackageId, currentWeekStart.toISOString(), recipients);
    },
    onSuccess: (data: any) => {
      showSuccess(`Rota email prepared for ${data.recipientCount} recipient(s)`);
    },
    onError: (error: any) => {
      showError(error.response?.data?.error || 'Failed to send email');
    }
  });

  const exportArchiveMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!selectedPackageId) throw new Error('No package selected');
      return await apiService.archiveWeeklyRota(selectedPackageId, currentWeekStart.toISOString(), reason);
    },
    onSuccess: (data: any) => {
      showSuccess(`Successfully archived ${data.totalEntries} rota entries`);
    },
    onError: (error: any) => {
      showError(error.response?.data?.error || 'Failed to archive rota');
    }
  });
  
  const {
    dragValidationResult,
    isDragInProgress,
    handleOnDragStart,
    handleOnDragUpdate,
    handleOnDragEnd,
    getSchedulingSuggestions
  } = useRotaDragAndDrop(selectedPackageId, createRotaEntryMutation, {
    enableHapticFeedback: true,
    enableVisualFeedback: true,
    enableSmartSuggestions: true,
    mobileOptimized: true
  });
  
  const {
    showAllViolations,
    setShowAllViolations,
    handleDismissViolation,
    clearAllViolationsOnNavigation,
    getDisplayedViolations,
    getTotalViolationCount
  } = useRotaViolations(weeklyData);

  // Navigation handlers
  const handleNavigateHome = () => navigate('/dashboard');
  const handleNavigateBack = () => navigate('/dashboard');
  
  const handlePackageChangeWithClearViolations = (packageId: string) => {
    handlePackageChange(packageId);
    clearAllViolationsOnNavigation();
  };
  
  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    navigateWeek(direction);
    clearAllViolationsOnNavigation();
  };
  
  const handleGoToCurrentWeek = () => {
    goToCurrentWeek();
    clearAllViolationsOnNavigation();
  };

  const handleClearAll = () => {
    if (weeklyData?.entries) {
      clearAllEntriesMutation.mutate(weeklyData.entries);
      clearAllViolationsOnNavigation();
    }
  };

  // Performance metrics calculation
  const performanceMetrics = useMemo(() => {
    if (!weeklyData?.entries) return null;
    
    const entries = weeklyData.entries;
    const totalShifts = entries.length;
    const confirmedShifts = entries.filter(e => e.isConfirmed).length;
    const dayShifts = entries.filter(e => e.shiftType === 'DAY').length;
    const nightShifts = entries.filter(e => e.shiftType === 'NIGHT').length;
    const weekendShifts = entries.filter(e => {
      const date = new Date(e.date);
      return date.getDay() === 0 || date.getDay() === 6;
    }).length;
    
    const confirmationRate = totalShifts > 0 ? Math.round((confirmedShifts / totalShifts) * 100) : 0;
    const dayNightRatio = dayShifts > 0 ? Math.round((nightShifts / dayShifts) * 100) : 0;
    
    return {
      totalShifts,
      confirmedShifts,
      confirmationRate,
      dayShifts,
      nightShifts,
      dayNightRatio,
      weekendShifts,
      coverage: totalShifts >= 14 ? 'Full' : totalShifts >= 10 ? 'Good' : 'Partial'
    } as const;
  }, [weeklyData?.entries]);

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: ViewMode
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
      // Add haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };


  return (
    <AdminPageLayout pageTitle="Rota Scheduling">
      <Container maxWidth="xl" sx={{ 
        py: { xs: 1, sm: 2 },
        px: { xs: 1, sm: 2 },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'
      }}>

        {/* Care Package Cards Section */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ 
            mb: { xs: 1.5, sm: 2 }, 
            fontWeight: 'bold',
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}>
            Select Care Package
          </Typography>
        
        {isPackagesLoading ? (
          <SmartLoading type="care-packages" animate={true} />
        ) : (
          <QueryErrorBoundary>
            <CarePackageCards
            packages={carePackages || []}
            selectedPackageId={selectedPackageId}
            onSelectPackage={handlePackageChangeWithClearViolations}
            filter={packageFilter}
            onFilterChange={setPackageFilter}
            />
          </QueryErrorBoundary>
        )}
      </Box>

        {/* Error States */}
        {packagesError && (
          <Alert severity="error" sx={{ mb: { xs: 2, sm: 3 } }}>
            Error loading care packages: {(packagesError as Error).message}
          </Alert>
        )}

        {weeklyError && (
          <Alert severity="error" sx={{ mb: { xs: 2, sm: 3 } }}>
            Error loading weekly schedule: {(weeklyError as Error).message}
          </Alert>
        )}

      {/* Loading State */}
      {isPackagesLoading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading care packages...</Typography>
        </Box>
      )}

      {/* Package Selection State */}
      {!isPackagesLoading && !selectedPackageId && carePackages?.length === 0 && (
        <Alert severity="info">
          No care packages found. Please create a care package first to manage schedules.
        </Alert>
      )}

      {!isPackagesLoading && !selectedPackageId && carePackages && carePackages.length > 0 && (
        <Alert severity="info">
          Please select a care package above to view and manage its schedule.
        </Alert>
      )}

      {/* Week Navigation & Schedule */}
      {selectedPackageId && (
        <Box sx={{ mb: 3 }}>
          <WeekNavigation
            selectedPackageName={selectedPackage?.name}
            weekRange={formatWeekRange(currentWeekStart)}
            onNavigateWeek={handleNavigateWeek}
            onGoToCurrentWeek={handleGoToCurrentWeek}
            onRefresh={() => refetchWeekly()}
            onClearAll={handleClearAll}
            isRefreshing={isWeeklyLoading}
            isClearingAll={clearAllEntriesMutation.isPending}
            canClearAll={!!weeklyData?.entries && weeklyData.entries.length > 0}
          />
          
          {/* Enhanced Rota Controls */}
          <EnhancedRotaControls
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            showPerformanceMetrics={showPerformanceMetrics}
            onTogglePerformanceMetrics={() => setShowPerformanceMetrics(!showPerformanceMetrics)}
            performanceMetrics={performanceMetrics}
            isLoading={isWeeklyLoading}
            exportOptions={{
              onExportExcel: () => exportExcelMutation.mutate(),
              onExportEmail: (recipients) => exportEmailMutation.mutate(recipients),
              onExportArchive: (reason) => exportArchiveMutation.mutate(reason),
              isExporting: exportExcelMutation.isPending || exportEmailMutation.isPending || exportArchiveMutation.isPending
            }}
          />
          
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <ViolationsControls
              violationCount={getTotalViolationCount()}
              showAllViolations={showAllViolations}
              onToggleShow={() => setShowAllViolations(!showAllViolations)}
            />
          </Box>
        </Box>
      )}

      {/* Main Content */}
      {selectedPackageId && !weeklyError && (
        <>
          {isWeeklyLoading ? (
            <SmartLoading type={viewMode === 'card' ? 'rota-cards' : 'rota-table'} animate={true} />
          ) : (
            <DragDropContext 
              onDragStart={handleOnDragStart}
              onDragUpdate={handleOnDragUpdate}
              onDragEnd={handleOnDragEnd}
            >
              {/* Responsive Layout: Calendar + Carers */}
              <Box 
                display="flex" 
                gap={{ xs: 2, sm: 3 }}
                flexDirection={{ xs: 'column', lg: 'row' }}
                sx={{ flex: 1 }}
              >
                {/* Main Calendar */}
                <Box sx={{ 
                  flex: { lg: 2 },
                  minHeight: { xs: '400px', sm: '500px', lg: 'auto' }
                }}>
                  <Card sx={{ height: { lg: '100%' } }}>
                    <CardContent sx={{ 
                      p: { xs: 1.5, sm: 3 },
                      height: { lg: '100%' },
                      display: { lg: 'flex' },
                      flexDirection: { lg: 'column' }
                    }}>
                      <ComponentErrorBoundary componentName="WeeklyCalendar">
                        <WeeklyCalendar
                          weekStart={currentWeekStart}
                          entries={weeklyData?.entries || []}
                          packageId={selectedPackageId}
                          onRefresh={() => refetchWeekly()}
                          dragValidationResult={dragValidationResult}
                          isDragInProgress={isDragInProgress}
                          viewMode={viewMode}
                          onViewModeChange={setViewMode}
                        />
                      </ComponentErrorBoundary>
                    </CardContent>
                  </Card>
                </Box>

                {/* Carers Sidebar */}
                <Box sx={{ 
                  flex: { lg: 1 },
                  minHeight: { xs: '300px', lg: 'auto' }
                }}>
                  <Card sx={{ 
                    height: { lg: 'fit-content' },
                    maxHeight: { xs: '400px', lg: 'none' },
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <CardHeader
                      title="Available Carers"
                      subheader="Drag to schedule shifts"
                      subheaderTypographyProps={{ variant: 'caption' }}
                      sx={{ pb: 1 }}
                    />
                    <CardContent sx={{ 
                      p: { xs: 1.5, sm: 2 },
                      pt: 0,
                      flex: 1,
                      overflow: 'auto'
                    }}>
                      <CarerTabs
                        packageCarers={weeklyData?.packageCarers || []}
                        otherCarers={weeklyData?.otherCarers || []}
                        packageId={selectedPackageId}
                        weekStart={currentWeekStart}
                      />
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </DragDropContext>
          )}
        </>
      )}

        {/* Floating Violations Sidebar */}
        <ViolationsSidebar
          violations={getDisplayedViolations()}
          onDismissViolation={handleDismissViolation}
          onClearAll={() => clearAllViolationsOnNavigation()}
          showToggleButton={true}
          isShowingAll={showAllViolations}
          onToggleShow={() => setShowAllViolations(!showAllViolations)}
        />
      </Container>
    </AdminPageLayout>
  );
};

export default RotaPage;