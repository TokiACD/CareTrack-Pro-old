import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AdminUser, Carer } from '@caretrack/shared'
import { authService } from '../services/authService'

interface AuthContextType {
  user: AdminUser | Carer | null
  userType: 'admin' | 'carer' | null
  isAdmin: boolean
  isCarer: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AdminUser | Carer | null>(null)
  const [userType, setUserType] = useState<'admin' | 'carer' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        const response = await authService.verifyToken()
        setUser(response.user)
        setUserType(response.userType)
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      // Only remove token if it's actually invalid (401/403), not on network errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        localStorage.removeItem('authToken')
        setUser(null)
        setUserType(null)
      } else {
        // For network errors, keep the token and retry later
        console.warn('Network error during auth initialization, keeping token for retry')
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password)
      localStorage.setItem('authToken', response.token)
      setUser(response.user)
      setUserType(response.userType)
      
      // Navigate based on user type
      if (response.userType === 'admin') {
        window.location.href = '/dashboard'
      } else {
        window.location.href = '/carer-dashboard'
      }
    } catch (error) {
      console.error('🔑 AuthContext: Login error:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setUser(null)
    setUserType(null)
    authService.logout()
  }

  const refreshUser = async () => {
    try {
      const response = await authService.verifyToken()
      setUser(response.user)
      setUserType(response.userType)
    } catch (error) {
      console.error('User refresh failed:', error)
      logout()
    }
  }

  const value: AuthContextType = {
    user,
    userType,
    isAdmin: userType === 'admin',
    isCarer: userType === 'carer',
    loading,
    login,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}