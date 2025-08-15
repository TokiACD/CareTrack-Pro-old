import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface AdminProtectedRouteProps {
  children: ReactNode
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, userType, loading } = useAuth()

  if (loading) {
    return null // Auth provider will show loading screen
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (userType !== 'admin') {
    // If carer tries to access admin route, redirect to carer dashboard
    return <Navigate to="/carer-dashboard" replace />
  }

  return <>{children}</>
}