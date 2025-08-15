import { Router } from 'express'
import { body } from 'express-validator'
import { AuthController } from '../controllers/AuthController'
import { validateRequest } from '../middleware/validateRequest'
import { requireAuth } from '../middleware/auth'
import { requireFastAuth } from '../middleware/fastAuth'

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

// Verify token - use fast auth for performance-critical endpoint
router.get('/verify', requireFastAuth, authController.verifyToken)

// Forgot password with validation
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 254 }) // RFC 5321 limit
      .withMessage('Please provide a valid email address'),
  ],
  validateRequest,
  authController.forgotPassword
)

// Reset password with validation
router.post(
  '/reset-password',
  [
    body('token')
      .isLength({ min: 32, max: 128 })
      .matches(/^[a-f0-9]+$/i)
      .withMessage('Invalid reset token format'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least 8 characters with uppercase, lowercase, number and special character'),
  ],
  validateRequest,
  authController.resetPassword
)


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