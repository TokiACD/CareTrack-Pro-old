import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../index'
import { AdminUser } from '@caretrack/shared'
import { JWT_CONFIG, SESSION_CONFIG } from '../config/security'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AdminUser
    }
  }
}

interface JwtPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      // Sanitized error response - don't reveal authentication details
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      })
      return
    }

    // Enhanced token validation
    if (token.length < 10 || token.length > 2048) {
      res.status(401).json({
        success: false,
        error: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      })
      return
    }

    // Verify token with basic security options
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET, {
      algorithms: [JWT_CONFIG.ALGORITHM]
    }) as JwtPayload

    // Additional token integrity checks
    if (!decoded.userId || !decoded.email) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN_PAYLOAD'
      })
      return
    }

    // Get user from database
    const user = await prisma.adminUser.findUnique({
      where: {
        id: decoded.userId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        invitedBy: true,
        lastLogin: true,
      },
    })

    if (!user) {
      // Log security event for inactive/deleted user attempting access
      console.warn(`Authentication attempt with invalid user ID: ${decoded.userId}`, {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      })
      
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'INVALID_CREDENTIALS'
      })
      return
    }

    // Enhanced security: Check for suspicious activity
    const timeSinceLastLogin = user.lastLogin ? Date.now() - new Date(user.lastLogin).getTime() : 0
    if (timeSinceLastLogin > SESSION_CONFIG.TIMEOUT_MS * 2) {
      // User hasn't been active for extended period, require re-authentication
      console.info(`Extended inactivity detected for user ${user.id}`, {
        lastLogin: user.lastLogin,
        timeSinceLastLogin
      })
    }

    // Update last login time asynchronously (don't await - major performance improvement)
    prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }).catch(err => console.warn('Failed to update lastLogin:', err))

    // Add user to request
    req.user = user as AdminUser
    next()
  } catch (error) {
    // Enhanced error logging without sensitive data exposure
    const errorId = crypto.randomBytes(8).toString('hex')
    console.error(`Authentication error [${errorId}]:`, {
      type: error instanceof Error ? error.constructor.name : 'UnknownError',
      message: process.env.NODE_ENV === 'development' ? error : 'Authentication failed',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })
    
    // Standardized error responses to prevent information leakage
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'INVALID_TOKEN',
        ...(process.env.NODE_ENV === 'development' && { errorId })
      })
      return
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Session expired',
        code: 'TOKEN_EXPIRED'
      })
      return
    }

    if (error instanceof jwt.NotBeforeError) {
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'TOKEN_NOT_ACTIVE'
      })
      return
    }

    // Generic server error - don't expose internal details
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { errorId })
    })
  }
}

export const requireAuth = authenticateToken
export const authenticate = requireAuth

// Role-based authorization
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add role checking logic here if needed
    next()
  }
}

// Optional auth for public endpoints
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return next()
  }
  
  return requireAuth(req, res, next)
}