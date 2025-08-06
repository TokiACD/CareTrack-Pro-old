import { AdminUser, API_ENDPOINTS } from '@caretrack/shared'
import { apiService } from './api'

interface LoginResponse {
  user: AdminUser
  token: string
}

interface InviteAdminData {
  email: string
  name: string
}

class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    })
    return response
  }

  async logout(): Promise<void> {
    return apiService.post<void>(API_ENDPOINTS.AUTH.LOGOUT)
  }

  async verifyToken(): Promise<AdminUser> {
    return apiService.get<AdminUser>(API_ENDPOINTS.AUTH.VERIFY_TOKEN)
  }

  async inviteAdmin(data: InviteAdminData): Promise<void> {
    return apiService.post<void>(API_ENDPOINTS.AUTH.INVITE, data)
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken')
  }

  getToken(): string | null {
    return localStorage.getItem('authToken')
  }
}

export const authService = new AuthService()