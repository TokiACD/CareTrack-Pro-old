// Date utility functions for consistent Date/string handling

// Type for dates that can be either Date objects or ISO strings from API
export type DateLike = Date | string | null | undefined

// Convert ISO string or Date to Date object, handling null/undefined
export function parseDate(date: DateLike): Date | null {
  if (!date) return null
  
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date
  }
  
  if (typeof date === 'string') {
    const parsed = new Date(date)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  
  return null
}

// Convert Date to ISO string for API requests
export function serializeDate(date: DateLike): string | null {
  const parsedDate = parseDate(date)
  return parsedDate ? parsedDate.toISOString() : null
}

// Safe date formatting that handles both Date and string inputs
export function formatDate(date: DateLike, options?: Intl.DateTimeFormatOptions): string {
  const parsedDate = parseDate(date)
  
  if (!parsedDate) {
    return 'Invalid Date'
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }
  
  try {
    return parsedDate.toLocaleDateString('en-GB', defaultOptions)
  } catch (error) {
    return parsedDate.toLocaleDateString()
  }
}

// Format date and time together
export function formatDateTime(date: DateLike, options?: Intl.DateTimeFormatOptions): string {
  const parsedDate = parseDate(date)
  
  if (!parsedDate) {
    return 'Invalid Date'
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }
  
  try {
    return parsedDate.toLocaleString('en-GB', defaultOptions)
  } catch (error) {
    return parsedDate.toLocaleString()
  }
}

// Format relative time (e.g., "2 hours ago", "3 days ago")
export function formatRelativeTime(date: DateLike): string {
  const parsedDate = parseDate(date)
  
  if (!parsedDate) {
    return 'Invalid Date'
  }
  
  const now = new Date()
  const diffMs = now.getTime() - parsedDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)
  
  if (diffMinutes < 1) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
  } else {
    return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
  }
}

// Check if a date is today
export function isToday(date: DateLike): boolean {
  const parsedDate = parseDate(date)
  if (!parsedDate) return false
  
  const today = new Date()
  return (
    parsedDate.getFullYear() === today.getFullYear() &&
    parsedDate.getMonth() === today.getMonth() &&
    parsedDate.getDate() === today.getDate()
  )
}

// Check if a date is within the last N days
export function isWithinDays(date: DateLike, days: number): boolean {
  const parsedDate = parseDate(date)
  if (!parsedDate) return false
  
  const now = new Date()
  const diffMs = now.getTime() - parsedDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  
  return diffDays >= 0 && diffDays <= days
}

// Get start of day for date comparisons
export function startOfDay(date: DateLike): Date | null {
  const parsedDate = parseDate(date)
  if (!parsedDate) return null
  
  const result = new Date(parsedDate)
  result.setHours(0, 0, 0, 0)
  return result
}

// Get end of day for date comparisons
export function endOfDay(date: DateLike): Date | null {
  const parsedDate = parseDate(date)
  if (!parsedDate) return null
  
  const result = new Date(parsedDate)
  result.setHours(23, 59, 59, 999)
  return result
}

// Add days to a date
export function addDays(date: DateLike, days: number): Date | null {
  const parsedDate = parseDate(date)
  if (!parsedDate) return null
  
  const result = new Date(parsedDate)
  result.setDate(result.getDate() + days)
  return result
}

// Subtract days from a date
export function subtractDays(date: DateLike, days: number): Date | null {
  return addDays(date, -days)
}

// Convert date to input value format (YYYY-MM-DD)
export function toInputDateValue(date: DateLike): string {
  const parsedDate = parseDate(date)
  if (!parsedDate) return ''
  
  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

// Convert date to time input value format (HH:MM)
export function toInputTimeValue(date: DateLike): string {
  const parsedDate = parseDate(date)
  if (!parsedDate) return ''
  
  const hours = String(parsedDate.getHours()).padStart(2, '0')
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0')
  
  return `${hours}:${minutes}`
}

// Parse input date value (YYYY-MM-DD) to Date
export function fromInputDateValue(value: string): Date | null {
  if (!value) return null
  
  const date = new Date(value + 'T00:00:00.000Z')
  return isNaN(date.getTime()) ? null : date
}

// Normalize API dates by converting string dates to Date objects
export function normalizeApiDates<T extends Record<string, any>>(obj: T, dateFields: (keyof T)[]): T {
  if (!obj || typeof obj !== 'object') return obj
  
  const normalized = { ...obj }
  
  for (const field of dateFields) {
    if (field in normalized && normalized[field]) {
      const parsedDate = parseDate(normalized[field] as DateLike)
      if (parsedDate) {
        normalized[field] = parsedDate as T[keyof T]
      }
    }
  }
  
  return normalized
}

// Deep normalize dates in an array of objects
export function normalizeApiDatesInArray<T extends Record<string, any>>(
  array: T[], 
  dateFields: (keyof T)[]
): T[] {
  if (!Array.isArray(array)) return array
  
  return array.map(item => normalizeApiDates(item, dateFields))
}

// Date validation
export function isValidDate(date: DateLike): boolean {
  const parsedDate = parseDate(date)
  return parsedDate !== null
}

// Get current timestamp as ISO string
export function now(): string {
  return new Date().toISOString()
}

// Get current date without time
export function today(): Date {
  return startOfDay(new Date())!
}