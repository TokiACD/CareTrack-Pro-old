import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt, { Secret } from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../index'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { emailService } from '../services/emailService'
import { auditService } from '../services/auditService'
import { AdminUser } from '@caretrack/shared'

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body

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


    if (!user) {
      throw createError(401, 'Invalid email or password')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    
    if (!isValidPassword) {
      throw createError(401, 'Invalid email or password')
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw createError(500, 'Server configuration error')
    }

    const payload = { userId: user.id, email: user.email }
    const token = jwt.sign(payload, jwtSecret as Secret, { expiresIn: '8h' })

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

    // Generate secure invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    
    // Create invitation record
    const invitation = await prisma.invitation.create({
      data: {
        email,
        userType: 'ADMIN',
        token: invitationToken,
        name,
        invitedBy: invitedBy.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'PENDING'
      }
    })

    // Send invitation email
    try {
      await emailService.sendAdminInvitation({
        to: email,
        adminName: name,
        invitedByName: invitedBy.name,
        invitationToken,
        acceptUrl: `${process.env.FRONTEND_URL}/invitation/accept?token=${invitationToken}`,
        expiresAt: invitation.expiresAt
      })
    } catch (error) {
      // If email fails, delete the created invitation
      await prisma.invitation.delete({
        where: { id: invitation.id },
      })
      
      throw createError(500, 'Failed to send invitation email')
    }

    // Log the invitation
    await auditService.log({
      action: 'INVITE_ADMIN',
      entityType: 'Invitation',
      entityId: invitation.id,
      newValues: { email, name, userType: 'ADMIN', invitedBy: invitedBy.id },
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

  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body

    if (!email) {
      throw createError(400, 'Email is required')
    }

    // Find user (case-insensitive)
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

    // Always return success to prevent email enumeration
    // but only send email if user exists
    if (user) {
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Clean up any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: user.email }
      })

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token: resetToken,
          expiresAt
        }
      })

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      
      try {
        await emailService.sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl
        })

        // Log the password reset request
        await auditService.log({
          action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'AdminUser',
          entityId: user.id,
          performedByAdminId: user.id,
          performedByAdminName: user.name,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        })
      } catch (error) {
        // If email fails, clean up the token
        await prisma.passwordResetToken.deleteMany({
          where: { token: resetToken }
        })
        throw createError(500, 'Failed to send reset email')
      }
    }

    res.json({
      success: true,
      data: null,
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  })

  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body

    if (!token || !password) {
      throw createError(400, 'Token and password are required')
    }

    if (password.length < 8) {
      throw createError(400, 'Password must be at least 8 characters long')
    }

    // Find valid reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        usedAt: null
      }
    })

    if (!resetToken) {
      throw createError(400, 'Invalid or expired reset token')
    }

    // Find the user
    const user = await prisma.adminUser.findFirst({
      where: { 
        email: {
          equals: resetToken.email,
          mode: 'insensitive'
        },
        isActive: true,
        deletedAt: null,
      },
    })

    if (!user) {
      throw createError(400, 'User not found or inactive')
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      })
    ])

    // Clean up all reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { 
        email: resetToken.email,
        id: { not: resetToken.id }
      }
    })

    // Log the password reset
    await auditService.log({
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'AdminUser',
      entityId: user.id,
      performedByAdminId: user.id,
      performedByAdminName: user.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    })

    res.json({
      success: true,
      data: null,
      message: 'Password has been reset successfully',
    })
  })
}