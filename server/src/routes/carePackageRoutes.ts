import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Care packages endpoint - coming soon' })
})

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create care package endpoint - coming soon' })
})

router.patch('/:id', (req, res) => {
  res.json({ success: true, message: 'Update care package endpoint - coming soon' })
})

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Delete care package endpoint - coming soon' })
})

router.post('/:id/restore', (req, res) => {
  res.json({ success: true, message: 'Restore care package endpoint - coming soon' })
})

export { router as carePackageRoutes }