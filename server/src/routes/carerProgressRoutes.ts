import { Router } from 'express'
import { body, param } from 'express-validator'
import { validateRequest } from '../middleware/validateRequest'
import { requireCarerAuth } from '../middleware/auth'
import { carerProgressController } from '../controllers/CarerProgressController'

const router = Router()

/**
 * GET /api/carer-progress/overview
 * Get carer's personal progress overview
 */
router.get('/overview',
  requireCarerAuth,
  carerProgressController.getPersonalProgress.bind(carerProgressController)
)

/**
 * GET /api/carer-progress/pending-confirmations
 * Get competencies pending confirmation
 */
router.get('/pending-confirmations',
  requireCarerAuth,
  carerProgressController.getPendingConfirmations.bind(carerProgressController)
)

/**
 * POST /api/carer-progress/confirm/:competencyRatingId
 * Confirm a competency rating
 */
router.post('/confirm/:competencyRatingId',
  requireCarerAuth,
  [
    param('competencyRatingId')
      .isString()
      .notEmpty()
      .withMessage('Competency rating ID is required'),
    body('confirmationMethod')
      .optional()
      .isString()
      .isIn(['SELF_CONFIRMATION', 'SUPERVISOR_CONFIRMED', 'PEER_REVIEW'])
      .withMessage('Invalid confirmation method')
  ],
  validateRequest,
  carerProgressController.confirmCompetency.bind(carerProgressController)
)

/**
 * GET /api/carer-progress/achievements
 * Get carer's achievement progress and badges
 */
router.get('/achievements',
  requireCarerAuth,
  carerProgressController.getAchievements.bind(carerProgressController)
)

export { router as carerProgressRoutes }