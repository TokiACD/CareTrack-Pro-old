/**
 * Minimal Security Middleware for Performance-Critical Endpoints
 * Provides essential security with minimal overhead
 */

import { Request, Response, NextFunction } from 'express'

/**
 * Lightweight security headers middleware
 */
export const minimalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set only essential security headers for performance
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  next()
}

/**
 * Basic input sanitization for performance-critical paths
 */
export const basicInputSanitization = (req: Request, res: Response, next: NextFunction) => {
  // Only check for the most dangerous patterns with minimal regex processing
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /\.\.\//
  ]

  const sanitizeString = (str: string): boolean => {
    return dangerousPatterns.some(pattern => pattern.test(str))
  }

  // Quick check on request body strings only
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string' && sanitizeString(req.body[key])) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
          code: 'INVALID_INPUT'
        })
      }
    }
  }

  next()
}

/**
 * Minimal audit logging for critical endpoints
 */
export const minimalAudit = (req: Request, res: Response, next: NextFunction) => {
  // Only log high-value security events
  const isSecurityCritical = req.path.includes('/auth/') && req.method === 'POST'
  
  if (isSecurityCritical) {
    // Log asynchronously to avoid blocking
    setImmediate(() => {
      console.log(`[SECURITY] ${req.method} ${req.path} from ${req.ip}`)
    })
  }

  next()
}

/**
 * Fast response cache headers
 */
export const fastCacheHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set cache headers for frequently accessed endpoints
  if (req.method === 'GET' && (req.path === '/health' || req.path === '/api/csrf-token')) {
    res.setHeader('Cache-Control', 'public, max-age=60') // 1 minute cache
  }
  
  next()
}

/**
 * Combined minimal security middleware for maximum performance
 */
export const minimalSecurityStack = [
  minimalSecurityHeaders,
  fastCacheHeaders,
  basicInputSanitization,
  minimalAudit
]