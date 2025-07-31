import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiResponse } from '@caretrack/shared'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001'),
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
    const response = error.response?.data as ApiResponse
    
    if (response?.error) {
      return response.error
    }
    
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.'
    }
    
    if (error.code === 'ERR_NETWORK') {
      return 'Network error. Please check your connection.'
    }
    
    return error.message || 'An unexpected error occurred'
  }

  // Generic request methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.api.get<ApiResponse<T>>(url, { params })
    return response.data.data!
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<ApiResponse<T>>(url, data)
    return response.data.data!
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<ApiResponse<T>>(url, data)
    return response.data.data!
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.patch<ApiResponse<T>>(url, data)
    return response.data.data!
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete<ApiResponse<T>>(url)
    return response.data.data!
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
}

export const apiService = new ApiService()