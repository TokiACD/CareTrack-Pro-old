import { 
  AdminUser, 
  Carer, 
  CarePackage, 
  Task, 
  Assessment, 
  AssessmentResponse,
  DashboardSummary
} from '@caretrack/shared'
import { apiService } from './api'
import { 
  extractApiData, 
  extractApiArray, 
  extractPaginatedData,
  isAdminUser,
  isCarer,
  isCarePackage,
  isTask,
  isAssessment,
  isAssessmentResponse,
  isDashboardSummary
} from '../utils/typeGuards'
import { 
  normalizeAdminUser,
  normalizeCarer,
  normalizeCarePackage,
  normalizeAdminUsers,
  normalizeCarers,
  normalizeCarePackages,
  NormalizedAdminUser,
  NormalizedCarer,
  NormalizedCarePackage
} from './dataNormalizationService'

// Type-safe API service wrapper with runtime validation
export class TypedApiService {
  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiService.getFullResponse('/api/dashboard/summary')
    return extractApiData(response, isDashboardSummary)
  }

  // Admin Users (with normalized dates)
  async getAdminUsers(): Promise<NormalizedAdminUser[]> {
    const response = await apiService.getFullResponse('/api/admin-users')
    const users = extractApiArray(response, isAdminUser)
    return normalizeAdminUsers(users)
  }

  async getAdminUser(id: string): Promise<NormalizedAdminUser> {
    const response = await apiService.getFullResponse(`/api/admin-users/${id}`)
    const user = extractApiData(response, isAdminUser)
    return normalizeAdminUser(user)
  }

  async createAdminUser(data: Partial<AdminUser>): Promise<NormalizedAdminUser> {
    const response = await apiService.post('/api/admin-users', data)
    if (!isAdminUser(response)) {
      throw new Error('Invalid admin user data received from server')
    }
    return normalizeAdminUser(response)
  }

  async updateAdminUser(id: string, data: Partial<AdminUser>): Promise<NormalizedAdminUser> {
    const response = await apiService.put(`/api/admin-users/${id}`, data)
    if (!isAdminUser(response)) {
      throw new Error('Invalid admin user data received from server')
    }
    return normalizeAdminUser(response)
  }

  // Carers (with normalized dates)
  async getCarers(): Promise<NormalizedCarer[]> {
    const response = await apiService.getFullResponse('/api/carers')
    const carers = extractApiArray(response, isCarer)
    return normalizeCarers(carers)
  }

  async getCarer(id: string): Promise<NormalizedCarer> {
    const response = await apiService.getFullResponse(`/api/carers/${id}`)
    const carer = extractApiData(response, isCarer)
    return normalizeCarer(carer)
  }

  async createCarer(data: Partial<Carer>): Promise<NormalizedCarer> {
    const response = await apiService.post('/api/carers', data)
    if (!isCarer(response)) {
      throw new Error('Invalid carer data received from server')
    }
    return normalizeCarer(response)
  }

  async updateCarer(id: string, data: Partial<Carer>): Promise<NormalizedCarer> {
    const response = await apiService.put(`/api/carers/${id}`, data)
    if (!isCarer(response)) {
      throw new Error('Invalid carer data received from server')
    }
    return normalizeCarer(response)
  }

  // Care Packages (with normalized dates)
  async getCarePackages(): Promise<NormalizedCarePackage[]> {
    const response = await apiService.getFullResponse('/api/care-packages')
    const packages = extractApiArray(response, isCarePackage)
    return normalizeCarePackages(packages)
  }

  async getCarePackage(id: string): Promise<NormalizedCarePackage> {
    const response = await apiService.getFullResponse(`/api/care-packages/${id}`)
    const package_ = extractApiData(response, isCarePackage)
    return normalizeCarePackage(package_)
  }

  async createCarePackage(data: Partial<CarePackage>): Promise<NormalizedCarePackage> {
    const response = await apiService.post('/api/care-packages', data)
    if (!isCarePackage(response)) {
      throw new Error('Invalid care package data received from server')
    }
    return normalizeCarePackage(response)
  }

  async updateCarePackage(id: string, data: Partial<CarePackage>): Promise<NormalizedCarePackage> {
    const response = await apiService.put(`/api/care-packages/${id}`, data)
    if (!isCarePackage(response)) {
      throw new Error('Invalid care package data received from server')
    }
    return normalizeCarePackage(response)
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    const response = await apiService.getFullResponse('/api/tasks')
    return extractApiArray(response, isTask)
  }

  async getTask(id: string): Promise<Task> {
    const response = await apiService.getFullResponse(`/api/tasks/${id}`)
    return extractApiData(response, isTask)
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const response = await apiService.post('/api/tasks', data)
    if (!isTask(response)) {
      throw new Error('Invalid task data received from server')
    }
    return response
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const response = await apiService.put(`/api/tasks/${id}`, data)
    if (!isTask(response)) {
      throw new Error('Invalid task data received from server')
    }
    return response
  }

  // Assessments
  async getAssessments(): Promise<Assessment[]> {
    const response = await apiService.getFullResponse('/api/assessments')
    return extractApiArray(response, isAssessment)
  }

  async getAssessment(id: string): Promise<Assessment> {
    const response = await apiService.getFullResponse(`/api/assessments/${id}`)
    return extractApiData(response, isAssessment)
  }

  async createAssessment(data: Partial<Assessment>): Promise<Assessment> {
    const response = await apiService.post('/api/assessments', data)
    if (!isAssessment(response)) {
      throw new Error('Invalid assessment data received from server')
    }
    return response
  }

  async updateAssessment(id: string, data: Partial<Assessment>): Promise<Assessment> {
    const response = await apiService.put(`/api/assessments/${id}`, data)
    if (!isAssessment(response)) {
      throw new Error('Invalid assessment data received from server')
    }
    return response
  }

  // Assessment Responses
  async getAssessmentResponses(assessmentId: string): Promise<AssessmentResponse[]> {
    const response = await apiService.getFullResponse(`/api/assessments/${assessmentId}/responses`)
    return extractApiArray(response, isAssessmentResponse)
  }

  async getAssessmentResponse(responseId: string): Promise<AssessmentResponse> {
    const response = await apiService.getFullResponse(`/api/assessments/responses/${responseId}`)
    return extractApiData(response, isAssessmentResponse)
  }

  async submitAssessmentResponse(assessmentId: string, data: any): Promise<AssessmentResponse> {
    const response = await apiService.post(`/api/assessments/${assessmentId}/response`, data)
    if (!isAssessmentResponse(response)) {
      throw new Error('Invalid assessment response data received from server')
    }
    return response
  }

  // Progress and Recycle Bin methods removed - types not available in shared package

  // Generic paginated data fetching
  async getPaginatedData<T>(
    url: string,
    typeGuard: (item: unknown) => item is T,
    params?: any
  ): Promise<{ data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const response = await apiService.getFullResponse(url, params)
    return extractPaginatedData(response, typeGuard)
  }

  // Safe generic data fetching
  async getSafeData<T>(
    url: string,
    typeGuard: (data: unknown) => data is T,
    params?: any
  ): Promise<T> {
    const response = await apiService.getFullResponse(url, params)
    return extractApiData(response, typeGuard)
  }

  // Safe array data fetching
  async getSafeArray<T>(
    url: string,
    itemGuard: (item: unknown) => item is T,
    params?: any
  ): Promise<T[]> {
    const response = await apiService.getFullResponse(url, params)
    return extractApiArray(response, itemGuard)
  }
}

export const typedApiService = new TypedApiService()