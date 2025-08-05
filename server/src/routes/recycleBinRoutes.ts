import { Router } from 'express'
import { body, query } from 'express-validator'
import { RecycleBinController } from '../controllers/RecycleBinController'
import { validateRequest } from '../middleware/validateRequest'
import { requireAuth } from '../middleware/auth'

const router = Router()
const recycleBinController = new RecycleBinController()

// All routes require authentication
router.use(requireAuth)

// GET /api/recycle-bin - List all soft-deleted items
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .isString()
      .withMessage('Search must be a string'),
    query('entityType')
      .optional()
      .isIn(['all', 'adminUsers', 'carers', 'carePackages', 'tasks', 'assessments'])
      .withMessage('Invalid entity type'),
    query('sortBy')
      .optional()
      .isIn(['deletedAt', 'createdAt', 'name'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  validateRequest,
  recycleBinController.listDeletedItems
)

// GET /api/recycle-bin/summary - Get recycle bin summary for dashboard
router.get(
  '/summary',
  recycleBinController.getRecycleBinSummary
)

// POST /api/recycle-bin/restore - Restore a soft-deleted item
router.post(
  '/restore',
  [
    body('entityType')
      .isIn(['adminUsers', 'carers', 'carePackages', 'tasks', 'assessments'])
      .withMessage('Invalid entity type'),
    body('entityId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Entity ID is required')
  ],
  validateRequest,
  recycleBinController.restoreItem
)

// DELETE /api/recycle-bin/permanent-delete - Permanently delete an item
router.delete(
  '/permanent-delete',
  [
    body('entityType')
      .isIn(['adminUsers', 'carers', 'carePackages', 'tasks', 'assessments'])
      .withMessage('Invalid entity type'),
    body('entityId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Entity ID is required')
  ],
  validateRequest,
  recycleBinController.permanentDelete
)

// POST /api/recycle-bin/cleanup - Cleanup old deleted items (30+ days)
router.post(
  '/cleanup',
  recycleBinController.cleanupOldItems
)


export { router as recycleBinRoutes }