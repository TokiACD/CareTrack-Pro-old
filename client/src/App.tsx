import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

import { useAuth } from './contexts/AuthContext'
import { LoadingScreen } from './components/common/LoadingScreen'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
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