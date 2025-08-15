import { Router } from 'express'
import { body, param } from 'express-validator'
import { validateRequest } from '../middleware/validateRequest'
import { requireCarerAuth } from '../middleware/auth'
import { carerShiftController } from '../controllers/CarerShiftController'

const router = Router()

/**
 * POST /api/carer-shifts/apply
 * Apply for a shift (simulates carer mobile app)
 */
router.post('/apply',
  requireCarerAuth,
  [
    body('shiftId')
      .isString()
      .notEmpty()
      .withMessage('Shift ID is required'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters')
  ],
  validateRequest,
  carerShiftController.applyForShift.bind(carerShiftController)
)

/**
 * GET /api/carer-shifts/:carerId/available
 * Get available shifts for a carer
 */
router.get('/available',
  requireCarerAuth,
  validateRequest,
  carerShiftController.getAvailableShifts.bind(carerShiftController)
)

/**
 * GET /api/carer-shifts/:carerId/applications
 * Get carer's shift applications
 */
router.get('/applications',
  requireCarerAuth,
  validateRequest,
  carerShiftController.getCarerApplications.bind(carerShiftController)
)

/**
 * POST /api/carer-shifts/:shiftId/simulate-applications
 * Test endpoint to simulate multiple applications
 */
router.post('/:shiftId/simulate-applications',
  [
    param('shiftId')
      .isString()
      .notEmpty()
      .withMessage('Shift ID is required'),
    body('carerIds')
      .isArray({ min: 1 })
      .withMessage('carerIds must be a non-empty array'),
    body('carerIds.*')
      .isString()
      .withMessage('Each carer ID must be a valid string')
  ],
  validateRequest,
  carerShiftController.simulateApplications.bind(carerShiftController)
)

export { router as carerShiftRoutes }