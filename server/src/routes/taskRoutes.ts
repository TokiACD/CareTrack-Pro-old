import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { TaskController } from '../controllers/TaskController'
import { validateRequest } from '../middleware/validateRequest'
import { requireAuth } from '../middleware/auth'

const router = Router()
const taskController = new TaskController()

// All routes require authentication
router.use(requireAuth)

// GET /api/tasks - List all tasks with pagination and search
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
      .isLength({ max: 255 })
      .withMessage('Search term cannot exceed 255 characters'),
    query('includeDeleted')
      .optional()
      .isBoolean()
      .withMessage('includeDeleted must be a boolean')
  ],
  validateRequest,
  taskController.listTasks
)

// GET /api/tasks/:id - Get single task by ID
router.get(
  '/:id',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Task ID is required')
  ],
  validateRequest,
  taskController.getTask
)

// GET /api/tasks/:id/usage - Get task usage statistics
router.get(
  '/:id/usage',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Task ID is required')
  ],
  validateRequest,
  taskController.getTaskUsage
)

// POST /api/tasks - Create new task
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Task name must be between 1 and 255 characters')
      .matches(/^[a-zA-Z0-9\s\-_.,()]+$/)
      .withMessage('Task name contains invalid characters'),
    body('targetCount')
      .isInt({ min: 1, max: 9999 })
      .withMessage('Target count must be between 1 and 9999')
  ],
  validateRequest,
  taskController.createTask
)

// PUT /api/tasks/:id - Update existing task
router.put(
  '/:id',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Task ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Task name must be between 1 and 255 characters')
      .matches(/^[a-zA-Z0-9\s\-_.,()]+$/)
      .withMessage('Task name contains invalid characters'),
    body('targetCount')
      .optional()
      .isInt({ min: 1, max: 9999 })
      .withMessage('Target count must be between 1 and 9999')
  ],
  validateRequest,
  taskController.updateTask
)

// DELETE /api/tasks/:id - Soft delete task
router.delete(
  '/:id',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Task ID is required')
  ],
  validateRequest,
  taskController.deleteTask
)

// POST /api/tasks/:id/restore - Restore soft-deleted task
router.post(
  '/:id/restore',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Task ID is required')
  ],
  validateRequest,
  taskController.restoreTask
)

export { router as taskRoutes }