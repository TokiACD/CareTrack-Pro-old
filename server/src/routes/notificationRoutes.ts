import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { notificationService } from '../services/NotificationService'

const router = Router()

// SSE endpoint disabled - return informative message
router.get('/stream', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'SSE endpoints have been disabled. The system now uses smart refresh for data updates.',
    code: 'SSE_DISABLED'
  })
})

// Get notification service stats (for debugging)
router.get('/stats', requireAuth, (req, res) => {
  const stats = notificationService.getStats()
  res.json({
    success: true,
    data: {
      ...stats,
      mode: 'smart-refresh',
      sseDisabled: true
    }
  })
})

// Test notification endpoint disabled in smart refresh mode
if (process.env.NODE_ENV === 'development') {
  router.post('/test', requireAuth, (req, res) => {
    res.json({
      success: true,
      message: 'SSE test notifications disabled - using smart refresh system',
      mode: 'smart-refresh'
    })
  })
}

export { router as notificationRoutes }