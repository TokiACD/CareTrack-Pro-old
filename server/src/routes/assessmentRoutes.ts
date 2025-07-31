import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Assessments endpoint - coming soon' })
})

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create assessment endpoint - coming soon' })
})

router.patch('/:id', (req, res) => {
  res.json({ success: true, message: 'Update assessment endpoint - coming soon' })
})

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Delete assessment endpoint - coming soon' })
})

router.post('/:id/responses', (req, res) => {
  res.json({ success: true, message: 'Submit assessment response endpoint - coming soon' })
})

export { router as assessmentRoutes }