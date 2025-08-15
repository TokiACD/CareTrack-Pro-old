import React, { Suspense, memo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

import { useAuth } from './contexts/AuthContext'
import { LoadingScreen } from './components/common/LoadingScreen'
import { Footer } from './components/common/Footer'
import { PageErrorBoundary } from './components/common/ErrorBoundary'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

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

const App = memo(() => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <PageErrorBoundary>
      <Box sx={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column',
        // Prevent horizontal scrolling
        overflowX: 'hidden'
      }}>
        <Box sx={{ 
          flex: 1,
          // Smooth scrolling for better UX
          scrollBehavior: 'smooth',
          // Ensure proper touch scrolling on mobile
          WebkitOverflowScrolling: 'touch'
        }}>
          <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/dashboard" replace /> : (
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
            user ? <Navigate to="/dashboard" replace /> : (
              <Suspense fallback={<LoadingScreen />}>
                <ForgotPasswordPage />
              </Suspense>
            )
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            user ? <Navigate to="/dashboard" replace /> : (
              <Suspense fallback={<LoadingScreen />}>
                <ResetPasswordPage />
              </Suspense>
            )
          } 
        />
        
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <DashboardPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <UsersPage />
              </Suspense>
            </ProtectedRoute>
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
        
        {/* Redirect root to login if not authenticated */}
        <Route 
          path="/" 
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
        />
        
        {/* Catch all - redirect to login */}
        <Route 
          path="*" 
          element={<Navigate to="/login" replace />} 
        />
      </Routes>
        </Box>
        <Footer 
          position="static" 
          variant="primary" 
          size="normal" 
          sx={{ 
            flexShrink: 0,
            mt: 'auto'
          }} 
        />
      </Box>
    </PageErrorBoundary>
  )
})

App.displayName = 'App'

export default App