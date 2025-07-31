import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.post('/update', (req, res) => {
  res.json({ success: true, message: 'Update progress endpoint - coming soon' })
})

router.post('/bulk-update', (req, res) => {
  res.json({ success: true, message: 'Bulk update progress endpoint - coming soon' })
})

router.get('/:carerId/pdf', (req, res) => {
  res.json({ success: true, message: 'Generate PDF endpoint - coming soon' })
})

export { router as progressRoutes }