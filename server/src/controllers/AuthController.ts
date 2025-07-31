import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../index'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { emailService } from '../services/emailService'
import { auditService } from '../services/auditService'
import { AdminUser } from '@caretrack/shared'

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body
    console.log('🔐 Login attempt for email:', email)

    // Find user (case-insensitive email lookup)
    const user = await prisma.adminUser.findFirst({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive'
        },
        isActive: true,
        deletedAt: null,
      },
    })

    console.log('🔍 User found:', user ? { id: user.id, email: user.email, isActive: user.isActive, deletedAt: user.deletedAt } : 'No user found')

    if (!user) {
      console.log('❌ User not found or inactive')
      throw createError(401, 'Invalid email or password')
    }

    // Verify password
    console.log('🔑 Verifying password...')
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    console.log('🔑 Password valid:', isValidPassword)
    
    if (!isValidPassword) {
      console.log('❌ Invalid password')
      throw createError(401, 'Invalid email or password')
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw createError(500, 'Server configuration error')
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    // Update last login
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Log the login
    await auditService.log({
      action: 'LOGIN',
      entityType: 'AdminUser',
      entityId: user.id,
      performedByAdminId: user.id,
      performedByAdminName: user.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    })

    // Return user data without password
    const { passwordHash, ...userData } = user

    res.json({
      success: true,
      data: {
        user: userData as AdminUser,
        token,
      },
      message: 'Login successful',
    })
  })

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Log the logout
    if (req.user) {
      await auditService.log({
        action: 'LOGOUT',
        entityType: 'AdminUser',
        entityId: req.user.id,
        performedByAdminId: req.user.id,
        performedByAdminName: req.user.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })
    }

    res.json({
      success: true,
      message: 'Logout successful',
    })
  })

  // Debug endpoint to list all admin users (temporary)
  listAdmins = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        deletedAt: true,
        createdAt: true,
        invitedBy: true
      }
    })
    
    res.json({
      success: true,
      data: users,
      total: users.length
    })
  })

  verifyToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // User is already attached to request by auth middleware
    if (!req.user) {
      throw createError(401, 'Authentication failed')
    }

    res.json({
      success: true,
      data: req.user,
    })
  })

  inviteAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, name } = req.body
    const invitedBy = req.user!

    // Check if user already exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw createError(409, 'An admin with this email already exists')
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12)
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    // Create admin user
    const newAdmin = await prisma.adminUser.create({
      data: {
        email,
        name,
        passwordHash,
        invitedBy: invitedBy.id,
      },
    })

    // Send invitation email
    try {
      await emailService.sendAdminInvitation({
        to: email,
        adminName: name,
        tempPassword,
        invitedByName: invitedBy.name,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
      })
    } catch (error) {
      // If email fails, delete the created admin
      await prisma.adminUser.delete({
        where: { id: newAdmin.id },
      })
      
      console.error('Failed to send invitation email:', error)
      throw createError(500, 'Failed to send invitation email')
    }

    // Log the invitation
    await auditService.log({
      action: 'INVITE_ADMIN',
      entityType: 'AdminUser',
      entityId: newAdmin.id,
      newValues: { email, name, invitedBy: invitedBy.id },
      performedByAdminId: invitedBy.id,
      performedByAdminName: invitedBy.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    })

    res.status(201).json({
      success: true,
      message: 'Admin invitation sent successfully',
    })
  })
}