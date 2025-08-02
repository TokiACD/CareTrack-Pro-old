import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

import { useAuth } from './contexts/AuthContext'
import { LoadingScreen } from './components/common/LoadingScreen'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
import TasksPage from './pages/TasksPage'
import AssignmentsPage from './pages/AssignmentsPage'
import AssessmentsPage from './pages/AssessmentsPage'
import CreateAssessmentPage from './pages/CreateAssessmentPage'
import EditAssessmentPage from './pages/EditAssessmentPage'
import EmailChangeVerification from './pages/EmailChangeVerification'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Box sx={{ height: '100vh' }}>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } 
        />
        <Route 
          path="/invitation/accept" 
          element={<AcceptInvitationPage />} 
        />
        <Route 
          path="/email-change/verify" 
          element={<EmailChangeVerification />} 
        />
        <Route 
          path="/email-change/cancel" 
          element={<EmailChangeVerification />} 
        />
        <Route 
          path="/forgot-password" 
          element={
            user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            user ? <Navigate to="/dashboard" replace /> : <ResetPasswordPage />
          } 
        />
        
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <ProtectedRoute>
              <AssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments"
          element={
            <ProtectedRoute>
              <AssessmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/create"
          element={
            <ProtectedRoute>
              <CreateAssessmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/:id/edit"
          element={
            <ProtectedRoute>
              <EditAssessmentPage />
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
  )
}

export default App