import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Recycle bin endpoint - coming soon' })
})

router.post('/restore', (req, res) => {
  res.json({ success: true, message: 'Restore item endpoint - coming soon' })
})

router.delete('/permanent-delete', (req, res) => {
  res.json({ success: true, message: 'Permanent delete endpoint - coming soon' })
})

router.post('/cleanup', (req, res) => {
  res.json({ success: true, message: 'Cleanup recycle bin endpoint - coming soon' })
})

export { router as recycleBinRoutes }