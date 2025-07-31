import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../index'
import { AdminUser } from '@caretrack/shared'

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
      res.status(401).json({
        success: false,
        error: 'Access token required',
      })
      return
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured')
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
      })
      return
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload

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
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      })
      return
    }

    // Update last login time
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Add user to request
    req.user = user as AdminUser
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    
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

export const requireAuth = authenticateToken