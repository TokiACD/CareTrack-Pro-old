import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { auditService, AuditLogFilter, AuditLogPagination } from '../services/auditService'
import { audit, AuditAction } from '../middleware/audit'

const router = Router()
router.use(requireAuth)

// Get activity feed with filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const filters: AuditLogFilter = {
      action: req.query.action as string,
      entityType: req.query.entityType as string,
      entityId: req.query.entityId as string,
      performedByAdminId: req.query.performedByAdminId as string,
      search: req.query.search as string
    }
    
    // Parse date filters
    if (req.query.dateFrom) {
      filters.dateFrom = new Date(req.query.dateFrom as string)
    }
    if (req.query.dateTo) {
      filters.dateTo = new Date(req.query.dateTo as string)
    }
    
    const pagination: AuditLogPagination = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50
    }
    
    const result = await auditService.getActivityFeed(filters, pagination)
    
    // Generate descriptive messages for frontend
    const logsWithMessages = result.logs.map(log => ({
      ...log,
      message: auditService.generateActivityMessage(log)
    }))
    
    res.json({ 
      success: true, 
      data: {
        ...result,
        logs: logsWithMessages
      }
    })
  } catch (error) {
    next(error)
  }
})

// Get recent activity for dashboard
router.get('/recent', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    const logs = await auditService.getRecentActivity(limit)
    
    const logsWithMessages = logs.map(log => ({
      ...log,
      message: auditService.generateActivityMessage(log)
    }))
    
    res.json({ 
      success: true, 
      data: logsWithMessages
    })
  } catch (error) {
    next(error)
  }
})

// Get activity for specific entity
router.get('/entity/:entityType/:entityId', async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    
    const logs = await auditService.getActivityForEntity(entityType, entityId, limit)
    
    const logsWithMessages = logs.map(log => ({
      ...log,
      message: auditService.generateActivityMessage(log)
    }))
    
    res.json({ 
      success: true, 
      data: logsWithMessages
    })
  } catch (error) {
    next(error)
  }
})

// Get activity statistics  
router.get('/statistics', async (req, res, next) => {
  try {
    const stats = await auditService.getAuditStatistics()
    
    res.json({ 
      success: true, 
      data: stats
    })
  } catch (error) {
    console.error('Statistics error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics'
    })
  }
})

// Export audit logs
router.get('/export', audit(AuditAction.EXPORT, 'AUDIT_LOG'), async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'csv'
    
    const filters: AuditLogFilter = {
      action: req.query.action as string,
      entityType: req.query.entityType as string,
      entityId: req.query.entityId as string,
      performedByAdminId: req.query.performedByAdminId as string
    }
    
    // Parse date filters
    if (req.query.dateFrom) {
      filters.dateFrom = new Date(req.query.dateFrom as string)
    }
    if (req.query.dateTo) {
      filters.dateTo = new Date(req.query.dateTo as string)
    }
    
    const exportData = await auditService.exportAuditLogs(filters, format as 'csv' | 'json')
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`)
      res.send(exportData)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`)
      res.json(exportData)
    }
  } catch (error) {
    next(error)
  }
})

export { router as auditRoutes }