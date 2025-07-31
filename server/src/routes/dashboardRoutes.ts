import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/summary', (req, res) => {
  res.json({ 
    success: true, 
    data: {
      totalCarers: 0,
      totalActiveCarers: 0,
      totalCarePackages: 0,
      totalTasks: 0,
      carersNeedingAssessment: [],
      recentActivity: []
    }, 
    message: 'Dashboard summary endpoint - coming soon' 
  })
})

export { router as dashboardRoutes }