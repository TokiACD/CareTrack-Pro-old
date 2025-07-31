import { Router } from 'express'
import { body } from 'express-validator'
import { AuthController } from '../controllers/AuthController'
import { validateRequest } from '../middleware/validateRequest'
import { requireAuth } from '../middleware/auth'

const router = Router()
const authController = new AuthController()

// Login
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required'),
  ],
  validateRequest,
  authController.login
)

// Logout
router.post('/logout', requireAuth, authController.logout)

// Verify token
router.get('/verify', requireAuth, authController.verifyToken)

// Forgot password
router.post('/forgot-password', authController.forgotPassword)

// Reset password
router.post('/reset-password', authController.resetPassword)

// Debug: List all admin users (temporary)
router.get('/debug/admins', authController.listAdmins)

// Debug: Check specific user password hash
router.get('/debug/user/:email', async (req, res) => {
  const { email } = req.params
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  
  try {
    const user = await prisma.adminUser.findFirst({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        deletedAt: true,
        passwordHash: true,
        createdAt: true,
        invitedBy: true
      }
    })
    
    res.json({
      success: true,
      searchEmail: email,
      user: user ? {
        ...user,
        passwordHash: user.passwordHash ? `***exists*** (${user.passwordHash.length} chars)` : '***MISSING***',
        passwordHashStart: user.passwordHash ? user.passwordHash.substring(0, 10) + '...' : null
      } : null
    })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

// Temporary: Reset password for specific user
router.post('/debug/reset-password', async (req, res) => {
  const { email, newPassword } = req.body
  const bcrypt = require('bcryptjs')
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update the user's password
    const updatedUser = await prisma.adminUser.update({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive'
        }
      },
      data: {
        passwordHash: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    })
    
    res.json({
      success: true,
      message: 'Password reset successfully',
      user: updatedUser
    })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

// Invite admin (requires authentication)
router.post(
  '/invite',
  requireAuth,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
  ],
  validateRequest,
  authController.inviteAdmin
)

export { router as authRoutes }