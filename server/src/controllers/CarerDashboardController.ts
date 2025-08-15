import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { auditService } from '../services/auditService'

const prisma = new PrismaClient()

export class CarerDashboardController {
  /**
   * Get carer dashboard summary data
   */
  async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const carerId = req.user!.id

      // Get carer progress statistics
      const [
        totalCompetencies,
        completedCompetencies,
        pendingConfirmations,
        thisWeekShifts,
        totalShiftApplications,
        todaysTasks
      ] = await Promise.all([
        // Total competencies for the carer
        prisma.competencyRating.count({
          where: { 
            carerId,
            deletedAt: null
          }
        }),
        
        // Completed competencies (100% progress)
        prisma.competencyRating.count({
          where: { 
            carerId,
            rating: { gte: 100 },
            deletedAt: null
          }
        }),
        
        // Pending confirmations
        prisma.competencyRating.count({
          where: { 
            carerId,
            rating: { gte: 100 },
            confirmedAt: null,
            deletedAt: null
          }
        }),
        
        // This week's shifts
        prisma.shiftApplication.count({
          where: {
            carerId,
            status: 'ACCEPTED',
            shift: {
              scheduledDate: {
                gte: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
                lt: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7))
              }
            }
          }
        }),
        
        // Total shift applications
        prisma.shiftApplication.count({
          where: { carerId }
        }),
        
        // Today's available tasks (competencies not at 100%)
        prisma.competencyRating.count({
          where: { 
            carerId,
            rating: { lt: 100 },
            deletedAt: null
          }
        })
      ])

      const progressPercentage = totalCompetencies > 0 
        ? Math.round((completedCompetencies / totalCompetencies) * 100)
        : 0

      const summary = {
        progressPercentage,
        totalCompetencies,
        completedCompetencies,
        pendingConfirmations,
        thisWeekShifts,
        totalShiftApplications,
        todaysTasks,
        nextShift: await this.getNextShift(carerId)
      }

      // Log dashboard access
      await auditService.log({
        action: 'DASHBOARD_VIEW',
        entityType: 'Carer',
        entityId: carerId,
        performedByAdminName: req.user!.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        data: summary
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get today's tasks for the carer
   */
  async getTodaysTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const carerId = req.user!.id

      const tasks = await prisma.competencyRating.findMany({
        where: {
          carerId,
          rating: { lt: 100 },
          deletedAt: null
        },
        include: {
          competency: true
        },
        orderBy: [
          { rating: 'asc' }, // Show least completed first
          { updatedAt: 'asc' }
        ]
      })

      res.json({
        success: true,
        data: tasks
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get carer's recent activity
   */
  async getRecentActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const carerId = req.user!.id

      // Get recent competency updates and shift applications
      const [recentCompetencyUpdates, recentApplications] = await Promise.all([
        prisma.competencyRating.findMany({
          where: {
            carerId,
            deletedAt: null
          },
          include: {
            competency: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 5
        }),
        
        prisma.shiftApplication.findMany({
          where: { carerId },
          include: {
            shift: {
              include: {
                package: true
              }
            }
          },
          orderBy: { appliedAt: 'desc' },
          take: 5
        })
      ])

      // Combine and sort by date
      const activity = [
        ...recentCompetencyUpdates.map(item => ({
          type: 'competency_update',
          date: item.updatedAt,
          data: item
        })),
        ...recentApplications.map(item => ({
          type: 'shift_application',
          date: item.appliedAt,
          data: item
        }))
      ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10)

      res.json({
        success: true,
        data: activity
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get carer notifications
   */
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const carerId = req.user!.id

      // Get pending confirmations and shift updates
      const [pendingConfirmations, shiftUpdates] = await Promise.all([
        prisma.competencyRating.findMany({
          where: {
            carerId,
            rating: { gte: 100 },
            confirmedAt: null,
            deletedAt: null
          },
          include: {
            competency: true
          }
        }),
        
        prisma.shiftApplication.findMany({
          where: {
            carerId,
            status: { in: ['ACCEPTED', 'DECLINED'] },
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          include: {
            shift: {
              include: {
                package: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' }
        })
      ])

      const notifications = [
        ...pendingConfirmations.map(confirmation => ({
          type: 'competency_confirmation',
          priority: 'high',
          title: 'Competency Confirmation Required',
          message: `Please confirm your competency in ${confirmation.competency.name}`,
          data: confirmation,
          createdAt: confirmation.updatedAt
        })),
        ...shiftUpdates.map(application => ({
          type: 'shift_update',
          priority: application.status === 'ACCEPTED' ? 'medium' : 'low',
          title: application.status === 'ACCEPTED' ? 'Shift Accepted' : 'Shift Declined',
          message: `Your application for ${application.shift.package.name} has been ${application.status.toLowerCase()}`,
          data: application,
          createdAt: application.updatedAt
        }))
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      res.json({
        success: true,
        data: notifications
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Helper: Get next scheduled shift
   */
  private async getNextShift(carerId: string) {
    const nextShift = await prisma.shiftApplication.findFirst({
      where: {
        carerId,
        status: 'ACCEPTED',
        shift: {
          scheduledDate: {
            gte: new Date()
          }
        }
      },
      include: {
        shift: {
          include: {
            package: true
          }
        }
      },
      orderBy: {
        shift: {
          scheduledDate: 'asc'
        }
      }
    })

    if (!nextShift) return null

    return {
      date: nextShift.shift.scheduledDate,
      package: nextShift.shift.package.name,
      location: nextShift.shift.package.location || 'TBD'
    }
  }
}

export const carerDashboardController = new CarerDashboardController()