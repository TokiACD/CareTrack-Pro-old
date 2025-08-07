import React from 'react';
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
import { DragDropContext } from 'react-beautiful-dnd';
import { WeeklyCalendar } from '../components/rota/WeeklyCalendar';
import { CarerTabs } from '../components/rota/CarerTabs';
import { CarePackageCards } from '../components/rota/CarePackageCards';
import { ViolationsSidebar } from '../components/rota/ViolationsSidebar';
import { ComponentErrorBoundary, QueryErrorBoundary } from '../components/common/ErrorBoundary';
import { RotaHeader, WeekNavigation, ViolationsControls } from '../components/rota/ui';
import {
  useRotaData,
  useRotaMutations,
  useRotaDragAndDrop,
  useRotaViolations
} from '../hooks/rota';


const RotaPage: React.FC = () => {
  const navigate = useNavigate();
  
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
  
  const {
    dragValidationResult,
    isDragInProgress,
    handleOnDragStart,
    handleOnDragEnd
  } = useRotaDragAndDrop(selectedPackageId, createRotaEntryMutation);
  
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


  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header */}
      <RotaHeader
        onNavigateHome={handleNavigateHome}
        onNavigateBack={handleNavigateBack}
      />

      {/* Care Package Cards Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Select Care Package
        </Typography>
        
        {isPackagesLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
            <Typography sx={{ ml: 2 }}>Loading packages...</Typography>
          </Box>
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
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading care packages: {(packagesError as Error).message}
        </Alert>
      )}

      {weeklyError && (
        <Alert severity="error" sx={{ mb: 3 }}>
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
          
          <Box display="flex" justifyContent="flex-end">
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
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading weekly schedule...</Typography>
            </Box>
          ) : (
            <DragDropContext 
              onDragStart={handleOnDragStart}
              onDragEnd={handleOnDragEnd}
            >
              {/* Two Column Layout: Calendar + Carers */}
              <Box display="flex" gap={3}>
                {/* Main Calendar */}
                <Box sx={{ flex: 2 }}>
                  <Card>
                    <CardContent>
                      <ComponentErrorBoundary componentName="WeeklyCalendar">
                        <WeeklyCalendar
                          weekStart={currentWeekStart}
                          entries={weeklyData?.entries || []}
                          packageId={selectedPackageId}
                          onRefresh={() => refetchWeekly()}
                          dragValidationResult={dragValidationResult}
                          isDragInProgress={isDragInProgress}
                        />
                      </ComponentErrorBoundary>
                    </CardContent>
                  </Card>
                </Box>

                {/* Carers Sidebar */}
                <Box sx={{ flex: 1 }}>
                  <Card sx={{ height: 'fit-content' }}>
                    <CardHeader
                      title="Available Carers"
                      subheader="Drag to schedule shifts"
                      subheaderTypographyProps={{ variant: 'caption' }}
                    />
                    <CardContent>
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
  );
};

export default RotaPage;