// Error handling utilities for CareTrack Pro

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
  status?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormError {
  [fieldName: string]: string;
}

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION', 
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

// Error classification
export function classifyError(error: any): ErrorType {
  if (!error?.response) {
    return ErrorType.NETWORK;
  }
  
  const status = error.response.status;
  
  switch (status) {
    case 400:
      return error.response.data?.validation ? ErrorType.VALIDATION : ErrorType.UNKNOWN;
    case 401:
      return ErrorType.AUTHENTICATION;
    case 403:
      return ErrorType.AUTHORIZATION;
    case 404:
      return ErrorType.NOT_FOUND;
    case 409:
      return ErrorType.CONFLICT;
    case 422:
      return ErrorType.VALIDATION;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
}

// Extract user-friendly error message
export function extractErrorMessage(error: any, fallback = 'An unexpected error occurred'): string {
  // Check for API response error
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Check for API response message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Check for axios error message
  if (error?.message) {
    // Network errors
    if (error.message.includes('Network Error')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    
    // Timeout errors
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    return error.message;
  }
  
  // Check for validation errors
  if (error?.response?.data?.validation) {
    const validationErrors = error.response.data.validation;
    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      return validationErrors[0].message || 'Validation failed';
    }
  }
  
  return fallback;
}

// Extract validation errors for forms
export function extractValidationErrors(error: any): FormError {
  const formErrors: FormError = {};
  
  if (error?.response?.data?.validation) {
    const validationErrors = error.response.data.validation;
    
    if (Array.isArray(validationErrors)) {
      validationErrors.forEach((validationError: ValidationError) => {
        if (validationError.field && validationError.message) {
          formErrors[validationError.field] = validationError.message;
        }
      });
    } else if (typeof validationErrors === 'object') {
      // Handle object-based validation errors
      Object.entries(validationErrors).forEach(([field, message]) => {
        if (typeof message === 'string') {
          formErrors[field] = message;
        } else if (Array.isArray(message) && message.length > 0) {
          formErrors[field] = message[0];
        }
      });
    }
  }
  
  return formErrors;
}

// Create standardized error object
export function createError(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  details?: Record<string, any>
): ApiError {
  return {
    message,
    code: type,
    details
  };
}

// Retry utility for failed operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain error types
      const errorType = classifyError(error);
      if (
        errorType === ErrorType.AUTHENTICATION ||
        errorType === ErrorType.AUTHORIZATION ||
        errorType === ErrorType.VALIDATION ||
        errorType === ErrorType.NOT_FOUND
      ) {
        throw error;
      }
      
      // Don't delay on the last attempt
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

// Error boundary error handler
export function handleGlobalError(error: Error, errorInfo?: any): void {
  console.error('Global error caught:', error, errorInfo);
  
  // Log to error reporting service in production
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error reporting service
    // errorReportingService.captureException(error, { extra: errorInfo });
  }
}

// Form error helpers
export function hasFormErrors(errors: FormError): boolean {
  return Object.keys(errors).length > 0;
}

export function getFirstError(errors: FormError): string | null {
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : null;
}

export function clearFormError(errors: FormError, field: string): FormError {
  const newErrors = { ...errors };
  delete newErrors[field];
  return newErrors;
}

// Notification helpers
export function getNotificationSeverity(errorType: ErrorType): 'error' | 'warning' | 'info' {
  switch (errorType) {
    case ErrorType.VALIDATION:
      return 'warning';
    case ErrorType.NETWORK:
      return 'warning';
    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
    case ErrorType.SERVER:
      return 'error';
    default:
      return 'error';
  }
}

// Development helpers
export function logError(error: any, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    const errorType = classifyError(error);
    const message = extractErrorMessage(error);
    
    console.group(`🚨 Error${context ? ` in ${context}` : ''}`);
    console.error('Type:', errorType);
    console.error('Message:', message);
    console.error('Raw error:', error);
    console.groupEnd();
  }
}

// Error recovery suggestions
export function getRecoverySuggestion(errorType: ErrorType): string {
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Please check your internet connection and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Please log in again to continue.';
    case ErrorType.AUTHORIZATION:
      return 'You don\'t have permission to perform this action.';
    case ErrorType.VALIDATION:
      return 'Please check the form for errors and try again.';
    case ErrorType.NOT_FOUND:
      return 'The requested resource could not be found.';
    case ErrorType.CONFLICT:
      return 'This action conflicts with existing data. Please refresh and try again.';
    case ErrorType.SERVER:
      return 'Server error occurred. Please try again later.';
    default:
      return 'Please try again. If the problem persists, contact support.';
  }
}