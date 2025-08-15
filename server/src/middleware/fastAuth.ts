/**
 * Fast Authentication Middleware - Optimized for High-Performance Endpoints
 * Minimal overhead version for performance-critical paths
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../index'
import { AdminUser } from '@caretrack/shared'

interface JwtPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

// In-memory cache for user verification (shorter TTL for better security/performance balance)
const userCache = new Map<string, { user: AdminUser; expires: number }>()
const CACHE_TTL = 300000 // 5 minutes cache - longer for better performance

export const fastAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
      })
      return
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret.length < 32) {
      console.error('JWT_SECRET not configured or too short (minimum 32 characters required)')
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
      })
      return
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload

    // Check cache first for performance
    const cached = userCache.get(decoded.userId)
    if (cached && cached.expires > Date.now()) {
      req.user = cached.user
      return next()
    }

    // Get user from database (only if not cached) - optimized query
    const user = await prisma.adminUser.findFirst({
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
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      })
      return
    }

    // Cache user for subsequent requests
    userCache.set(decoded.userId, {
      user: user as AdminUser,
      expires: Date.now() + CACHE_TTL
    })

    // Skip lastLogin update on fast auth to improve performance
    // This is a performance-critical path, lastLogin updates are optional

    req.user = user as AdminUser
    next()
  } catch (error) {
    console.error('Fast authentication error:', error)
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      })
      return
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
      })
      return
    }

    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    })
  }
}

// Clean up expired cache entries periodically (less frequently for better performance)
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of userCache.entries()) {
    if (value.expires <= now) {
      userCache.delete(key)
    }
  }
}, CACHE_TTL * 2) // Clean up every 10 minutes (less CPU overhead)

export const requireFastAuth = fastAuth