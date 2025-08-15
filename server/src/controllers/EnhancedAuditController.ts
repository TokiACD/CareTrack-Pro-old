import { Request, Response, NextFunction } from 'express'
import { prisma } from '../index'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { auditService } from '../services/auditService'
import { enhancedAuditService } from '../services/enhancedAuditService'

export class EnhancedAuditController {
  // Get comprehensive audit dashboard data
  getAuditDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const admin = req.user!

    // Get security dashboard
    const securityDashboard = await enhancedAuditService.getSecurityDashboard()
    
    // Get regular audit statistics
    const auditStats = await auditService.getAuditStatistics()
    
    // Get recent activity with enhanced messages
    const recentActivity = await auditService.getRecentActivity(20)
    const recentActivityWithMessages = recentActivity.map(log => ({
      ...log,
      message: auditService.generateActivityMessage(log),
      riskLevel: this.assessRiskLevel(log)
    }))

    // Data integrity check
    const dataIntegrity = await enhancedAuditService.monitorDataIntegrity()

    res.json({
      success: true,
      data: {
        security: securityDashboard,
        audit: auditStats,
        recentActivity: recentActivityWithMessages,
        dataIntegrity,
        timestamp: new Date()
      }
    })
  })

  // Get real-time activity feed with live updates
  getActivityFeed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      entityId,
      performedByAdminId,
      severity,
      dateFrom,
      dateTo,
      search
    } = req.query

    const filters: any = {
      action: action as string,
      entityType: entityType as string,
      entityId: entityId as string,
      performedByAdminId: performedByAdminId as string,
      search: search as string
    }

    // Parse date filters
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string)
    }
    if (dateTo) {
      filters.dateTo = new Date(dateTo as string)
    }

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    }

    const result = await auditService.getActivityFeed(filters, pagination)

    // Enhance with risk assessment and security context
    const enhancedLogs = result.logs.map(log => ({
      ...log,
      message: auditService.generateActivityMessage(log),
      riskLevel: this.assessRiskLevel(log),
      securityContext: this.getSecurityContext(log),
      complianceRelevant: this.isComplianceRelevant(log)
    }))

    res.json({
      success: true,
      data: {
        ...result,
        logs: enhancedLogs
      }
    })
  })

  // Get security monitoring data
  getSecurityMonitoring = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { timeframe = '24h' } = req.query

    let startDate: Date
    const endDate = new Date()

    switch (timeframe) {
      case '1h':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get security events
    const securityEvents = await prisma.securityEvent.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get failed login attempts
    const failedLogins = await prisma.auditLog.findMany({
      where: {
        action: 'LOGIN_FAILED',
        performedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { performedAt: 'desc' }
    })

    // Get permission violations
    const permissionViolations = await prisma.auditLog.findMany({
      where: {
        action: 'PERMISSION_VIOLATION',
        performedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { performedAt: 'desc' }
    })

    // Aggregate statistics
    const stats = {
      totalSecurityEvents: securityEvents.length,
      criticalEvents: securityEvents.filter(e => e.severity === 'CRITICAL').length,
      highSeverityEvents: securityEvents.filter(e => e.severity === 'HIGH').length,
      failedLoginAttempts: failedLogins.length,
      permissionViolations: permissionViolations.length,
      timeframe,
      period: { startDate, endDate }
    }

    res.json({
      success: true,
      data: {
        stats,
        securityEvents,
        failedLogins,
        permissionViolations
      }
    })
  })

  // Get unacknowledged alerts
  getAlerts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { acknowledged = 'false', severity, type } = req.query

    const where: any = {}
    
    if (acknowledged === 'false') {
      where.acknowledged = false
    }
    
    if (severity) {
      where.severity = severity
    }
    
    if (type) {
      where.type = type
    }

    const alerts = await prisma.auditAlert.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    res.json({
      success: true,
      data: alerts
    })
  })

  // Acknowledge alert
  acknowledgeAlert = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { alertId } = req.params
    const admin = req.user!

    const alert = await enhancedAuditService.acknowledgeAlert(alertId, admin.id)

    // Log the acknowledgment
    await auditService.log({
      action: 'ACKNOWLEDGE_SECURITY_ALERT',
      entityType: 'SECURITY_ALERT',
      entityId: alertId,
      newValues: {
        acknowledgedBy: admin.name,
        acknowledgedAt: new Date()
      },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json({
      success: true,
      data: alert,
      message: 'Alert acknowledged successfully'
    })
  })

  // Generate compliance report
  generateComplianceReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { startDate, endDate, format = 'json' } = req.query
    const admin = req.user!

    if (!startDate || !endDate) {
      throw createError(400, 'Start date and end date are required')
    }

    const start = new Date(startDate as string)
    const end = new Date(endDate as string)

    const report = await enhancedAuditService.generateComplianceReport(start, end)

    // Log the report generation
    await auditService.log({
      action: 'GENERATE_COMPLIANCE_REPORT',
      entityType: 'COMPLIANCE_REPORT',
      entityId: `report_${Date.now()}`,
      newValues: {
        startDate: start,
        endDate: end,
        format,
        summary: report.summary
      },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`)
      res.send(this.convertComplianceReportToCSV(report))
    } else {
      res.json({
        success: true,
        data: report
      })
    }
  })

  // Get user activity summary
  getUserActivitySummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params
    const { timeframe = '30d' } = req.query

    let startDate: Date
    const endDate = new Date()

    switch (timeframe) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get user's audit logs
    const userLogs = await prisma.auditLog.findMany({
      where: {
        performedByAdminId: userId,
        performedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { performedAt: 'desc' }
    })

    // Get user's security events
    const securityEvents = await prisma.securityEvent.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Aggregate statistics
    const actionCounts = userLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const summary = {
      userId,
      timeframe,
      period: { startDate, endDate },
      totalActions: userLogs.length,
      securityEvents: securityEvents.length,
      actionBreakdown: actionCounts,
      riskScore: this.calculateUserRiskScore(userLogs, securityEvents),
      lastActivity: userLogs[0]?.performedAt || null
    }

    res.json({
      success: true,
      data: {
        summary,
        recentLogs: userLogs.slice(0, 50),
        securityEvents
      }
    })
  })

  // Export enhanced audit logs
  exportEnhancedAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const admin = req.user!
    const { format = 'csv', includeSecurityEvents = 'true' } = req.query

    const filters: any = {
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

    // Get audit logs
    const auditLogs = await auditService.exportAuditLogs(filters, 'json') as any[]

    let exportData = auditLogs

    // Include security events if requested
    if (includeSecurityEvents === 'true') {
      const securityEventWhere: any = {}
      if (filters.dateFrom || filters.dateTo) {
        securityEventWhere.createdAt = {}
        if (filters.dateFrom) securityEventWhere.createdAt.gte = filters.dateFrom
        if (filters.dateTo) securityEventWhere.createdAt.lte = filters.dateTo
      }

      const securityEvents = await prisma.securityEvent.findMany({
        where: securityEventWhere,
        orderBy: { createdAt: 'desc' }
      })

      // Combine and sort by timestamp
      exportData = [
        ...auditLogs.map(log => ({ ...log, type: 'AUDIT' })),
        ...securityEvents.map(event => ({ ...event, type: 'SECURITY', performedAt: event.createdAt }))
      ].sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
    }

    // Log the export
    await auditService.log({
      action: 'EXPORT_ENHANCED_AUDIT_LOGS',
      entityType: 'AUDIT_EXPORT',
      entityId: `export_${Date.now()}`,
      newValues: {
        format,
        includeSecurityEvents,
        recordCount: exportData.length,
        filters
      },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="enhanced-audit-logs-${new Date().toISOString().split('T')[0]}.csv"`)
      res.send(this.convertEnhancedLogsToCSV(exportData))
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="enhanced-audit-logs-${new Date().toISOString().split('T')[0]}.json"`)
      res.json(exportData)
    }
  })

  // Helper methods
  private assessRiskLevel(log: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const highRiskActions = [
      'DELETE', 'PERMANENT_DELETE', 'BULK_DELETE', 'PERMISSION_VIOLATION',
      'LOGIN_FAILED', 'EXPORT_DATA', 'MODIFY_USER_PERMISSIONS'
    ]
    
    const mediumRiskActions = [
      'CREATE_ADMIN', 'UPDATE_ADMIN', 'INVITE_USER', 'SET_COMPETENCY',
      'ASSIGN_CARER', 'CREATE_SHIFT'
    ]

    if (highRiskActions.some(action => log.action.includes(action))) {
      return 'HIGH'
    }
    
    if (mediumRiskActions.some(action => log.action.includes(action))) {
      return 'MEDIUM'
    }
    
    return 'LOW'
  }

  private getSecurityContext(log: any): any {
    return {
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.performedAt,
      entityAffected: log.entityType,
      dataModified: !!(log.oldValues || log.newValues)
    }
  }

  private isComplianceRelevant(log: any): boolean {
    const complianceActions = [
      'SET_COMPETENCY', 'COMPLETE_ASSESSMENT', 'CONFIRM_COMPETENCY',
      'DELETE', 'RESTORE', 'EXPORT_DATA', 'GENERATE_PDF',
      'CREATE_CARER', 'UPDATE_CARER', 'ASSIGN_CARER'
    ]
    
    return complianceActions.some(action => log.action.includes(action))
  }

  private calculateUserRiskScore(logs: any[], securityEvents: any[]): number {
    let score = 0
    
    // Base score from activity volume
    score += Math.min(logs.length * 0.1, 10)
    
    // Security events significantly increase risk
    score += securityEvents.length * 5
    
    // High-risk actions
    const highRiskCount = logs.filter(log => 
      this.assessRiskLevel(log) === 'HIGH'
    ).length
    score += highRiskCount * 2
    
    // Failed logins
    const failedLogins = logs.filter(log => 
      log.action === 'LOGIN_FAILED'
    ).length
    score += failedLogins * 3
    
    return Math.min(score, 100) // Cap at 100
  }

  private convertComplianceReportToCSV(report: any): string {
    const headers = [
      'Date/Time', 'Type', 'Category', 'Description', 'Performed By',
      'IP Address', 'Details'
    ]

    const rows = report.complianceLogs.map((log: any) => [
      log.performedAt,
      'COMPLIANCE',
      log.entityType,
      auditService.generateActivityMessage(log),
      log.performedByAdminName,
      log.ipAddress || '',
      JSON.stringify(log.newValues || {})
    ])

    const securityRows = report.securityEvents.map((event: any) => [
      event.createdAt,
      'SECURITY',
      event.type,
      event.type,
      event.userName || 'System',
      event.ipAddress || '',
      JSON.stringify(event.details)
    ])

    const allRows = [...rows, ...securityRows]

    const csvContent = [headers, ...allRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    return csvContent
  }

  private convertEnhancedLogsToCSV(logs: any[]): string {
    const headers = [
      'Date/Time', 'Type', 'Action', 'Entity Type', 'Entity ID',
      'Performed By', 'IP Address', 'Risk Level', 'Compliance Relevant',
      'Details'
    ]

    const rows = logs.map(log => [
      log.performedAt || log.createdAt,
      log.type,
      log.action || log.type,
      log.entityType,
      log.entityId || log.id,
      log.performedByAdminName || log.userName || 'System',
      log.ipAddress || '',
      log.type === 'SECURITY' ? log.severity : this.assessRiskLevel(log),
      log.type === 'AUDIT' ? this.isComplianceRelevant(log) : false,
      JSON.stringify(log.details || log.newValues || {})
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    return csvContent
  }
}