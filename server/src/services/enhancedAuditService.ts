import { PrismaClient } from '@prisma/client'
import { auditService } from './auditService'
import { emailService } from './emailService'

const prisma = new PrismaClient()

export interface SecurityEvent {
  type: 'FAILED_LOGIN' | 'PERMISSION_VIOLATION' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH' | 'CONCURRENT_SESSION' | 'IP_ANOMALY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  userId?: string
  userName?: string
  ipAddress?: string
  userAgent?: string
  details: Record<string, any>
  metadata?: Record<string, any>
}

export interface ComplianceLog {
  type: 'CQC_ACCESS' | 'DATA_RETENTION' | 'COMPETENCY_CONFIRMATION' | 'AUDIT_EXPORT' | 'BACKUP_OPERATION'
  category: 'REGULATORY' | 'SECURITY' | 'OPERATIONAL' | 'COMPLIANCE'
  description: string
  evidence?: Record<string, any>
  performedByAdminId: string
  performedByAdminName: string
  ipAddress?: string
  userAgent?: string
}

export interface AuditAlert {
  id: string
  type: 'SECURITY' | 'COMPLIANCE' | 'SYSTEM' | 'DATA_INTEGRITY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  details: Record<string, any>
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  createdAt: Date
}

class EnhancedAuditService {
  private failedLoginAttempts = new Map<string, number>()
  private suspiciousActivity = new Map<string, Date[]>()
  private activeAdminSessions = new Map<string, string[]>()

  /**
   * Enhanced login tracking with security monitoring
   */
  async logLogin(data: {
    adminId: string
    adminName: string
    email: string
    ipAddress: string
    userAgent: string
    sessionId: string
    success: boolean
    failureReason?: string
  }) {
    // Log the login attempt
    await auditService.log({
      action: data.success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      entityType: 'AUTHENTICATION',
      entityId: data.adminId,
      newValues: {
        email: data.email,
        success: data.success,
        sessionId: data.sessionId,
        ...(data.failureReason && { failureReason: data.failureReason })
      },
      performedByAdminId: data.adminId,
      performedByAdminName: data.adminName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })

    if (data.success) {
      // Reset failed attempts on successful login
      this.failedLoginAttempts.delete(data.email)
      
      // Track active session
      this.trackActiveSession(data.adminId, data.sessionId)
      
      // Check for concurrent sessions
      await this.checkConcurrentSessions(data.adminId, data.adminName, data.ipAddress)
      
    } else {
      // Track failed login attempts
      await this.trackFailedLogin(data.email, data.ipAddress, data.userAgent)
    }
  }

  /**
   * Track failed login attempts and detect suspicious activity
   */
  private async trackFailedLogin(email: string, ipAddress: string, userAgent: string) {
    const attempts = this.failedLoginAttempts.get(email) || 0
    this.failedLoginAttempts.set(email, attempts + 1)

    // Security event for multiple failed attempts
    if (attempts >= 3) {
      await this.logSecurityEvent({
        type: 'FAILED_LOGIN',
        severity: attempts >= 5 ? 'HIGH' : 'MEDIUM',
        userName: email,
        ipAddress,
        userAgent,
        details: {
          attempts: attempts + 1,
          threshold: 'EXCEEDED',
          action: 'ACCOUNT_LOCKOUT_CANDIDATE'
        }
      })

      // Create alert for admin users
      await this.createSecurityAlert({
        type: 'SECURITY',
        severity: 'HIGH',
        title: 'Multiple Failed Login Attempts',
        message: `User ${email} has ${attempts + 1} failed login attempts from IP ${ipAddress}`,
        details: {
          email,
          attempts: attempts + 1,
          ipAddress,
          userAgent,
          timestamp: new Date()
        }
      })
    }
  }

  /**
   * Track active sessions and detect concurrent access
   */
  private trackActiveSession(adminId: string, sessionId: string) {
    const sessions = this.activeAdminSessions.get(adminId) || []
    sessions.push(sessionId)
    this.activeAdminSessions.set(adminId, sessions)
  }

  /**
   * Check for concurrent sessions
   */
  private async checkConcurrentSessions(adminId: string, adminName: string, ipAddress: string) {
    const sessions = this.activeAdminSessions.get(adminId) || []
    
    if (sessions.length > 1) {
      await this.logSecurityEvent({
        type: 'CONCURRENT_SESSION',
        severity: 'MEDIUM',
        userId: adminId,
        userName: adminName,
        ipAddress,
        details: {
          sessionCount: sessions.length,
          maxAllowed: 1,
          action: 'CONCURRENT_ACCESS_DETECTED'
        }
      })
    }
  }

  /**
   * Log session termination
   */
  async logLogout(data: {
    adminId: string
    adminName: string
    sessionId: string
    ipAddress: string
    userAgent: string
    reason: 'USER_LOGOUT' | 'SESSION_TIMEOUT' | 'FORCED_LOGOUT'
  }) {
    await auditService.log({
      action: 'LOGOUT',
      entityType: 'AUTHENTICATION',
      entityId: data.adminId,
      newValues: {
        sessionId: data.sessionId,
        reason: data.reason,
        duration: 'calculated'
      },
      performedByAdminId: data.adminId,
      performedByAdminName: data.adminName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })

    // Remove session from active tracking
    const sessions = this.activeAdminSessions.get(data.adminId) || []
    const updatedSessions = sessions.filter(s => s !== data.sessionId)
    this.activeAdminSessions.set(data.adminId, updatedSessions)
  }

  /**
   * Log permission violations
   */
  async logPermissionViolation(data: {
    adminId: string
    adminName: string
    attemptedAction: string
    requiredPermission: string
    resourceType: string
    resourceId: string
    ipAddress: string
    userAgent: string
  }) {
    await auditService.log({
      action: 'PERMISSION_VIOLATION',
      entityType: 'SECURITY',
      entityId: data.resourceId,
      newValues: {
        attemptedAction: data.attemptedAction,
        requiredPermission: data.requiredPermission,
        resourceType: data.resourceType,
        denied: true
      },
      performedByAdminId: data.adminId,
      performedByAdminName: data.adminName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })

    await this.logSecurityEvent({
      type: 'PERMISSION_VIOLATION',
      severity: 'MEDIUM',
      userId: data.adminId,
      userName: data.adminName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      details: {
        attemptedAction: data.attemptedAction,
        requiredPermission: data.requiredPermission,
        resourceType: data.resourceType,
        resourceId: data.resourceId
      }
    })
  }

  /**
   * Log data access events
   */
  async logDataAccess(data: {
    adminId: string
    adminName: string
    dataType: string
    dataId: string
    action: 'VIEW' | 'DOWNLOAD' | 'EXPORT' | 'PRINT'
    sensitive?: boolean
    ipAddress: string
    userAgent: string
  }) {
    await auditService.log({
      action: `DATA_${data.action}`,
      entityType: data.dataType,
      entityId: data.dataId,
      newValues: {
        accessType: data.action,
        sensitive: data.sensitive || false,
        authorized: true
      },
      performedByAdminId: data.adminId,
      performedByAdminName: data.adminName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })

    // Special monitoring for sensitive data
    if (data.sensitive) {
      await this.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'LOW',
        userId: data.adminId,
        userName: data.adminName,
        ipAddress: data.ipAddress,
        details: {
          action: 'SENSITIVE_DATA_ACCESS',
          dataType: data.dataType,
          dataId: data.dataId,
          accessType: data.action
        }
      })
    }
  }

  /**
   * Log compliance events
   */
  async logComplianceEvent(data: ComplianceLog) {
    await auditService.log({
      action: `COMPLIANCE_${data.type}`,
      entityType: 'COMPLIANCE',
      entityId: `${data.type}_${Date.now()}`,
      newValues: {
        type: data.type,
        category: data.category,
        description: data.description,
        evidence: data.evidence
      },
      performedByAdminId: data.performedByAdminId,
      performedByAdminName: data.performedByAdminName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  }

  /**
   * Log competency confirmations for CQC compliance
   */
  async logCompetencyConfirmation(data: {
    carerId: string
    carerName: string
    assessmentId: string
    assessmentName: string
    competencyLevel: string
    confirmedBy: string
    confirmedByName: string
    legalConfirmation: boolean
    ipAddress: string
    userAgent: string
  }) {
    await this.logComplianceEvent({
      type: 'COMPETENCY_CONFIRMATION',
      category: 'REGULATORY',
      description: `Competency confirmation for ${data.carerName} - ${data.assessmentName}`,
      evidence: {
        carerId: data.carerId,
        carerName: data.carerName,
        assessmentId: data.assessmentId,
        assessmentName: data.assessmentName,
        competencyLevel: data.competencyLevel,
        legalConfirmation: data.legalConfirmation,
        confirmationTimestamp: new Date()
      },
      performedByAdminId: data.confirmedBy,
      performedByAdminName: data.confirmedByName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  }

  /**
   * Log security events
   */
  async logSecurityEvent(event: SecurityEvent) {
    try {
      // Store in database for persistence
      await prisma.securityEvent.create({
        data: {
          type: event.type,
          severity: event.severity,
          userId: event.userId,
          userName: event.userName,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: event.details,
          metadata: event.metadata || {}
        }
      })

      // Create alert for high/critical severity events
      if (['HIGH', 'CRITICAL'].includes(event.severity)) {
        await this.createSecurityAlert({
          type: 'SECURITY',
          severity: event.severity,
          title: `Security Event: ${event.type}`,
          message: this.formatSecurityEventMessage(event),
          details: event.details
        })
      }

    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  /**
   * Create security alerts
   */
  private async createSecurityAlert(alert: Omit<AuditAlert, 'id' | 'acknowledged' | 'createdAt'>) {
    try {
      const newAlert = await prisma.auditAlert.create({
        data: {
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          details: alert.details,
          acknowledged: false
        }
      })

      // Send immediate email for critical alerts
      if (alert.severity === 'CRITICAL') {
        await this.sendCriticalAlertEmail(newAlert)
      }

      return newAlert
    } catch (error) {
      console.error('Failed to create security alert:', error)
    }
  }

  /**
   * Send critical alert emails to all admin users
   */
  private async sendCriticalAlertEmail(alert: any) {
    try {
      const adminUsers = await prisma.adminUser.findMany({
        where: { 
          deletedAt: null,
          isActive: true
        },
        select: {
          email: true,
          name: true
        }
      })

      for (const admin of adminUsers) {
        await emailService.sendEmail({
          to: admin.email,
          subject: `🚨 CRITICAL SECURITY ALERT: ${alert.title}`,
          text: `
Dear ${admin.name},

A critical security alert has been triggered in CareTrack Pro:

Alert: ${alert.title}
Severity: ${alert.severity}
Time: ${new Date().toISOString()}

Message: ${alert.message}

Please log into the system immediately to review this alert and take appropriate action.

This is an automated security notification.

CareTrack Pro Security System
          `.trim(),
          html: `
            <h2>🚨 CRITICAL SECURITY ALERT</h2>
            <p>Dear ${admin.name},</p>
            <p>A critical security alert has been triggered in CareTrack Pro:</p>
            <ul>
              <li><strong>Alert:</strong> ${alert.title}</li>
              <li><strong>Severity:</strong> <span style="color: red; font-weight: bold;">${alert.severity}</span></li>
              <li><strong>Time:</strong> ${new Date().toISOString()}</li>
            </ul>
            <p><strong>Message:</strong> ${alert.message}</p>
            <p>Please log into the system immediately to review this alert and take appropriate action.</p>
            <p><em>This is an automated security notification.</em></p>
            <p>CareTrack Pro Security System</p>
          `
        })
      }
    } catch (error) {
      console.error('Failed to send critical alert email:', error)
    }
  }

  /**
   * Format security event messages
   */
  private formatSecurityEventMessage(event: SecurityEvent): string {
    switch (event.type) {
      case 'FAILED_LOGIN':
        return `Multiple failed login attempts detected for user ${event.userName} from IP ${event.ipAddress}`
      case 'PERMISSION_VIOLATION':
        return `User ${event.userName} attempted unauthorized access to ${event.details.resourceType}`
      case 'SUSPICIOUS_ACTIVITY':
        return `Suspicious activity detected for user ${event.userName}`
      case 'CONCURRENT_SESSION':
        return `User ${event.userName} has multiple concurrent sessions active`
      case 'IP_ANOMALY':
        return `User ${event.userName} logged in from unusual IP address ${event.ipAddress}`
      default:
        return `Security event ${event.type} detected`
    }
  }

  /**
   * Get security dashboard data
   */
  async getSecurityDashboard() {
    try {
      const [
        recentSecurityEvents,
        unacknowledgedAlerts,
        securityStatistics,
        recentFailedLogins,
        activeSessions
      ] = await Promise.all([
        prisma.securityEvent.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.auditAlert.findMany({
          where: { acknowledged: false },
          orderBy: { createdAt: 'desc' }
        }),
        this.getSecurityStatistics(),
        this.getRecentFailedLogins(),
        this.getActiveSessionsCount()
      ])

      return {
        recentSecurityEvents,
        unacknowledgedAlerts,
        statistics: securityStatistics,
        recentFailedLogins,
        activeSessions
      }
    } catch (error) {
      console.error('Failed to get security dashboard:', error)
      return {
        recentSecurityEvents: [],
        unacknowledgedAlerts: [],
        statistics: {
          today: { total: 0, failed: 0, violations: 0 },
          thisWeek: { total: 0, failed: 0, violations: 0 },
          thisMonth: { total: 0, failed: 0, violations: 0 }
        },
        recentFailedLogins: [],
        activeSessions: 0
      }
    }
  }

  /**
   * Get security statistics
   */
  private async getSecurityStatistics() {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [todayEvents, weekEvents, monthEvents] = await Promise.all([
      prisma.securityEvent.findMany({ where: { createdAt: { gte: today } } }),
      prisma.securityEvent.findMany({ where: { createdAt: { gte: thisWeek } } }),
      prisma.securityEvent.findMany({ where: { createdAt: { gte: thisMonth } } })
    ])

    return {
      today: this.categorizeEvents(todayEvents),
      thisWeek: this.categorizeEvents(weekEvents),
      thisMonth: this.categorizeEvents(monthEvents)
    }
  }

  /**
   * Categorize security events
   */
  private categorizeEvents(events: any[]) {
    return {
      total: events.length,
      failed: events.filter(e => e.type === 'FAILED_LOGIN').length,
      violations: events.filter(e => e.type === 'PERMISSION_VIOLATION').length,
      suspicious: events.filter(e => e.type === 'SUSPICIOUS_ACTIVITY').length,
      critical: events.filter(e => e.severity === 'CRITICAL').length
    }
  }

  /**
   * Get recent failed logins
   */
  private async getRecentFailedLogins() {
    return prisma.auditLog.findMany({
      where: { action: 'LOGIN_FAILED' },
      take: 10,
      orderBy: { performedAt: 'desc' },
      select: {
        performedByAdminName: true,
        ipAddress: true,
        performedAt: true,
        newValues: true
      }
    })
  }

  /**
   * Get active sessions count
   */
  private getActiveSessionsCount() {
    return Array.from(this.activeAdminSessions.values())
      .reduce((total, sessions) => total + sessions.length, 0)
  }

  /**
   * Acknowledge security alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string) {
    return prisma.auditAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date()
      }
    })
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date) {
    const complianceLogs = await prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'COMPLIANCE_' },
        performedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { performedAt: 'desc' }
    })

    const securityEvents = await prisma.securityEvent.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return {
      period: { startDate, endDate },
      complianceLogs,
      securityEvents,
      summary: {
        totalComplianceEvents: complianceLogs.length,
        totalSecurityEvents: securityEvents.length,
        criticalEvents: securityEvents.filter(e => e.severity === 'CRITICAL').length,
        highSeverityEvents: securityEvents.filter(e => e.severity === 'HIGH').length
      }
    }
  }

  /**
   * Monitor data integrity
   */
  async monitorDataIntegrity() {
    try {
      // Check for orphaned records
      const integrity = {
        orphanedCarerAssignments: await this.checkOrphanedCarerAssignments(),
        orphanedTaskProgress: await this.checkOrphanedTaskProgress(),
        orphanedAssessmentResponses: await this.checkOrphanedAssessmentResponses(),
        inconsistentCompetencyRatings: await this.checkInconsistentCompetencyRatings()
      }

      // Log data integrity check
      await auditService.logSystemEvent({
        action: 'DATA_INTEGRITY_CHECK',
        entityType: 'SYSTEM',
        entityId: 'data-integrity',
        newValues: {
          checkTimestamp: new Date(),
          results: integrity,
          issuesFound: Object.values(integrity).some(count => count > 0)
        }
      })

      return integrity
    } catch (error) {
      console.error('Data integrity check failed:', error)
      return {
        orphanedCarerAssignments: 0,
        orphanedTaskProgress: 0,
        orphanedAssessmentResponses: 0,
        inconsistentCompetencyRatings: 0
      }
    }
  }

  private async checkOrphanedCarerAssignments() {
    return prisma.carerPackageAssignment.count({
      where: {
        OR: [
          { carer: null },
          { carePackage: null }
        ]
      }
    })
  }

  private async checkOrphanedTaskProgress() {
    return prisma.taskProgress.count({
      where: {
        OR: [
          { carer: null },
          { task: null },
          { carePackage: null }
        ]
      }
    })
  }

  private async checkOrphanedAssessmentResponses() {
    return prisma.assessmentResponse.count({
      where: {
        OR: [
          { carer: null },
          { assessment: null }
        ]
      }
    })
  }

  private async checkInconsistentCompetencyRatings() {
    // This would check for competency ratings that don't match assessment results
    return 0 // Placeholder - would need complex business logic
  }
}

export const enhancedAuditService = new EnhancedAuditService()