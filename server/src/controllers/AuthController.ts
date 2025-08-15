import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt, { Secret } from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../index'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { emailService } from '../services/EmailService'
import { auditService } from '../services/auditService'
import { AdminUser } from '@caretrack/shared'
import { PASSWORD_CONFIG, JWT_CONFIG } from '../config/security'
import { generateSecurePasswordResetToken, verifyPasswordResetToken, validatePasswordStrength } from '../config/passwordSecurity'

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body

    // Try admin user first
    let user = await prisma.adminUser.findFirst({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive'
        },
        isActive: true,
        deletedAt: null,
      },
    })
    
    let userType: 'admin' | 'carer' = 'admin'
    
    // If not admin, try carer
    if (!user) {
      const carer = await prisma.carer.findFirst({
        where: { 
          email: {
            equals: email,
            mode: 'insensitive'
          },
          isActive: true,
          deletedAt: null,
          passwordHash: { not: null }, // Only carers with passwords
        },
      })
      
      if (carer) {
        user = carer
        userType = 'carer'
      }
    }

    if (!user) {
      throw createError(401, 'Invalid email or password')
    }

    // Check account lockout
    const now = new Date()
    if (user.lockoutUntil && user.lockoutUntil > now) {
      const lockoutMinutes = Math.ceil((user.lockoutUntil.getTime() - now.getTime()) / (1000 * 60))
      throw createError(423, `Account temporarily locked. Try again in ${lockoutMinutes} minute(s).`)
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    
    if (!isValidPassword) {
      // Handle failed login attempt
      const failedAttempts = (user.failedLoginAttempts || 0) + 1
      const MAX_ATTEMPTS = 5
      const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes in milliseconds
      
      let lockoutUntil = null
      if (failedAttempts >= MAX_ATTEMPTS) {
        lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION)
      }

      // Update failed attempts in database
      if (userType === 'admin') {
        await prisma.adminUser.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failedAttempts,
            lastFailedLogin: now,
            lockoutUntil: lockoutUntil
          }
        })
      } else {
        await prisma.carer.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failedAttempts,
            lastFailedLogin: now,
            lockoutUntil: lockoutUntil
          }
        })
      }

      if (lockoutUntil) {
        throw createError(423, 'Account locked due to too many failed attempts. Try again in 15 minutes.')
      }
      
      throw createError(401, 'Invalid email or password')
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
      if (userType === 'admin') {
        await prisma.adminUser.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockoutUntil: null,
            lastFailedLogin: null
          }
        })
      } else {
        await prisma.carer.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockoutUntil: null,
            lastFailedLogin: null
          }
        })
      }
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret.length < 32) {
      throw createError(500, 'Server configuration error: JWT secret must be at least 32 characters')
    }

    const payload = { 
      userId: user.id, 
      email: user.email,
      userType,
      iat: Math.floor(Date.now() / 1000)
    }
    const token = jwt.sign(payload, jwtSecret as Secret, {
      expiresIn: JWT_CONFIG.EXPIRES_IN,
      algorithm: JWT_CONFIG.ALGORITHM
    })

    // Update last login
    if (userType === 'admin') {
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      })
    } else {
      await prisma.carer.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      })
    }

    // Log the login
    await auditService.log({
      action: 'LOGIN',
      entityType: userType === 'admin' ? 'AdminUser' : 'Carer',
      entityId: user.id,
      performedByAdminId: userType === 'admin' ? user.id : undefined,
      performedByAdminName: user.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    })

    // Return user data without password
    const { passwordHash, ...userData } = user

    res.json({
      success: true,
      data: {
        user: userData,
        userType,
        token,
      },
      message: 'Login successful',
    })
  })

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Log the logout
    if (req.user && req.userType) {
      await auditService.log({
        action: 'LOGOUT',
        entityType: req.userType === 'admin' ? 'AdminUser' : 'Carer',
        entityId: req.user.id,
        performedByAdminId: req.userType === 'admin' ? req.user.id : undefined,
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
    if (!req.user || !req.userType) {
      throw createError(401, 'Authentication failed')
    }

    res.json({
      success: true,
      data: {
        user: req.user,
        userType: req.userType,
      },
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

    // Log the password reset request for security monitoring
    await auditService.log({
      action: 'PASSWORD_RESET_REQUEST',
      entityType: 'Security',
      entityId: 'password-reset',
      newValues: { email: email.toLowerCase(), ipAddress: req.ip },
      performedByAdminId: 'anonymous',
      performedByAdminName: 'Anonymous User',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    })

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
      // Generate cryptographically secure reset token
      const { token: resetToken, hashedToken, expiresAt } = await generateSecurePasswordResetToken()

      // Clean up any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: user.email }
      })

      // Create new reset token (store hashed version)
      await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token: hashedToken, // Store hashed token, not plain token
          expiresAt,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
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

    // Log the password reset attempt for security monitoring
    await auditService.log({
      action: 'PASSWORD_RESET_ATTEMPT',
      entityType: 'Security',
      entityId: 'password-reset',
      newValues: { 
        tokenProvided: !!token, 
        ipAddress: req.ip, 
        userAgent: req.get('User-Agent')?.substring(0, 200) // Truncate long user agents
      },
      performedByAdminId: 'anonymous',
      performedByAdminName: 'Anonymous User',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    })

    // Find valid reset token
    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        expiresAt: { gt: new Date() },
        usedAt: null
      }
    })

    if (!resetTokenRecord) {
      // Log failed reset attempt
      await auditService.log({
        action: 'PASSWORD_RESET_FAILED',
        entityType: 'Security',
        entityId: 'password-reset',
        newValues: { reason: 'token_not_found', ipAddress: req.ip },
        performedByAdminId: 'anonymous',
        performedByAdminName: 'Anonymous User',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })
      throw createError(400, 'Invalid or expired reset token')
    }

    // Verify token using constant-time comparison
    const isValidToken = verifyPasswordResetToken(token, resetTokenRecord.token)
    if (!isValidToken) {
      // Log failed reset attempt
      await auditService.log({
        action: 'PASSWORD_RESET_FAILED',
        entityType: 'Security',
        entityId: 'password-reset',
        newValues: { reason: 'invalid_token', email: resetTokenRecord.email, ipAddress: req.ip },
        performedByAdminId: 'anonymous',
        performedByAdminName: 'Anonymous User',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })
      throw createError(400, 'Invalid or expired reset token')
    }

    // Find the user
    const user = await prisma.adminUser.findFirst({
      where: { 
        email: {
          equals: resetTokenRecord.email,
          mode: 'insensitive'
        },
        isActive: true,
        deletedAt: null,
      },
    })

    if (!user) {
      throw createError(400, 'User not found or inactive')
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      throw createError(400, `Password requirements not met: ${passwordValidation.errors.join(', ')}`)
    }

    // Hash new password with secure rounds
    const passwordHash = await bcrypt.hash(password, PASSWORD_CONFIG.BCRYPT_ROUNDS)

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { usedAt: new Date() }
      })
    ])

    // Clean up all reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { 
        email: resetTokenRecord.email,
        id: { not: resetTokenRecord.id }
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