import { 
  ApiResponse,
  AdminUser,
  Carer,
  CarePackage,
  Task,
  Assessment,
  AssessmentResponse,
  DashboardSummary
} from '@caretrack/shared'

// Base type guard for API responses
export function isApiResponse<T>(data: unknown): data is ApiResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    typeof (data as any).success === 'boolean'
  )
}

// Type guard for successful API response
export function isSuccessfulApiResponse<T>(data: unknown): data is ApiResponse<T> & { success: true; data: T } {
  return (
    isApiResponse<T>(data) &&
    data.success === true &&
    'data' in data &&
    data.data !== undefined
  )
}

// Type guard for failed API response  
export function isFailedApiResponse(data: unknown): data is ApiResponse<never> & { success: false; error: string } {
  return (
    isApiResponse<never>(data) &&
    data.success === false &&
    'error' in data &&
    typeof (data as any).error === 'string'
  )
}

// Generic array type guard
export function isArray<T>(data: unknown, itemGuard: (item: unknown) => item is T): data is T[] {
  return Array.isArray(data) && data.every(itemGuard)
}

// String validation
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

// Number validation
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

// Date validation (accepts both Date objects and ISO strings)
export function isValidDate(value: unknown): value is Date | string {
  if (value instanceof Date) {
    return !isNaN(value.getTime())
  }
  if (typeof value === 'string') {
    const date = new Date(value)
    return !isNaN(date.getTime())
  }
  return false
}

// More strict date validation that only accepts valid dates
export function isValidDateValue(value: unknown): boolean {
  if (value === null || value === undefined) return true // Allow nullable dates
  return isValidDate(value)
}

// Entity-specific type guards with date validation
export function isAdminUser(data: unknown): data is AdminUser {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data &&
    'name' in data &&
    'createdAt' in data &&
    'updatedAt' in data &&
    isString((data as any).id) &&
    isString((data as any).email) &&
    isString((data as any).name) &&
    isValidDate((data as any).createdAt) &&
    isValidDate((data as any).updatedAt) &&
    isValidDateValue((data as any).deletedAt) &&
    isValidDateValue((data as any).lastLogin)
  )
}

export function isCarer(data: unknown): data is Carer {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data &&
    'name' in data &&
    'createdAt' in data &&
    'updatedAt' in data &&
    isString((data as any).id) &&
    isString((data as any).email) &&
    isString((data as any).name) &&
    isValidDate((data as any).createdAt) &&
    isValidDate((data as any).updatedAt) &&
    isValidDateValue((data as any).deletedAt)
  )
}

export function isCarePackage(data: unknown): data is CarePackage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'postcode' in data &&
    'createdAt' in data &&
    'updatedAt' in data &&
    isString((data as any).id) &&
    isString((data as any).name) &&
    isString((data as any).postcode) &&
    isValidDate((data as any).createdAt) &&
    isValidDate((data as any).updatedAt) &&
    isValidDateValue((data as any).deletedAt)
  )
}

export function isTask(data: unknown): data is Task {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'targetCount' in data &&
    'createdAt' in data &&
    'updatedAt' in data &&
    isString((data as any).id) &&
    isString((data as any).name) &&
    isNumber((data as any).targetCount) &&
    isValidDate((data as any).createdAt) &&
    isValidDate((data as any).updatedAt) &&
    isValidDateValue((data as any).deletedAt)
  )
}

export function isAssessment(data: unknown): data is Assessment {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    isString((data as any).id) &&
    isString((data as any).name)
  )
}

export function isAssessmentResponse(data: unknown): data is AssessmentResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'assessmentId' in data &&
    'carerId' in data &&
    isString((data as any).id) &&
    isString((data as any).assessmentId) &&
    isString((data as any).carerId)
  )
}

export function isDashboardSummary(data: unknown): data is DashboardSummary {
  return (
    typeof data === 'object' &&
    data !== null &&
    'totalAdminUsers' in data &&
    'totalCarers' in data &&
    'totalCarePackages' in data &&
    'totalTasks' in data &&
    isNumber((data as any).totalAdminUsers) &&
    isNumber((data as any).totalCarers) &&
    isNumber((data as any).totalCarePackages) &&
    isNumber((data as any).totalTasks)
  )
}

// RecycleBinSummary and ProgressSummary type guards removed - types not available in shared package

// Type guard for carer progress detail
export function isCarerProgressDetail(data: unknown): data is {
  carer: { id: string; name: string; email: string; isActive: boolean };
  packages: any[];
  competencyRatings: any[];
} {
  return (
    typeof data === 'object' &&
    data !== null &&
    'carer' in data &&
    'packages' in data &&
    'competencyRatings' in data &&
    typeof (data as any).carer === 'object' &&
    (data as any).carer !== null &&
    'id' in (data as any).carer &&
    'name' in (data as any).carer &&
    'email' in (data as any).carer &&
    isString((data as any).carer.id) &&
    isString((data as any).carer.name) &&
    isString((data as any).carer.email) &&
    Array.isArray((data as any).packages) &&
    Array.isArray((data as any).competencyRatings)
  )
}

// Type guard for assessment history
export function isAssessmentHistory(data: unknown): data is {
  carer: { id: string; name: string; email: string };
  assessments: any[];
} {
  return (
    typeof data === 'object' &&
    data !== null &&
    'carer' in data &&
    'assessments' in data &&
    typeof (data as any).carer === 'object' &&
    (data as any).carer !== null &&
    'id' in (data as any).carer &&
    isString((data as any).carer.id) &&
    Array.isArray((data as any).assessments)
  )
}

// Paginated response type guard
export function isPaginatedResponse<T>(
  data: unknown, 
  itemGuard: (item: unknown) => item is T
): data is { data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'pagination' in data &&
    isArray((data as any).data, itemGuard) &&
    typeof (data as any).pagination === 'object' &&
    isNumber((data as any).pagination.page) &&
    isNumber((data as any).pagination.limit) &&
    isNumber((data as any).pagination.total) &&
    isNumber((data as any).pagination.totalPages)
  )
}

// Safe API data extraction with type guards
export function extractApiData<T>(
  response: unknown, 
  typeGuard: (data: unknown) => data is T
): T {
  if (!isSuccessfulApiResponse<T>(response)) {
    throw new Error('Invalid API response format')
  }
  
  if (!typeGuard(response.data)) {
    throw new Error('API response data does not match expected type')
  }
  
  return response.data
}

// Safe array extraction from API response
export function extractApiArray<T>(
  response: unknown,
  itemGuard: (item: unknown) => item is T
): T[] {
  if (!isSuccessfulApiResponse<T[]>(response)) {
    throw new Error('Invalid API response format')
  }
  
  if (!isArray(response.data, itemGuard)) {
    throw new Error('API response data is not a valid array of expected type')
  }
  
  return response.data
}

// Safe paginated data extraction
export function extractPaginatedData<T>(
  response: unknown,
  itemGuard: (item: unknown) => item is T
): { data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } } {
  if (!isSuccessfulApiResponse(response)) {
    throw new Error('Invalid API response format')
  }
  
  if (!isPaginatedResponse(response.data, itemGuard)) {
    throw new Error('API response is not a valid paginated response')
  }
  
  return response.data
}

// Error handling utility
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message)
  }
  
  return 'An unexpected error occurred'
}