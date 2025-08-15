import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface CarerProtectedRouteProps {
  children: ReactNode
}

export function CarerProtectedRoute({ children }: CarerProtectedRouteProps) {
  const { user, userType, loading } = useAuth()

  if (loading) {
    return null // Auth provider will show loading screen
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (userType !== 'carer') {
    // If admin tries to access carer route, redirect to admin dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}