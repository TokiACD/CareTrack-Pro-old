import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { auditService } from '../services/auditService'

const prisma = new PrismaClient()

export class CarerProgressController {
  /**
   * Get carer's personal progress overview
   */
  async getPersonalProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const carerId = req.user!.id

      const progressData = await prisma.competencyRating.findMany({
        where: {
          carerId,
          deletedAt: null
        },
        include: {
          competency: {
            include: {
              assessment: {
                select: {
                  id: true,
                  title: true,
                  category: true
                }
              }
            }
          }
        },
        orderBy: [
          { rating: 'desc' },
          { updatedAt: 'desc' }
        ]
      })

      // Group by assessment category
      const categorizedProgress = progressData.reduce((acc, rating) => {
        const category = rating.competency.assessment?.category || 'General'
        if (!acc[category]) {
          acc[category] = {
            category,
            competencies: [],
            averageRating: 0,
            completedCount: 0,
            totalCount: 0
          }
        }
        
        acc[category].competencies.push({
          id: rating.id,
          name: rating.competency.name,
          rating: rating.rating,
          isCompleted: rating.rating >= 100,
          isConfirmed: !!rating.confirmedAt,
          lastUpdated: rating.updatedAt,
          assessmentTitle: rating.competency.assessment?.title
        })
        
        acc[category].totalCount++
        if (rating.rating >= 100) {
          acc[category].completedCount++
        }
        
        return acc
      }, {} as any)

      // Calculate average ratings for each category
      Object.values(categorizedProgress).forEach((category: any) => {
        const totalRating = category.competencies.reduce((sum: number, comp: any) => sum + comp.rating, 0)
        category.averageRating = Math.round(totalRating / category.competencies.length)
      })

      res.json({
        success: true,
        data: {
          overview: {
            totalCompetencies: progressData.length,
            completedCompetencies: progressData.filter(r => r.rating >= 100).length,
            confirmedCompetencies: progressData.filter(r => r.confirmedAt).length,
            averageProgress: progressData.length > 0 
              ? Math.round(progressData.reduce((sum, r) => sum + r.rating, 0) / progressData.length)
              : 0
          },
          categories: Object.values(categorizedProgress)
        }
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get competencies pending confirmation
   */
  async getPendingConfirmations(req: Request, res: Response, next: NextFunction) {
    try {
      const carerId = req.user!.id

      const pendingConfirmations = await prisma.competencyRating.findMany({
        where: {
          carerId,
          rating: { gte: 100 },
          confirmedAt: null,
          deletedAt: null
        },
        include: {
          competency: {
            include: {
              assessment: {
                select: {
                  id: true,
                  title: true,
                  category: true
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      res.json({
        success: true,
        data: pendingConfirmations.map(rating => ({
          id: rating.id,
          competencyName: rating.competency.name,
          assessmentTitle: rating.competency.assessment?.title,
          category: rating.competency.assessment?.category,
          completedAt: rating.updatedAt,
          rating: rating.rating
        }))
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Confirm a competency rating
   */
  async confirmCompetency(req: Request, res: Response, next: NextFunction) {
    try {
      const { competencyRatingId } = req.params
      const carerId = req.user!.id
      const { confirmationMethod = 'SELF_CONFIRMATION' } = req.body

      // Verify the competency rating belongs to the authenticated carer
      const competencyRating = await prisma.competencyRating.findFirst({
        where: {
          id: competencyRatingId,
          carerId,
          rating: { gte: 100 },
          confirmedAt: null,
          deletedAt: null
        },
        include: {
          competency: true
        }
      })

      if (!competencyRating) {
        return res.status(404).json({
          success: false,
          error: 'Competency rating not found or not eligible for confirmation'
        })
      }

      // Update the competency rating with confirmation
      const updatedRating = await prisma.competencyRating.update({
        where: { id: competencyRatingId },
        data: {
          confirmedAt: new Date(),
          confirmedByCarerId: carerId,
          confirmationMethod
        },
        include: {
          competency: true
        }
      })

      // Log the confirmation
      await auditService.log({
        action: 'COMPETENCY_CONFIRMED',
        entityType: 'CompetencyRating',
        entityId: competencyRatingId,
        performedByAdminName: req.user!.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          competencyName: competencyRating.competency.name,
          confirmationMethod
        }
      })

      res.json({
        success: true,
        data: updatedRating,
        message: 'Competency confirmed successfully'
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get carer's achievement progress
   */
  async getAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      const carerId = req.user!.id

      const [confirmedCompetencies, totalCompetencies, shiftApplications] = await Promise.all([
        prisma.competencyRating.count({
          where: {
            carerId,
            confirmedAt: { not: null },
            deletedAt: null
          }
        }),
        
        prisma.competencyRating.count({
          where: {
            carerId,
            deletedAt: null
          }
        }),
        
        prisma.shiftApplication.count({
          where: {
            carerId,
            status: 'ACCEPTED'
          }
        })
      ])

      // Define achievement badges
      const achievements = [
        {
          id: 'first_competency',
          name: 'First Step',
          description: 'Complete your first competency',
          icon: '🎯',
          earned: confirmedCompetencies >= 1,
          progress: Math.min(confirmedCompetencies, 1),
          target: 1
        },
        {
          id: 'competency_master',
          name: 'Competency Master',
          description: 'Confirm 10 competencies',
          icon: '🏆',
          earned: confirmedCompetencies >= 10,
          progress: confirmedCompetencies,
          target: 10
        },
        {
          id: 'shift_starter',
          name: 'Shift Starter',
          description: 'Complete your first shift',
          icon: '⭐',
          earned: shiftApplications >= 1,
          progress: Math.min(shiftApplications, 1),
          target: 1
        },
        {
          id: 'dedicated_carer',
          name: 'Dedicated Carer',
          description: 'Complete 25 shifts',
          icon: '💪',
          earned: shiftApplications >= 25,
          progress: shiftApplications,
          target: 25
        },
        {
          id: 'full_qualification',
          name: 'Fully Qualified',
          description: 'Complete all competencies',
          icon: '🌟',
          earned: totalCompetencies > 0 && confirmedCompetencies >= totalCompetencies,
          progress: confirmedCompetencies,
          target: totalCompetencies
        }
      ]

      res.json({
        success: true,
        data: {
          summary: {
            totalAchievements: achievements.length,
            earnedAchievements: achievements.filter(a => a.earned).length,
            confirmedCompetencies,
            totalCompetencies,
            completedShifts: shiftApplications
          },
          achievements
        }
      })

    } catch (error) {
      next(error)
    }
  }
}

export const carerProgressController = new CarerProgressController()