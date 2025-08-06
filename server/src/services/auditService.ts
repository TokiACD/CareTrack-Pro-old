import { prisma } from '../index'

interface AuditLogData {
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
      // Don't throw error to avoid breaking the main operation
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
}

export const auditService = new AuditService()