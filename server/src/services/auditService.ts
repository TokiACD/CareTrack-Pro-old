import { prisma } from '../index'

export interface AuditLogData {
  action: string
  entityType: string
  entityId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  performedByAdminId: string
  performedByAdminName: string
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogFilter {
  action?: string
  entityType?: string
  entityId?: string
  performedByAdminId?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

export interface AuditLogPagination {
  page?: number
  limit?: number
}

export interface AuditLogResponse {
  logs: any[]
  total: number
  page: number
  totalPages: number
}

export enum AuditActionType {
  // Core CRUD operations
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  
  // Authentication actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // User management actions
  INVITE_USER = 'INVITE_USER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
  DECLINE_INVITATION = 'DECLINE_INVITATION',
  RESEND_INVITATION = 'RESEND_INVITATION',
  
  // Assignment actions
  ASSIGN_CARER = 'ASSIGN_CARER',
  UNASSIGN_CARER = 'UNASSIGN_CARER',
  ASSIGN_TASK = 'ASSIGN_TASK',
  UNASSIGN_TASK = 'UNASSIGN_TASK',
  
  // Assessment actions
  COMPLETE_ASSESSMENT = 'COMPLETE_ASSESSMENT',
  SET_COMPETENCY = 'SET_COMPETENCY',
  UPDATE_PROGRESS = 'UPDATE_PROGRESS',
  
  // Scheduling actions
  CREATE_SHIFT = 'CREATE_SHIFT',
  ASSIGN_SHIFT = 'ASSIGN_SHIFT',
  CONFIRM_SHIFT = 'CONFIRM_SHIFT',
  CANCEL_SHIFT = 'CANCEL_SHIFT',
  
  // Data actions
  EXPORT_DATA = 'EXPORT_DATA',
  IMPORT_DATA = 'IMPORT_DATA',
  BULK_UPDATE = 'BULK_UPDATE',
  
  // System actions
  VIEW_REPORT = 'VIEW_REPORT',
  GENERATE_PDF = 'GENERATE_PDF',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE'
}

export enum AuditEntityType {
  ADMIN_USER = 'ADMIN_USER',
  CARER = 'CARER',
  CARE_PACKAGE = 'CARE_PACKAGE',
  TASK = 'TASK',
  ASSESSMENT = 'ASSESSMENT',
  ASSESSMENT_RESPONSE = 'ASSESSMENT_RESPONSE',
  INVITATION = 'INVITATION',
  SHIFT = 'SHIFT',
  ROTA_ENTRY = 'ROTA_ENTRY',
  COMPETENCY_RATING = 'COMPETENCY_RATING',
  TASK_PROGRESS = 'TASK_PROGRESS',
  ASSIGNMENT = 'ASSIGNMENT',
  SYSTEM = 'SYSTEM'
}

class AuditService {
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldValues: data.oldValues || undefined,
          newValues: data.newValues || undefined,
          performedByAdminId: data.performedByAdminId,
          performedByAdminName: data.performedByAdminName,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      })
    } catch (error) {
      console.error('Audit logging failed:', error)
    }
  }

  async getRecentActivity(limit: number = 50) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { performedAt: 'desc' },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  async getActivityFeed(filters: AuditLogFilter = {}, pagination: AuditLogPagination = {}): Promise<AuditLogResponse> {
    const { page = 1, limit = 50 } = pagination
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}
    
    if (filters.action) {
      whereClause.action = filters.action
    }
    
    if (filters.entityType) {
      whereClause.entityType = filters.entityType
    }
    
    if (filters.entityId) {
      whereClause.entityId = filters.entityId
    }
    
    if (filters.performedByAdminId) {
      whereClause.performedByAdminId = filters.performedByAdminId
    }
    
    if (filters.dateFrom || filters.dateTo) {
      whereClause.performedAt = {}
      if (filters.dateFrom) {
        whereClause.performedAt.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        whereClause.performedAt.lte = filters.dateTo
      }
    }
    
    if (filters.search) {
      whereClause.OR = [
        { performedByAdminName: { contains: filters.search, mode: 'insensitive' } },
        { entityType: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entityId: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    // Get total count
    const total = await prisma.auditLog.count({ where: whereClause })
    
    // Get paginated results
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { performedAt: 'desc' },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async getActivityForEntity(entityType: string, entityId: string, limit: number = 20) {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      take: limit,
      orderBy: { performedAt: 'desc' },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  async getActivityByAdmin(adminId: string, limit: number = 50) {
    return prisma.auditLog.findMany({
      where: {
        performedByAdminId: adminId,
      },
      take: limit,
      orderBy: { performedAt: 'desc' },
    })
  }

  async getActivityByDateRange(startDate: Date, endDate: Date, limit: number = 100) {
    return prisma.auditLog.findMany({
      where: {
        performedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      take: limit,
      orderBy: { performedAt: 'desc' },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  async getAuditStatistics() {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [todayCount, weekCount, monthCount, totalCount] = await Promise.all([
        prisma.auditLog.count({ where: { performedAt: { gte: today } } }),
        prisma.auditLog.count({ where: { performedAt: { gte: thisWeek } } }),
        prisma.auditLog.count({ where: { performedAt: { gte: thisMonth } } }),
        prisma.auditLog.count()
      ])

      // Get most active users
      const topUsers = await prisma.auditLog.groupBy({
        by: ['performedByAdminId', 'performedByAdminName'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      })

      // Get most common actions
      const topActions = await prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })

      return {
        activity: {
          today: todayCount,
          thisWeek: weekCount,
          thisMonth: monthCount,
          total: totalCount
        },
        topUsers: topUsers.map(user => ({
          adminId: user.performedByAdminId,
          adminName: user.performedByAdminName,
          count: user._count.id
        })),
        topActions: topActions.map(action => ({
          action: action.action,
          count: action._count.id
        }))
      }
    } catch (dbError) {
      console.error('Database error in getAuditStatistics:', dbError)
      // Return empty stats if database query fails
      return {
        activity: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          total: 0
        },
        topUsers: [],
        topActions: []
      }
    }
  }

  async exportAuditLogs(filters: AuditLogFilter = {}, format: 'csv' | 'json' = 'csv') {
    const whereClause: any = {}
    
    if (filters.action) whereClause.action = filters.action
    if (filters.entityType) whereClause.entityType = filters.entityType
    if (filters.entityId) whereClause.entityId = filters.entityId
    if (filters.performedByAdminId) whereClause.performedByAdminId = filters.performedByAdminId
    
    if (filters.dateFrom || filters.dateTo) {
      whereClause.performedAt = {}
      if (filters.dateFrom) whereClause.performedAt.gte = filters.dateFrom
      if (filters.dateTo) whereClause.performedAt.lte = filters.dateTo
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { performedAt: 'desc' },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (format === 'csv') {
      return this.convertToCSV(logs)
    }
    
    return logs
  }

  private convertToCSV(logs: any[]): string {
    const headers = [
      'Date/Time',
      'Action',
      'Entity Type',
      'Entity ID', 
      'Performed By',
      'Admin Email',
      'IP Address',
      'User Agent'
    ]

    const rows = logs.map(log => [
      log.performedAt.toISOString(),
      log.action,
      log.entityType,
      log.entityId,
      log.performedByAdminName,
      log.performedBy?.email || '',
      log.ipAddress || '',
      log.userAgent || ''
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    return csvContent
  }

  // Helper method to create descriptive audit messages
  generateActivityMessage(log: any): string {
    const action = log.action
    const entityType = log.entityType.toLowerCase().replace('_', ' ')
    const performer = log.performedByAdminName
    
    switch (action) {
      case AuditActionType.CREATE:
        return `${performer} created a new ${entityType}`
      case AuditActionType.UPDATE:
        return `${performer} updated ${entityType}`
      case AuditActionType.DELETE:
        return `${performer} deleted ${entityType}`
      case AuditActionType.RESTORE:
        return `${performer} restored ${entityType}`
      case AuditActionType.LOGIN:
        return `${performer} logged into the system`
      case AuditActionType.LOGOUT:
        return `${performer} logged out of the system`
      case AuditActionType.INVITE_USER:
        return `${performer} invited a new user`
      case AuditActionType.ACCEPT_INVITATION:
        return `${performer} accepted an invitation`
      case AuditActionType.ASSIGN_CARER:
        return `${performer} assigned a carer to care package`
      case AuditActionType.COMPLETE_ASSESSMENT:
        return `${performer} completed an assessment`
      case AuditActionType.SET_COMPETENCY:
        return `${performer} updated competency rating`
      case AuditActionType.EXPORT_DATA:
        return `${performer} exported ${entityType} data`
      case AuditActionType.GENERATE_PDF:
        return `${performer} generated a PDF report`
      default:
        return `${performer} performed ${action.toLowerCase()} on ${entityType}`
    }
  }
}

export const auditService = new AuditService()