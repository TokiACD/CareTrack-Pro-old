import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Rota endpoint - coming soon' })
})

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create rota entry endpoint - coming soon' })
})

router.patch('/:id', (req, res) => {
  res.json({ success: true, message: 'Update rota entry endpoint - coming soon' })
})

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Delete rota entry endpoint - coming soon' })
})

router.post('/validate', (req, res) => {
  res.json({ success: true, message: 'Validate rota endpoint - coming soon' })
})

export { router as rotaRoutes }