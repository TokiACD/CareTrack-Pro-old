import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { AssignmentController } from '../controllers/AssignmentController'
import { validateRequest } from '../middleware/validateRequest'
import { requireAuth } from '../middleware/auth'

const router = Router()
const assignmentController = new AssignmentController()

// All routes require authentication
router.use(requireAuth)

// GET /api/assignments - List all assignments (package-centric view)
router.get(
  '/',
  [
    query('packageId')
      .optional()
      .isString()
      .withMessage('Package ID must be a string'),
    query('includeProgress')
      .optional()
      .isBoolean()
      .withMessage('includeProgress must be a boolean')
  ],
  validateRequest,
  assignmentController.listAssignments
)

// GET /api/assignments/summary - Get assignment summary for dashboard
router.get(
  '/summary',
  assignmentController.getAssignmentSummary
)

// GET /api/assignments/packages/:packageId/available-carers - Get available carers for package
router.get(
  '/packages/:packageId/available-carers',
  [
    param('packageId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Package ID is required')
  ],
  validateRequest,
  assignmentController.getAvailableCarers
)

// GET /api/assignments/packages/:packageId/available-tasks - Get available tasks for package
router.get(
  '/packages/:packageId/available-tasks',
  [
    param('packageId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Package ID is required')
  ],
  validateRequest,
  assignmentController.getAvailableTasks
)

// POST /api/assignments/carer-package - Assign carer to package
router.post(
  '/carer-package',
  [
    body('carerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required'),
    body('packageId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Package ID is required')
  ],
  validateRequest,
  assignmentController.assignCarerToPackage
)

// POST /api/assignments/task-package - Assign task to package
router.post(
  '/task-package',
  [
    body('taskId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Task ID is required'),
    body('packageId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Package ID is required')
  ],
  validateRequest,
  assignmentController.assignTaskToPackage
)

// DELETE /api/assignments/carer-package - Remove carer from package
router.delete(
  '/carer-package',
  [
    body('carerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required'),
    body('packageId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Package ID is required')
  ],
  validateRequest,
  assignmentController.removeCarerFromPackage
)

// DELETE /api/assignments/task-package - Remove task from package
router.delete(
  '/task-package',
  [
    body('taskId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Task ID is required'),
    body('packageId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Package ID is required')
  ],
  validateRequest,
  assignmentController.removeTaskFromPackage
)

export { router as assignmentRoutes }