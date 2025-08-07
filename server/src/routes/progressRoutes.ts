import { Router } from 'express'
import { param } from 'express-validator'
import { requireAuth } from '../middleware/auth'
import { validateRequest } from '../middleware/validateRequest'
import { progressController } from '../controllers/ProgressController'
import { pdfService } from '../services/pdfService'
import { auditService } from '../services/auditService'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()
router.use(requireAuth)

// Get all carers with progress summaries
router.get('/', progressController.getCarerProgressSummaries.bind(progressController))

// Get carers ready for assessment
router.get('/ready-for-assessment', progressController.getCarersReadyForAssessment.bind(progressController))

// Get detailed progress for a specific carer
router.get('/carer/:carerId', progressController.getCarerDetailedProgress.bind(progressController))

// Get assessment responses for a specific carer  
router.get('/carer/:carerId/assessments', 
  [
    param('carerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required')
  ],
  validateRequest,
  progressController.getCarerAssessmentResponses.bind(progressController)
)

// Update task progress for a carer
router.put('/update', progressController.updateTaskProgress.bind(progressController))

// Reset task progress for a carer
router.put('/reset', progressController.resetTaskProgress.bind(progressController))

// Set manual competency rating
router.put('/competency', progressController.setManualCompetency.bind(progressController))

// Generate and download PDF report for a carer
router.get('/:carerId/pdf', 
  [
    param('carerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { carerId } = req.params
    const admin = req.user!

    try {
      // Generate and stream PDF
      await pdfService.streamCarerPDF(carerId, res)

      // Log PDF generation for audit trail
      await auditService.log({
        action: 'GENERATE_CARER_PDF',
        entityType: 'Carer',
        entityId: carerId,
        newValues: { 
          generatedBy: admin.name,
          generationDate: new Date().toISOString(),
          reason: 'PDF download request'
        },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'PDF generation failed' 
      })
    }
  })
)

export { router as progressRoutes }