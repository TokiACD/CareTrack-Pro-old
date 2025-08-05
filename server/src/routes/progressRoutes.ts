import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { progressController } from '../controllers/ProgressController'

const router = Router()
router.use(requireAuth)

// Get all carers with progress summaries
router.get('/', progressController.getCarerProgressSummaries.bind(progressController))

// Get detailed progress for a specific carer
router.get('/carer/:carerId', progressController.getCarerDetailedProgress.bind(progressController))

// Update task progress for a carer
router.put('/update', progressController.updateTaskProgress.bind(progressController))

// Reset task progress for a carer
router.put('/reset', progressController.resetTaskProgress.bind(progressController))

// Set manual competency rating
router.put('/competency', progressController.setManualCompetency.bind(progressController))

// Generate PDF report (placeholder for future implementation)
router.get('/:carerId/pdf', (req, res) => {
  res.json({ success: true, message: 'Generate PDF endpoint - coming soon' })
})

export { router as progressRoutes }