/**
 * Enhanced Error Sanitization Middleware
 * Prevents information disclosure while maintaining HIPAA compliance
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface SanitizedError {
  success: false;
  error: string;
  code: string;
  errorId?: string;
  timestamp: string;
  details?: any;
}

/**
 * Sanitize error responses to prevent information leakage
 * While maintaining useful debugging information in development
 */
export const sanitizeErrorResponse = (error: any, req: Request): SanitizedError => {
  const errorId = crypto.randomBytes(8).toString('hex');
  const timestamp = new Date().toISOString();
  
  // Log the full error details for debugging (server-side only)
  console.error(`[ERROR ${errorId}] ${timestamp}:`, {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.id
  });

  // Base sanitized response
  const baseResponse: SanitizedError = {
    success: false,
    error: 'Internal server error',
    code: 'SERVER_ERROR',
    timestamp,
    ...(process.env.NODE_ENV === 'development' && { errorId })
  };

  // Handle specific error types with appropriate sanitization
  if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
    return {
      ...baseResponse,
      error: 'Invalid input data',
      code: 'VALIDATION_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        details: sanitizeValidationErrors(error.details || error.message) 
      })
    };
  }

  if (error.name === 'UnauthorizedError' || error.code === 'UNAUTHORIZED') {
    return {
      ...baseResponse,
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    };
  }

  if (error.name === 'ForbiddenError' || error.code === 'FORBIDDEN') {
    return {
      ...baseResponse,
      error: 'Access denied',
      code: 'FORBIDDEN'
    };
  }

  if (error.name === 'NotFoundError' || error.code === 'NOT_FOUND') {
    return {
      ...baseResponse,
      error: 'Resource not found',
      code: 'NOT_FOUND'
    };
  }

  // Database errors (Prisma)
  if (error.code === 'P2002') {
    return {
      ...baseResponse,
      error: 'Duplicate entry',
      code: 'DUPLICATE_ENTRY'
    };
  }

  if (error.code === 'P2025') {
    return {
      ...baseResponse,
      error: 'Record not found',
      code: 'RECORD_NOT_FOUND'
    };
  }

  if (error.code && error.code.startsWith('P')) {
    return {
      ...baseResponse,
      error: 'Database operation failed',
      code: 'DATABASE_ERROR'
    };
  }

  // Rate limiting errors
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    return {
      ...baseResponse,
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }

  // File upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return {
      ...baseResponse,
      error: 'File too large',
      code: 'FILE_TOO_LARGE'
    };
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return {
      ...baseResponse,
      error: 'Unexpected file',
      code: 'INVALID_FILE'
    };
  }

  // CSRF errors
  if (error.code === 'CSRF_TOKEN_INVALID' || error.code === 'CSRF_TOKEN_MISSING') {
    return {
      ...baseResponse,
      error: 'Security token validation failed',
      code: error.code
    };
  }

  // Default sanitized error
  return baseResponse;
};

/**
 * Sanitize validation errors to prevent schema information leakage
 */
function sanitizeValidationErrors(details: any): any {
  if (typeof details === 'string') {
    // Remove potentially sensitive information
    return details
      .replace(/password/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]')
      .replace(/key/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/ssn|social security/gi, '[REDACTED]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]') // SSN pattern
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED]'); // Credit card pattern
  }

  if (Array.isArray(details)) {
    return details.map(sanitizeValidationErrors);
  }

  if (typeof details === 'object' && details !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(details)) {
      // Skip sensitive field details
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValidationErrors(value);
      }
    }
    return sanitized;
  }

  return details;
}

/**
 * Enhanced error handler middleware
 */
export const enhancedErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  const sanitizedResponse = sanitizeErrorResponse(error, req);

  // Determine HTTP status code
  let statusCode = 500;
  
  switch (sanitizedResponse.code) {
    case 'VALIDATION_ERROR':
      statusCode = 400;
      break;
    case 'UNAUTHORIZED':
      statusCode = 401;
      break;
    case 'FORBIDDEN':
      statusCode = 403;
      break;
    case 'NOT_FOUND':
    case 'RECORD_NOT_FOUND':
      statusCode = 404;
      break;
    case 'DUPLICATE_ENTRY':
      statusCode = 409;
      break;
    case 'RATE_LIMIT_EXCEEDED':
      statusCode = 429;
      break;
    case 'FILE_TOO_LARGE':
    case 'INVALID_FILE':
      statusCode = 413;
      break;
    case 'CSRF_TOKEN_INVALID':
    case 'CSRF_TOKEN_MISSING':
      statusCode = 403;
      break;
  }

  // Set security headers on error responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  res.status(statusCode).json(sanitizedResponse);
};

/**
 * Create standardized error objects
 */
export class SecurityError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  public code: string;
  public details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.details = details;
  }
}

export class UnauthorizedError extends Error {
  public code: string;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = 'UNAUTHORIZED';
  }
}

export class ForbiddenError extends Error {
  public code: string;

  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = 'FORBIDDEN';
  }
}