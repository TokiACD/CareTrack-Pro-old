import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Carers endpoint - coming soon' })
})

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create carer endpoint - coming soon' })
})

router.patch('/:id', (req, res) => {
  res.json({ success: true, message: 'Update carer endpoint - coming soon' })
})

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Delete carer endpoint - coming soon' })
})

router.post('/:id/restore', (req, res) => {
  res.json({ success: true, message: 'Restore carer endpoint - coming soon' })
})

router.get('/:id/progress', (req, res) => {
  res.json({ success: true, data: {}, message: 'Carer progress endpoint - coming soon' })
})

router.get('/:id/competencies', (req, res) => {
  res.json({ success: true, data: [], message: 'Carer competencies endpoint - coming soon' })
})

export { router as carerRoutes }