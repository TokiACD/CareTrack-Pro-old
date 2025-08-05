import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { CarerController } from '../controllers/CarerController'
import { validateRequest } from '../middleware/validateRequest'
import { requireAuth } from '../middleware/auth'

const router = Router()
const carerController = new CarerController()

// All routes require authentication
router.use(requireAuth)

// GET /api/carers - List all carers
router.get(
  '/',
  [
    query('includeDeleted')
      .optional()
      .isBoolean()
      .withMessage('includeDeleted must be a boolean'),
    query('search')
      .optional()
      .isString()
      .withMessage('search must be a string'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100')
  ],
  validateRequest,
  carerController.listCarers
)

// GET /api/carers/:id - Get single carer
router.get(
  '/:id',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required')
  ],
  validateRequest,
  carerController.getCarer
)

// POST /api/carers - Create new carer
router.post(
  '/',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('name')
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('phone')
      .optional()
      .isString()
      .withMessage('Phone must be a string')
  ],
  validateRequest,
  carerController.createCarer
)

// PATCH /api/carers/:id - Update carer
router.patch(
  '/:id',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required'),
    body('name')
      .optional()
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('phone')
      .optional()
      .isString()
      .withMessage('Phone must be a string'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],
  validateRequest,
  carerController.updateCarer
)

// DELETE /api/carers/:id - Delete carer
router.delete(
  '/:id',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required')
  ],
  validateRequest,
  carerController.deleteCarer
)

// POST /api/carers/:id/restore - Restore deleted carer
router.post(
  '/:id/restore',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required')
  ],
  validateRequest,
  carerController.restoreCarer
)

export { router as carerRoutes }