import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiResponse } from '@caretrack/shared'
import { isSuccessfulApiResponse, isFailedApiResponse, handleApiError } from '../utils/typeGuards'
import { logger } from './logger'

class ApiService {
  private api: AxiosInstance
  private requestCache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 100
  private csrfToken: string | null = null

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '', // Empty for proxy to work
      timeout: 30000, // Increased timeout for better UX
      headers: {
        'Content-Type': 'application/json',
      },
      // Enable compression
      decompress: true,
    })

    this.setupInterceptors()
    this.setupRequestCaching()
    this.initializeCSRF()
  }

  private async initializeCSRF() {
    try {
      const response = await fetch('/api/csrf-token')
      const data = await response.json()
      if (data.success && data.token) {
        this.csrfToken = data.token
        logger.debug('CSRF token initialized', { tokenLength: data.token.length }, 'api')
      }
    } catch (error) {
      logger.warn('Failed to initialize CSRF token:', error, 'api')
    }
  }

  private async ensureCSRFToken(): Promise<void> {
    if (this.csrfToken) return
    
    try {
      const response = await fetch('/api/csrf-token')
      const data = await response.json()
      if (data.success && data.token) {
        this.csrfToken = data.token
        logger.debug('CSRF token fetched on demand', { tokenLength: data.token.length }, 'api')
      }
    } catch (error) {
      logger.warn('Failed to fetch CSRF token:', error, 'api')
    }
  }

  private setupInterceptors() {
    // Request interceptor to add auth token, request ID, and logging
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        // Add CSRF token for non-GET requests
        if (config.method !== 'get') {
          if (!this.csrfToken) {
            // If no CSRF token, try to get it synchronously
            return this.ensureCSRFToken().then(() => {
              if (this.csrfToken) {
                config.headers['x-csrf-token'] = this.csrfToken
              }
              return config
            })
          } else {
            config.headers['x-csrf-token'] = this.csrfToken
          }
        }
        
        // Add request timing headers (browser handles compression automatically)
        config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Add cache control for GET requests
        if (config.method === 'get') {
          config.headers['Cache-Control'] = 'max-age=300' // 5 minutes
        }
        
        // Add start time for performance tracking
        ;(config as any).metadata = { startTime: performance.now() }
        
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          headers: Object.keys(config.headers || {}),
          params: config.params
        }, 'api')
        
        return config
      },
      (error) => {
        logger.error('Request interceptor error:', error, 'api')
        return Promise.reject(error)
      }
    )

    // Response interceptor to handle errors, caching, and logging
    this.api.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const startTime = (response.config as any).metadata?.startTime || 0
        const duration = performance.now() - startTime
        
        // Log API call performance
        logger.logApiCall(
          response.config.url || '',
          response.config.method?.toUpperCase() || 'UNKNOWN',
          duration,
          response.status
        )
        
        // Cache successful GET responses
        if (response.config.method === 'get' && response.status === 200) {
          this.cacheResponse(response.config, response.data)
        }
        
        return response
      },
      async (error: AxiosError) => {
        // Calculate request duration for failed requests
        const startTime = (error.config as any)?.metadata?.startTime || 0
        const duration = performance.now() - startTime
        
        // Log API error
        logger.logApiCall(
          error.config?.url || '',
          error.config?.method?.toUpperCase() || 'UNKNOWN',
          duration,
          error.response?.status || 0,
          error.message
        )
        
        // Handle CSRF token errors with automatic refresh
        if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
          logger.warn('CSRF token invalid, refreshing token', {}, 'api')
          
          // Clear the invalid token
          this.csrfToken = null
          
          // Fetch a new token
          try {
            await this.ensureCSRFToken()
            
            // Retry the original request with the new token
            if (error.config && this.csrfToken) {
              logger.debug('Retrying request with new CSRF token', {}, 'api')
              error.config.headers['x-csrf-token'] = this.csrfToken
              return this.api.request(error.config)
            }
          } catch (tokenError) {
            logger.error('Failed to refresh CSRF token:', tokenError, 'api')
          }
        }
        
        // Handle different error types with retry logic
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken')
          logger.warn('Authentication expired, redirecting to login', {}, 'auth')
          // Use replace instead of direct assignment for better UX
          window.location.replace('/login')
        }
        
        // Handle timeout errors with user-friendly messages
        if (error.code === 'ECONNABORTED') {
          logger.warn('Request timeout, consider retrying', {
            url: error.config?.url,
            timeout: error.config?.timeout
          }, 'api')
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

  private setupRequestCaching() {
    // Clean cache periodically
    setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.requestCache.entries()) {
        if (now - value.timestamp > this.CACHE_DURATION) {
          this.requestCache.delete(key)
        }
      }
    }, 60000) // Clean every minute
  }

  private getCacheKey(url: string, params?: Record<string, unknown>): string {
    return `${url}${params ? '?' + new URLSearchParams(params as any).toString() : ''}`
  }

  private cacheResponse(config: any, data: any) {
    if (this.requestCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = this.requestCache.keys().next().value
      this.requestCache.delete(firstKey)
    }
    
    const cacheKey = this.getCacheKey(config.url, config.params)
    this.requestCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
  }

  private getCachedResponse<T>(url: string, params?: Record<string, unknown>): T | null {
    const cacheKey = this.getCacheKey(url, params)
    const cached = this.requestCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }
    
    return null
  }

  // Generic request methods with type guards and caching
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    // Check cache first
    const cached = this.getCachedResponse<ApiResponse<T>>(url, params)
    if (cached && isSuccessfulApiResponse<T>(cached)) {
      logger.debug(`Cache hit for: GET ${url}`, { params }, 'api')
      return cached.data
    }
    
    try {
      const response = await this.api.get<ApiResponse<T>>(url, { params })
      
      if (!isSuccessfulApiResponse<T>(response.data)) {
        throw new Error(`Invalid API response from ${url}`)
      }
      
      return response.data.data
    } catch (error) {
      logger.error(`GET request failed: ${url}`, {
        params,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'api')
      throw error
    }
  }

  async post<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    // Clear related cache entries on mutations
    this.clearRelatedCache(url)
    
    const response = await this.api.post<ApiResponse<T>>(url, data)
    
    if (!isSuccessfulApiResponse<T>(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data.data
  }

  async put<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    // Clear related cache entries on mutations
    this.clearRelatedCache(url)
    
    const response = await this.api.put<ApiResponse<T>>(url, data)
    
    if (!isSuccessfulApiResponse<T>(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data.data
  }

  async patch<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    // Clear related cache entries on mutations
    this.clearRelatedCache(url)
    
    const response = await this.api.patch<ApiResponse<T>>(url, data)
    
    if (!isSuccessfulApiResponse<T>(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data.data
  }

  async delete<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    try {
      // Clear related cache entries on mutations
      this.clearRelatedCache(url)
      
      const response = await this.api.delete<ApiResponse<T>>(url, { data })
      
      if (!isSuccessfulApiResponse<T>(response.data)) {
        throw new Error(`Invalid API response from ${url}`)
      }
      
      return response.data.data
    } catch (error: unknown) {
      throw error;
    }
  }

  private clearRelatedCache(url: string) {
    // Clear cache entries that might be related to this mutation
    const baseUrl = url.split('/').slice(0, -1).join('/')
    const keysToDelete: string[] = []
    
    for (const key of this.requestCache.keys()) {
      if (key.includes(baseUrl)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.requestCache.delete(key))
  }

  async deleteWithResponse<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    this.clearRelatedCache(url)
    const response = await this.api.delete<ApiResponse<T>>(url, { data })
    return response.data
  }

  // Batch request method for better performance
  async batchRequests<T>(requests: Array<{ method: 'get' | 'post' | 'put' | 'delete', url: string, data?: any }>): Promise<T[]> {
    const promises = requests.map(req => {
      switch (req.method) {
        case 'get':
          return this.get(req.url, req.data)
        case 'post':
          return this.post(req.url, req.data)
        case 'put':
          return this.put(req.url, req.data)
        case 'delete':
          return this.delete(req.url, req.data)
        default:
          throw new Error(`Unsupported method: ${req.method}`)
      }
    })
    
    return Promise.all(promises)
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

  // Get full response (for cases like pagination) with caching
  async getFullResponse<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    // Check cache first
    const cached = this.getCachedResponse<ApiResponse<T>>(url, params)
    if (cached && (isSuccessfulApiResponse<T>(cached) || isFailedApiResponse(cached))) {
      return cached
    }
    
    const response = await this.api.get<ApiResponse<T>>(url, { params })
    
    if (!isSuccessfulApiResponse<T>(response.data) && !isFailedApiResponse(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data
  }

  // Post with full response (for cases like violation reporting)
  async postWithFullResponse<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    this.clearRelatedCache(url)
    const response = await this.api.post<ApiResponse<T>>(url, data)
    
    if (!isSuccessfulApiResponse<T>(response.data) && !isFailedApiResponse(response.data)) {
      throw new Error(`Invalid API response from ${url}`)
    }
    
    return response.data
  }

  // Clear cache manually when needed
  clearCache(pattern?: string) {
    if (pattern) {
      const keysToDelete: string[] = []
      for (const key of this.requestCache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach(key => this.requestCache.delete(key))
    } else {
      this.requestCache.clear()
    }
  }

  // Get cache statistics for monitoring
  getCacheStats() {
    return {
      size: this.requestCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // Would need to track hits/misses for actual calculation
      duration: this.CACHE_DURATION
    }
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