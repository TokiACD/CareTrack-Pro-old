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