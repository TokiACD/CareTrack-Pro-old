import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiResponse } from '@caretrack/shared'
import { isSuccessfulApiResponse, isFailedApiResponse, handleApiError } from '../utils/typeGuards'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken')
          window.location.href = '/login'
        }

        // Transform error to our standard format
        const errorMessage = this.extractErrorMessage(error)
        return Promise.reject(new Error(errorMessage))
      }
    )
  }

  private extractErrorMessage(error: AxiosError): string {
    const response = error.response?.data
    
    if (isFailedApiResponse(response)) {
      return response.error
    }
    
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.'
    }
    
    if (error.code === 'ERR_NETWORK') {
      return 'Network error. Please check your connection.'
    }
    
    return handleApiError(error)
  }

  // Generic request methods with type guards
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.api.get<ApiResponse<T>>(url, { params })
    
    if (!isSuccessfulApiResponse<T>(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data.data
  }

  async post<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.api.post<ApiResponse<T>>(url, data)
    
    if (!isSuccessfulApiResponse<T>(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data.data
  }

  async put<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.api.put<ApiResponse<T>>(url, data)
    
    if (!isSuccessfulApiResponse<T>(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data.data
  }

  async patch<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.api.patch<ApiResponse<T>>(url, data)
    
    if (!isSuccessfulApiResponse<T>(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data.data
  }

  async delete<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(url, { data })
      
      if (!isSuccessfulApiResponse<T>(response.data)) {
        throw new Error(`Invalid API response from ${url}`)
      }
      
      return response.data.data
    } catch (error: unknown) {
      throw error;
    }
  }

  async deleteWithResponse<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const response = await this.api.delete<ApiResponse<T>>(url, { data })
    return response.data
  }

  // File upload
  async uploadFile<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.api.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data.data!
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.api.get(url, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
  }

  // Get full response (for cases like pagination)
  async getFullResponse<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const response = await this.api.get<ApiResponse<T>>(url, { params })
    
    if (!isSuccessfulApiResponse<T>(response.data) && !isFailedApiResponse(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data
  }

  // Post with full response (for cases like violation reporting)
  async postWithFullResponse<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const response = await this.api.post<ApiResponse<T>>(url, data)
    
    if (!isSuccessfulApiResponse<T>(response.data) && !isFailedApiResponse(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data
  }

  // Draft Assessment Management
  async getDraftResponse<T>(assessmentId: string, carerId: string): Promise<T | null> {
    try {
      const response = await this.api.get<ApiResponse<T>>(`/api/assessments/${assessmentId}/carer/${carerId}/draft`)
      return response.data.data || null
    } catch (error: unknown) {
      // Return null if draft doesn't exist (404)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } }
        if (axiosError.response?.status === 404) {
          return null
        }
      }
      throw error
    }
  }

  async saveDraftResponse<T>(assessmentId: string, carerId: string, draftData: Record<string, unknown>): Promise<T> {
    const response = await this.api.post<ApiResponse<T>>(`/api/assessments/${assessmentId}/carer/${carerId}/draft`, {
      draftData
    })
    return response.data.data!
  }

  async deleteDraftResponse(assessmentId: string, carerId: string): Promise<void> {
    await this.api.delete(`/api/assessments/${assessmentId}/carer/${carerId}/draft`)
  }

  // Assessment Response Management
  async getAssessmentResponseById<T>(responseId: string): Promise<T> {
    const response = await this.api.get<ApiResponse<T>>(`/api/assessments/responses/${responseId}`)
    return response.data.data!
  }

  async updateAssessmentResponse<T>(responseId: string, data: Record<string, unknown>): Promise<T> {
    const response = await this.api.put<ApiResponse<T>>(`/api/assessments/responses/${responseId}`, data)
    return response.data.data!
  }
}

export const apiService = new ApiService()