import { Router } from 'express'
import { emailQueueService } from '../services/EmailQueueService'
import { emailService } from '../services/EmailService'
import JobInitializer from '../jobs/JobInitializer'

const router = Router()

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  // Simple authentication check - user must be logged in
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    })
  }
  next()
})

/**
 * Test endpoint for email queue system (development only)
 */
if (process.env.NODE_ENV === 'development') {
  router.get('/test', async (req, res) => {
    try {
      // Check if job system is initialized
      const isInitialized = JobInitializer.isInitialized()
      
      if (!isInitialized) {
        return res.json({
          success: false,
          message: 'Job processing system not initialized',
          fallback: 'Email operations will use synchronous processing',
          details: {
            jobSystemStatus: 'not-initialized',
            emailServiceStatus: await emailService.testConnection()
          }
        })
      }

      // Get system status
      const systemStatus = await JobInitializer.getSystemStatus()
      
      res.json({
        success: true,
        message: 'Email queue system status',
        data: systemStatus
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  router.post('/test-email', async (req, res) => {
    try {
      const { type = 'admin-invitation', priority = 5 } = req.body
      
      // Check if job system is initialized
      const isInitialized = JobInitializer.isInitialized()
      
      if (!isInitialized) {
        return res.json({
          success: false,
          message: 'Job processing system not initialized - cannot queue emails',
          fallback: 'Use direct email service instead'
        })
      }

      // Test data for different email types
      const testEmailData = {
        'admin-invitation': {
          to: 'test@example.com',
          adminName: 'Test Admin',
          invitedByName: 'System Administrator',
          invitationToken: 'test-token',
          acceptUrl: 'http://localhost:5000/invitation/accept?token=test-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        },
        'password-reset': {
          to: 'test@example.com',
          name: 'Test User',
          resetUrl: 'http://localhost:5000/reset-password?token=test-token'
        }
      }

      const emailData = testEmailData[type as keyof typeof testEmailData]
      if (!emailData) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email type. Supported types: admin-invitation, password-reset'
        })
      }

      // Queue the test email
      if (type === 'admin-invitation') {
        await emailQueueService.queueAdminInvitation(emailData as any, { priority })
      } else if (type === 'password-reset') {
        await emailQueueService.queuePasswordReset(emailData as any, { priority })
      }

      res.json({
        success: true,
        message: `Test ${type} email queued successfully`,
        data: {
          emailType: type,
          priority,
          recipient: emailData.to
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}

/**
 * Get email queue statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const isInitialized = JobInitializer.isInitialized()
    
    if (!isInitialized) {
      return res.json({
        success: false,
        message: 'Job processing system not initialized',
        stats: null
      })
    }

    const stats = await emailQueueService.getEmailQueueStats()
    
    res.json({
      success: true,
      message: 'Email queue statistics',
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Health check for email queue system
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await emailQueueService.healthCheck()
    
    res.json({
      success: healthCheck.emailQueue && healthCheck.jobProcessor,
      message: 'Email queue health check',
      data: healthCheck
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Retry failed email jobs (admin only)
 */
router.post('/retry-failed', async (req, res) => {
  try {
    // Check user role (should be admin)
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }

    const isInitialized = JobInitializer.isInitialized()
    
    if (!isInitialized) {
      return res.json({
        success: false,
        message: 'Job processing system not initialized'
      })
    }

    const result = await emailQueueService.retryFailedEmails()
    
    res.json({
      success: true,
      message: 'Failed email jobs retry initiated',
      data: result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Clean up old completed jobs (admin only)
 */
router.post('/cleanup', async (req, res) => {
  try {
    // Check user role (should be admin)
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }

    const { olderThanHours = 24 } = req.body

    const isInitialized = JobInitializer.isInitialized()
    
    if (!isInitialized) {
      return res.json({
        success: false,
        message: 'Job processing system not initialized'
      })
    }

    const result = await emailQueueService.cleanupCompletedJobs(olderThanHours)
    
    res.json({
      success: true,
      message: 'Job cleanup completed',
      data: result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export { router as emailQueueRoutes }