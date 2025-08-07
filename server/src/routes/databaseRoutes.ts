import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { healthCheckHandler } from '../services/databaseMonitoring'
import { databaseMonitoring } from '../services/databaseMonitoring'
import { auditLogger } from '../services/auditService'

const router = Router()

/**
 * Database health check endpoint
 * GET /api/database/health
 */
router.get('/health', authenticate, healthCheckHandler)

/**
 * Database performance metrics endpoint
 * GET /api/database/metrics
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    // Only allow admin access
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    const metrics = await databaseMonitoring.collectMetrics()
    
    await auditLogger.logSystemEvent({
      action: 'DATABASE_METRICS_ACCESSED',
      entityType: 'DATABASE',
      entityId: 'main',
      severity: 'INFO',
      details: { requestedBy: req.user.id },
      performedByAdminId: req.user.id,
      performedByAdminName: req.user.name || 'Unknown',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error retrieving database metrics:', error)
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Database performance report endpoint
 * GET /api/database/report
 */
router.get('/report', authenticate, async (req, res) => {
  try {
    // Only allow admin access
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    const report = await databaseMonitoring.generatePerformanceReport()
    
    await auditLogger.logSystemEvent({
      action: 'DATABASE_REPORT_GENERATED',
      entityType: 'DATABASE',
      entityId: 'main',
      severity: 'INFO',
      details: { 
        requestedBy: req.user.id,
        reportStatus: report.metrics.health.status
      },
      performedByAdminId: req.user.id,
      performedByAdminName: req.user.name || 'Unknown',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error generating database report:', error)
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate database report',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Reset performance metrics endpoint
 * POST /api/database/reset-metrics
 */
router.post('/reset-metrics', authenticate, async (req, res) => {
  try {
    // Only allow admin access
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    databaseMonitoring.resetMetrics()
    
    await auditLogger.logSystemEvent({
      action: 'DATABASE_METRICS_RESET',
      entityType: 'DATABASE',
      entityId: 'main',
      severity: 'INFO',
      details: { resetBy: req.user.id },
      performedByAdminId: req.user.id,
      performedByAdminName: req.user.name || 'Unknown',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    
    res.json({
      success: true,
      message: 'Database metrics reset successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error resetting database metrics:', error)
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset database metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router