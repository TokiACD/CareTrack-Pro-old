import { Router } from 'express'
import { body, query, param } from 'express-validator'
import { authenticateToken as auth } from '../middleware/auth'
import { validateRequest } from '../middleware/validateRequest'
import { rotaController } from '../controllers/RotaController'

const router = Router()

// All routes require authentication
router.use(auth)

/**
 * GET /api/rota
 * Get rota entries with filtering and pagination
 */
router.get('/',
  [
    query('packageId').optional().isString().withMessage('Package ID must be a string'),
    query('carerId').optional().isString().withMessage('Carer ID must be a string'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO format'),
    query('shiftType').optional().isIn(['DAY', 'NIGHT']).withMessage('Shift type must be DAY or NIGHT'),
    query('isConfirmed').optional().isBoolean().withMessage('isConfirmed must be a boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  rotaController.getRotaEntries.bind(rotaController)
)

/**
 * GET /api/rota/weekly
 * Get weekly schedule for a specific package
 */
router.get('/weekly',
  [
    query('packageId').isString().notEmpty().withMessage('Package ID is required'),
    query('weekStart').isISO8601().withMessage('Week start must be in ISO date format')
  ],
  validateRequest,
  rotaController.getWeeklySchedule.bind(rotaController)
)

/**
 * GET /api/rota/:id
 * Get specific rota entry by ID
 */
router.get('/:id',
  [
    param('id').isString().notEmpty().withMessage('Rota entry ID is required')
  ],
  validateRequest,
  rotaController.getRotaEntry.bind(rotaController)
)

/**
 * POST /api/rota
 * Create a new rota entry
 */
router.post('/',
  [
    body('packageId').isString().notEmpty().withMessage('Package ID is required'),
    body('carerId').isString().notEmpty().withMessage('Carer ID is required'),
    body('date').isISO8601().withMessage('Date must be in ISO format')
      .custom((date) => {
        const inputDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Don't allow scheduling more than 3 months in advance
        const maxFutureDate = new Date();
        maxFutureDate.setMonth(maxFutureDate.getMonth() + 3);
        
        if (inputDate > maxFutureDate) {
          throw new Error('Cannot schedule shifts more than 3 months in advance');
        }
        
        return true;
      }),
    body('shiftType').isIn(['DAY', 'NIGHT']).withMessage('Shift type must be DAY or NIGHT'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format')
      .custom((endTime, { req }) => {
        const startTime = req.body.startTime;
        const shiftType = req.body.shiftType;
        
        if (startTime && endTime && shiftType === 'DAY') {
          // For day shifts, end time should be after start time on same day
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          if (endMinutes <= startMinutes) {
            throw new Error('End time must be after start time for day shifts');
          }
          
          // Validate reasonable shift duration (2-12 hours)
          const durationHours = (endMinutes - startMinutes) / 60;
          if (durationHours < 2 || durationHours > 12) {
            throw new Error('Shift duration must be between 2 and 12 hours');
          }
        }
        
        return true;
      }),
    body('isConfirmed').optional().isBoolean().withMessage('isConfirmed must be a boolean')
  ],
  validateRequest,
  rotaController.createRotaEntry.bind(rotaController)
)

/**
 * POST /api/rota/bulk
 * Bulk create rota entries
 */
router.post('/bulk',
  [
    body('entries').isArray({ min: 1 }).withMessage('Entries array is required and must not be empty'),
    body('entries.*.packageId').isString().notEmpty().withMessage('Package ID is required for each entry'),
    body('entries.*.carerId').isString().notEmpty().withMessage('Carer ID is required for each entry'),
    body('entries.*.date').isISO8601().withMessage('Date must be in ISO format for each entry'),
    body('entries.*.shiftType').isIn(['DAY', 'NIGHT']).withMessage('Shift type must be DAY or NIGHT for each entry'),
    body('entries.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format for each entry'),
    body('entries.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format for each entry'),
    body('entries.*.isConfirmed').optional().isBoolean().withMessage('isConfirmed must be a boolean for each entry'),
    body('validateOnly').optional().isBoolean().withMessage('validateOnly must be a boolean')
  ],
  validateRequest,
  rotaController.bulkCreateRotaEntries.bind(rotaController)
)

/**
 * PUT /api/rota/:id
 * Update a rota entry
 */
router.put('/:id',
  [
    param('id').isString().notEmpty().withMessage('Rota entry ID is required'),
    body('packageId').optional().isString().withMessage('Package ID must be a string'),
    body('carerId').optional().isString().withMessage('Carer ID must be a string'),
    body('date').optional().isISO8601().withMessage('Date must be in ISO format'),
    body('shiftType').optional().isIn(['DAY', 'NIGHT']).withMessage('Shift type must be DAY or NIGHT'),
    body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
    body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
    body('isConfirmed').optional().isBoolean().withMessage('isConfirmed must be a boolean')
  ],
  validateRequest,
  rotaController.updateRotaEntry.bind(rotaController)
)

/**
 * DELETE /api/rota/batch
 * Batch delete rota entries
 */
router.delete('/batch',
  [
    body('ids').isArray({ min: 1 }).withMessage('IDs array is required and must not be empty'),
    body('ids.*').isString().notEmpty().withMessage('Each ID must be a non-empty string')
  ],
  validateRequest,
  rotaController.batchDeleteRotaEntries.bind(rotaController)
)

/**
 * DELETE /api/rota/:id
 * Delete a rota entry
 */
router.delete('/:id',
  [
    param('id').isString().notEmpty().withMessage('Rota entry ID is required')
  ],
  validateRequest,
  rotaController.deleteRotaEntry.bind(rotaController)
)

/**
 * POST /api/rota/validate
 * Validate a rota entry without creating it
 */
router.post('/validate',
  [
    body('packageId').isString().notEmpty().withMessage('Package ID is required'),
    body('carerId').isString().notEmpty().withMessage('Carer ID is required'),
    body('date').isISO8601().withMessage('Date must be in ISO format'),
    body('shiftType').isIn(['DAY', 'NIGHT']).withMessage('Shift type must be DAY or NIGHT'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
    body('isConfirmed').optional().isBoolean().withMessage('isConfirmed must be a boolean')
  ],
  validateRequest,
  rotaController.validateRotaEntry.bind(rotaController)
)

/**
 * PATCH /api/rota/:id/confirm
 * Confirm a rota entry
 */
router.patch('/:id/confirm',
  [
    param('id').isString().notEmpty().withMessage('Rota entry ID is required')
  ],
  validateRequest,
  rotaController.confirmRotaEntry.bind(rotaController)
)

export { router as rotaRoutes }