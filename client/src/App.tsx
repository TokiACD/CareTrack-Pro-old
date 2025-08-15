import React, { Suspense, memo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

import { useAuth } from './contexts/AuthContext'
import { LoadingScreen } from './components/common/LoadingScreen'
import { Footer } from './components/common/Footer'
import { PageErrorBoundary } from './components/common/ErrorBoundary'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute'
import { CarerProtectedRoute } from './components/auth/CarerProtectedRoute'

// Lazy load components for better performance
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(module => ({ default: module.HealthcareLogin })))
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })))
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })))
const AcceptInvitationPage = React.lazy(() => import('./pages/AcceptInvitationPage'))
const TasksPage = React.lazy(() => import('./pages/TasksPage'))
const AssignmentsPage = React.lazy(() => import('./pages/AssignmentsPage'))
const AssessmentsPage = React.lazy(() => import('./pages/AssessmentsPage'))
const CreateAssessmentPage = React.lazy(() => import('./pages/CreateAssessmentPage'))
const EditAssessmentPage = React.lazy(() => import('./pages/EditAssessmentPage'))
const RecycleBinPage = React.lazy(() => import('./pages/RecycleBinPage'))
const ProgressPage = React.lazy(() => import('./pages/ProgressPage'))
const AssessmentWorkflowPage = React.lazy(() => import('./pages/AssessmentWorkflowPage'))
const ManualManagementPage = React.lazy(() => import('./pages/ManualManagementPage'))
const ConfirmationManagementPage = React.lazy(() => import('./pages/ConfirmationManagementPage'))
const CarerProgressDetailPage = React.lazy(() => import('./pages/CarerProgressDetailPage'))
const TakeAssessmentPage = React.lazy(() => import('./pages/TakeAssessmentPage'))
const EmailChangeVerification = React.lazy(() => import('./pages/EmailChangeVerification'))
const ShiftCreationPage = React.lazy(() => import('./pages/ShiftCreationPage'))
const ShiftManagementPage = React.lazy(() => import('./pages/ShiftManagementPage'))
const RotaPage = React.lazy(() => import('./pages/RotaPage'))
const AuditLogPage = React.lazy(() => import('./pages/AuditLogPage'))
const UsersPage = React.lazy(() => import('./pages/UsersPage'))
const CarePackagesPage = React.lazy(() => import('./pages/CarePackagesPage'))
const PDFReportsPage = React.lazy(() => import('./pages/PDFReportsPage'))
const ShiftSenderPage = React.lazy(() => import('./pages/ShiftSenderPage'))
const CarerDashboardPage = React.lazy(() => import('./pages/CarerDashboardPage'))
const DailyTaskAssessmentPage = React.lazy(() => import('./pages/DailyTaskAssessmentPage'))
const PersonalProgressPage = React.lazy(() => import('./pages/PersonalProgressPage'))
const AvailableShiftsPage = React.lazy(() => import('./pages/AvailableShiftsPage'))
const PersonalRotaPage = React.lazy(() => import('./pages/PersonalRotaPage'))
const CompetencyConfirmationsPage = React.lazy(() => import('./pages/CompetencyConfirmationsPage'))
const AchievementsPage = React.lazy(() => import('./pages/AchievementsPage'))

const App = memo(() => {
  const { user, userType, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <PageErrorBoundary>
      <Box sx={{ 
        height: '100vh',
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden' // Prevent layout scroll
      }}>
        {/* Single scrollable content area - ONLY scroll area in entire app */}
        <Box 
          component="main"
          sx={{ 
            flex: 1,
            overflow: 'auto', // ONLY scroll area
            backgroundColor: 'background.default',
            // Smooth scrolling for better UX
            scrollBehavior: 'smooth',
            // Ensure proper touch scrolling on mobile
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate to={userType === 'admin' ? "/dashboard" : "/carer-dashboard"} replace />
            ) : (
              <Suspense fallback={<LoadingScreen />}>
                <LoginPage />
              </Suspense>
            )
          } 
        />
        <Route 
          path="/invitation/accept" 
          element={
            <Suspense fallback={<LoadingScreen />}>
              <AcceptInvitationPage />
            </Suspense>
          } 
        />
        <Route 
          path="/email-change/verify" 
          element={
            <Suspense fallback={<LoadingScreen />}>
              <EmailChangeVerification />
            </Suspense>
          } 
        />
        <Route 
          path="/email-change/cancel" 
          element={
            <Suspense fallback={<LoadingScreen />}>
              <EmailChangeVerification />
            </Suspense>
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            user ? (
              <Navigate to={userType === 'admin' ? "/dashboard" : "/carer-dashboard"} replace />
            ) : (
              <Suspense fallback={<LoadingScreen />}>
                <ForgotPasswordPage />
              </Suspense>
            )
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            user ? (
              <Navigate to={userType === 'admin' ? "/dashboard" : "/carer-dashboard"} replace />
            ) : (
              <Suspense fallback={<LoadingScreen />}>
                <ResetPasswordPage />
              </Suspense>
            )
          } 
        />
        
        {/* Protected routes */}
        {/* Admin Dashboard */}
        <Route
          path="/dashboard"
          element={
            <AdminProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <DashboardPage />
              </Suspense>
            </AdminProtectedRoute>
          }
        />
        
        {/* Carer Dashboard */}
        <Route
          path="/carer-dashboard"
          element={
            <CarerProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <CarerDashboardPage />
              </Suspense>
            </CarerProtectedRoute>
          }
        />
        
        {/* Carer Daily Tasks */}
        <Route
          path="/carer-dashboard/daily-tasks"
          element={
            <CarerProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <DailyTaskAssessmentPage />
              </Suspense>
            </CarerProtectedRoute>
          }
        />
        
        {/* Carer Personal Progress */}
        <Route
          path="/carer-dashboard/progress"
          element={
            <CarerProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <PersonalProgressPage />
              </Suspense>
            </CarerProtectedRoute>
          }
        />
        
        {/* Carer Available Shifts */}
        <Route
          path="/carer-dashboard/shifts"
          element={
            <CarerProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <AvailableShiftsPage />
              </Suspense>
            </CarerProtectedRoute>
          }
        />
        
        {/* Carer Personal Schedule */}
        <Route
          path="/carer/schedule"
          element={
            <CarerProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <PersonalRotaPage />
              </Suspense>
            </CarerProtectedRoute>
          }
        />
        
        {/* Carer Competency Confirmations */}
        <Route
          path="/carer/confirmations"
          element={
            <CarerProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <CompetencyConfirmationsPage />
              </Suspense>
            </CarerProtectedRoute>
          }
        />
        
        {/* Carer Achievements */}
        <Route
          path="/carer/achievements"
          element={
            <CarerProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <AchievementsPage />
              </Suspense>
            </CarerProtectedRoute>
          }
        />
        
        {/* Admin-only routes */}
        <Route
          path="/users"
          element={
            <AdminProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <UsersPage />
              </Suspense>
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/care-packages"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <CarePackagesPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdf-reports"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <PDFReportsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/shift-sender"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <ShiftSenderPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <TasksPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <AssignmentsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <AssessmentsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/create"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <CreateAssessmentPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/:id/edit"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <EditAssessmentPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recycle-bin"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <RecycleBinPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <ProgressPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress/carer/:carerId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <CarerProgressDetailPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress/assessment-workflow"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <AssessmentWorkflowPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress/manual-management"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <ManualManagementPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress/confirmations"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <ConfirmationManagementPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/:assessmentId/take/:carerId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <TakeAssessmentPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/:assessmentId/edit/:carerId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <TakeAssessmentPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/shift-sender/create"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <ShiftCreationPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/shift-sender/management"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <ShiftManagementPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rota"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <RotaPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <AuditLogPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        
        {/* Redirect root to appropriate dashboard if authenticated */}
        <Route 
          path="/" 
          element={
            <Navigate 
              to={
                user 
                  ? (userType === 'admin' ? "/dashboard" : "/carer-dashboard")
                  : "/login"
              } 
              replace 
            />
          } 
        />
        
        {/* Catch all - redirect to login */}
        <Route 
          path="*" 
          element={<Navigate to="/login" replace />} 
        />
      </Routes>
        </Box>
        {/* Footer - always visible at bottom */}
        <Footer 
          position="static" 
          variant="primary" 
          size="normal" 
          sx={{ 
            flexShrink: 0 // Prevent compression
          }} 
        />
      </Box>
    </PageErrorBoundary>
  )
})

App.displayName = 'App'

export default App