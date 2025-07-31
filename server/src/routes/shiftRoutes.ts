import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Shifts endpoint - coming soon' })
})

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create shift endpoint - coming soon' })
})

router.post('/send', (req, res) => {
  res.json({ success: true, message: 'Send shift endpoint - coming soon' })
})

export { router as shiftRoutes }