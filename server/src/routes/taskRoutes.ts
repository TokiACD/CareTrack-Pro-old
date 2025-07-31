import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Tasks endpoint - coming soon' })
})

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create task endpoint - coming soon' })
})

router.patch('/:id', (req, res) => {
  res.json({ success: true, message: 'Update task endpoint - coming soon' })
})

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Delete task endpoint - coming soon' })
})

router.post('/:id/restore', (req, res) => {
  res.json({ success: true, message: 'Restore task endpoint - coming soon' })
})

export { router as taskRoutes }