import { Router } from 'express'
import { requireCarerAuth } from '../middleware/auth'
import { carerDashboardController } from '../controllers/CarerDashboardController'

const router = Router()

/**
 * GET /api/carer-dashboard/summary
 * Get carer dashboard summary statistics
 */
router.get('/summary',
  requireCarerAuth,
  carerDashboardController.getDashboardSummary.bind(carerDashboardController)
)

/**
 * GET /api/carer-dashboard/today-tasks
 * Get today's available tasks for the carer
 */
router.get('/today-tasks',
  requireCarerAuth,
  carerDashboardController.getTodaysTasks.bind(carerDashboardController)
)

/**
 * GET /api/carer-dashboard/notifications
 * Get carer notifications (confirmations, shift updates, etc.)
 */
router.get('/notifications',
  requireCarerAuth,
  carerDashboardController.getNotifications.bind(carerDashboardController)
)

/**
 * GET /api/carer-dashboard/recent-activity
 * Get carer's recent activity
 */
router.get('/recent-activity',
  requireCarerAuth,
  carerDashboardController.getRecentActivity.bind(carerDashboardController)
)

export { router as carerDashboardRoutes }