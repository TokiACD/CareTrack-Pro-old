import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// GET /api/admin-users - List admin users
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Admin users endpoint - coming soon',
  })
})

// POST /api/admin-users - Create admin user
router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Create admin user endpoint - coming soon',
  })
})

// PATCH /api/admin-users/:id - Update admin user
router.patch('/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update admin user endpoint - coming soon',
  })
})

// DELETE /api/admin-users/:id - Soft delete admin user
router.delete('/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Delete admin user endpoint - coming soon',
  })
})

// POST /api/admin-users/:id/restore - Restore admin user
router.post('/:id/restore', (req, res) => {
  res.json({
    success: true,
    message: 'Restore admin user endpoint - coming soon',
  })
})

export { router as adminUserRoutes }