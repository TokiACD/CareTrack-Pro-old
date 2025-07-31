import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Assignments endpoint - coming soon' })
})

router.post('/carer-package', (req, res) => {
  res.json({ success: true, message: 'Assign carer to package endpoint - coming soon' })
})

router.post('/task-package', (req, res) => {
  res.json({ success: true, message: 'Assign task to package endpoint - coming soon' })
})

router.delete('/carer-package/:id', (req, res) => {
  res.json({ success: true, message: 'Remove carer assignment endpoint - coming soon' })
})

router.delete('/task-package/:id', (req, res) => {
  res.json({ success: true, message: 'Remove task assignment endpoint - coming soon' })
})

export { router as assignmentRoutes }