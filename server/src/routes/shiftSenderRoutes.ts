import { Router } from 'express'
import { body, query, param } from 'express-validator'
import { authenticateToken as auth } from '../middleware/auth'
import { validateRequest } from '../middleware/validateRequest'
import { shiftSenderController } from '../controllers/ShiftSenderController'

const router = Router()

// All routes require authentication
router.use(auth)

/**
 * POST /api/shift-sender/shifts
 * Create a new shift with availability check
 */
router.post('/shifts',
  [
    body('packageId')
      .isString()
      .notEmpty()
      .withMessage('Package ID is required'),
    body('date')
      .isISO8601()
      .withMessage('Date must be in valid ISO format'),
    body('startTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format'),
    body('endTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format'),
    body('requiredCompetencies')
      .isArray()
      .withMessage('Required competencies must be an array'),
    body('requiredCompetencies.*')
      .isString()
      .withMessage('Each competency must be a valid task ID'),
    body('isCompetentOnly')
      .isBoolean()
      .withMessage('isCompetentOnly must be a boolean'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Expires at must be in valid ISO format')
  ],
  validateRequest,
  shiftSenderController.createShift.bind(shiftSenderController)
)

/**
 * POST /api/shift-sender/shifts/:shiftId/send
 * Send shift to selected carers
 */
router.post('/shifts/:shiftId/send',
  [
    param('shiftId')
      .isString()
      .notEmpty()
      .withMessage('Shift ID is required'),
    body('carerIds')
      .isArray({ min: 1 })
      .withMessage('At least one carer must be selected'),
    body('carerIds.*')
      .isString()
      .withMessage('Each carer ID must be a valid string'),
    body('sendEmail')
      .optional()
      .isBoolean()
      .withMessage('sendEmail must be a boolean')
  ],
  validateRequest,
  shiftSenderController.sendShiftToCarers.bind(shiftSenderController)
)

/**
 * GET /api/shift-sender/shifts/:shiftId/applications
 * Get applications for a specific shift
 */
router.get('/shifts/:shiftId/applications',
  [
    param('shiftId')
      .isString()
      .notEmpty()
      .withMessage('Shift ID is required')
  ],
  validateRequest,
  shiftSenderController.getShiftApplications.bind(shiftSenderController)
)

/**
 * POST /api/shift-sender/select-carer
 * Select a carer for a shift
 */
router.post('/select-carer',
  [
    body('shiftId')
      .isString()
      .notEmpty()
      .withMessage('Shift ID is required'),
    body('carerId')
      .isString()
      .notEmpty()
      .withMessage('Carer ID is required'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters')
  ],
  validateRequest,
  shiftSenderController.selectCarerForShift.bind(shiftSenderController)
)

/**
 * GET /api/shift-sender/shifts
 * Get shifts sent by the current admin
 */
router.get('/shifts',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['PENDING', 'WAITING_RESPONSES', 'HAS_APPLICATIONS', 'ASSIGNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'])
      .withMessage('Status must be a valid shift status')
  ],
  validateRequest,
  shiftSenderController.getSentShifts.bind(shiftSenderController)
)

/**
 * GET /api/shift-sender/check-availability
 * Check availability for shift parameters (preview)
 */
router.get('/check-availability',
  [
    query('packageId')
      .isString()
      .notEmpty()
      .withMessage('Package ID is required'),
    query('date')
      .isISO8601()
      .withMessage('Date must be in valid ISO format'),
    query('startTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format'),
    query('endTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format'),
    query('requiredCompetencies')
      .optional()
      .isString()
      .withMessage('Required competencies must be a comma-separated string'),
    query('isCompetentOnly')
      .optional()
      .isBoolean()
      .withMessage('isCompetentOnly must be a boolean')
  ],
  validateRequest,
  shiftSenderController.checkAvailability.bind(shiftSenderController)
)

/**
 * DELETE /api/shift-sender/shifts/:shiftId
 * Delete a shift
 */
router.delete('/shifts/:shiftId',
  [
    param('shiftId')
      .isString()
      .notEmpty()
      .withMessage('Shift ID is required')
  ],
  validateRequest,
  shiftSenderController.deleteShift.bind(shiftSenderController)
)

export { router as shiftSenderRoutes }