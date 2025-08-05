import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { AssessmentController } from '../controllers/AssessmentController'
import { validateRequest } from '../middleware/validateRequest'
import { requireAuth } from '../middleware/auth'

const router = Router()
const assessmentController = new AssessmentController()

// All routes require authentication
router.use(requireAuth)

// GET /api/assessments - List all assessments
router.get(
  '/',
  [
    query('includeDeleted')
      .optional()
      .isBoolean()
      .withMessage('includeDeleted must be a boolean'),
    query('includeResponses')
      .optional()
      .isBoolean()
      .withMessage('includeResponses must be a boolean')
  ],
  validateRequest,
  assessmentController.listAssessments
)

// GET /api/assessments/:id - Get single assessment
router.get(
  '/:id',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Assessment ID is required')
  ],
  validateRequest,
  assessmentController.getAssessment
)

// POST /api/assessments - Create new assessment
router.post(
  '/',
  [
    body('name')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Assessment name is required and must be less than 255 characters'),
    body('knowledgeQuestions')
      .optional()
      .isArray()
      .withMessage('Knowledge questions must be an array'),
    body('knowledgeQuestions.*.question')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Knowledge question text is required'),
    body('knowledgeQuestions.*.modelAnswer')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Knowledge question model answer is required'),
    body('practicalSkills')
      .optional()
      .isArray()
      .withMessage('Practical skills must be an array'),
    body('practicalSkills.*.skillDescription')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Skill description is required'),
    body('emergencyQuestions')
      .optional()
      .isArray()
      .withMessage('Emergency questions must be an array'),
    body('emergencyQuestions.*.question')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Emergency question text is required'),
    body('emergencyQuestions.*.modelAnswer')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Emergency question model answer is required'),
    body('tasksCovered')
      .optional()
      .isArray()
      .withMessage('Tasks covered must be an array of task IDs')
  ],
  validateRequest,
  assessmentController.createAssessment
)

// PATCH /api/assessments/:id - Update assessment
router.patch(
  '/:id',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Assessment ID is required'),
    body('name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Assessment name must be less than 255 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('knowledgeQuestions')
      .optional()
      .isArray()
      .withMessage('Knowledge questions must be an array'),
    body('practicalSkills')
      .optional()
      .isArray()
      .withMessage('Practical skills must be an array'),
    body('emergencyQuestions')
      .optional()
      .isArray()
      .withMessage('Emergency questions must be an array'),
    body('tasksCovered')
      .optional()
      .isArray()
      .withMessage('Tasks covered must be an array of task IDs')
  ],
  validateRequest,
  assessmentController.updateAssessment
)

// DELETE /api/assessments/:id - Delete assessment
router.delete(
  '/:id',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Assessment ID is required')
  ],
  validateRequest,
  assessmentController.deleteAssessment
)

// POST /api/assessments/:id/responses - Submit assessment response
router.post(
  '/:id/responses',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Assessment ID is required'),
    body('carerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required'),
    body('assessorUniqueId')
      .optional()
      .isString()
      .withMessage('Assessor unique ID must be a string'),
    body('overallRating')
      .isIn(['NOT_ASSESSED', 'NOT_COMPETENT', 'ADVANCED_BEGINNER', 'COMPETENT', 'PROFICIENT', 'EXPERT'])
      .withMessage('Valid overall rating is required'),
    body('knowledgeResponses')
      .optional()
      .isArray()
      .withMessage('Knowledge responses must be an array'),
    body('knowledgeResponses.*.questionId')
      .optional()
      .isString()
      .withMessage('Question ID is required for knowledge responses'),
    body('knowledgeResponses.*.carerAnswer')
      .optional()
      .isString()
      .withMessage('Carer answer is required for knowledge responses'),
    body('practicalResponses')
      .optional()
      .isArray()
      .withMessage('Practical responses must be an array'),
    body('practicalResponses.*.skillId')
      .optional()
      .isString()
      .withMessage('Skill ID is required for practical responses'),
    body('practicalResponses.*.rating')
      .optional()
      .isIn(['COMPETENT', 'NEEDS_SUPPORT', 'NOT_APPLICABLE'])
      .withMessage('Valid practical rating is required'),
    body('emergencyResponses')
      .optional()
      .isArray()
      .withMessage('Emergency responses must be an array'),
    body('emergencyResponses.*.questionId')
      .optional()
      .isString()
      .withMessage('Question ID is required for emergency responses'),
    body('emergencyResponses.*.carerAnswer')
      .optional()
      .isString()
      .withMessage('Carer answer is required for emergency responses')
  ],
  validateRequest,
  assessmentController.submitAssessmentResponse
)

// GET /api/assessments/:id/responses - Get assessment responses
router.get(
  '/:id/responses',
  [
    param('id')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Assessment ID is required')
  ],
  validateRequest,
  assessmentController.getAssessmentResponses
)

export { router as assessmentRoutes }