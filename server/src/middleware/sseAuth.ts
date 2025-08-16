/**
 * SSE Authentication Middleware - Handles token from query parameters
 * Specifically designed for Server-Sent Events endpoint authentication
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../index'
import { AdminUser, Carer } from '@caretrack/shared'
import { JWT_CONFIG } from '../config/security'

interface JwtPayload {
  userId: string
  email: string
  userType: 'admin' | 'carer'
  iat?: number
  exp?: number
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AdminUser | Carer
      userType?: 'admin' | 'carer'
    }
  }
}

export const sseAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // For SSE, token can come from query parameter
    const token = req.query.token as string

    if (!token) {
      console.log('🚫 [SSE-AUTH] No token provided in query parameters')
      res.status(401).json({
        success: false,
        error: 'Authentication token required',
        code: 'AUTH_REQUIRED'
      })
      return
    }

    console.log('🔍 [SSE-AUTH] Token validation starting', {
      tokenLength: token.length,
      path: req.path,
      userAgent: req.headers['user-agent']?.substring(0, 50)
    })

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
    if (!decoded.userId || !decoded.email || !decoded.userType) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN_PAYLOAD'
      })
      return
    }

    // Get user from database based on user type
    let user: AdminUser | Carer | null = null
    
    if (decoded.userType === 'admin') {
      user = await prisma.adminUser.findUnique({
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
    } else {
      user = await prisma.carer.findUnique({
        where: {
          id: decoded.userId,
          isActive: true,
          deletedAt: null,
          passwordHash: { not: null }, // Only carers with passwords can authenticate
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          lastLogin: true,
        },
      })
    }

    if (!user) {
      // Log security event for inactive/deleted user attempting access
      console.warn(`SSE authentication attempt with invalid user ID: ${decoded.userId}`, {
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


    // Add user and userType to request
    req.user = user
    req.userType = decoded.userType
    
    console.log('✅ [SSE-AUTH] Authentication successful', {
      userId: user.id,
      userType: decoded.userType,
      email: user.email
    })
    
    next()
  } catch (error) {
    // Enhanced error logging without sensitive data exposure
    console.error(`SSE authentication error:`, {
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
        code: 'INVALID_TOKEN'
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
      code: 'SERVER_ERROR'
    })
  }
}

export const requireSSEAuth = sseAuth