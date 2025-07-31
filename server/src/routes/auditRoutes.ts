import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Audit logs endpoint - coming soon' })
})

router.get('/export', (req, res) => {
  res.json({ success: true, message: 'Export audit logs endpoint - coming soon' })
})

export { router as auditRoutes }