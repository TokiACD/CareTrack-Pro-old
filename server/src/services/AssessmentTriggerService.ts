import { prisma } from '../index'
import { auditService } from './auditService'
import { emailService } from './EmailService'
import { CompetencyLevel } from '@caretrack/shared'

export interface AssessmentTriggerEvent {
  carerId: string
  carerName: string
  taskId: string
  taskName: string
  packageId: string
  packageName: string
  completionPercentage: number
  availableAssessments: AssessmentTriggerData[]
  triggeredAt: Date
}

export interface AssessmentTriggerData {
  assessmentId: string
  assessmentName: string
  tasksCovered: string[]
  isFullyReady: boolean // All tasks 100% complete
  readyTasks: number
  totalTasks: number
}

export interface AssessmentNotification {
  type: 'assessment_ready' | 'assessment_overdue' | 'bulk_assessment_ready'
  severity: 'low' | 'medium' | 'high'
  carerId?: string
  carerName?: string
  assessmentId?: string
  assessmentName?: string
  message: string
  data: any
  createdAt: Date
}

class AssessmentTriggerService {
  /**
   * Check if task progress update triggers any assessments
   * Called automatically when task progress is updated
   */
  async checkAssessmentTriggers(carerId: string, taskId: string, completionPercentage: number): Promise<AssessmentTriggerEvent | null> {
    try {
      // Only trigger for high completion percentages
      if (completionPercentage < 90) {
        return null
      }

      // Get carer and task info
      const carer = await prisma.carer.findUnique({
        where: { id: carerId },
        select: { id: true, name: true, email: true }
      })

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, name: true }
      })

      if (!carer || !task) {
        return null
      }

      // Get carer's current progress for all completed tasks (≥90%)
      const carerProgress = await prisma.taskProgress.findMany({
        where: {
          carerId,
          completionPercentage: { gte: 90 }
        },
        include: {
          task: { select: { id: true, name: true } },
          package: { select: { id: true, name: true } }
        }
      })

      // Get existing competency ratings
      const existingRatings = await prisma.competencyRating.findMany({
        where: { carerId },
        select: { taskId: true }
      })
      const ratedTaskIds = new Set(existingRatings.map(r => r.taskId))

      // Get assessments that cover tasks this carer has completed
      const completedTaskIds = carerProgress.map(cp => cp.taskId)
      const assessments = await prisma.assessment.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          tasksCovered: {
            some: {
              taskId: { in: completedTaskIds }
            }
          }
        },
        include: {
          tasksCovered: {
            include: {
              task: { select: { id: true, name: true } }
            }
          }
        }
      })

      // Analyze each assessment for readiness
      const availableAssessments: AssessmentTriggerData[] = []
      
      for (const assessment of assessments) {
        const assessmentTaskIds = assessment.tasksCovered.map(tc => tc.taskId)
        const completedAssessmentTaskIds = assessmentTaskIds.filter(id => completedTaskIds.includes(id))
        const unratedAssessmentTaskIds = assessmentTaskIds.filter(id => !ratedTaskIds.has(id))
        
        // Only include assessments where:
        // 1. Carer has completed at least one task (we already filtered for this)
        // 2. At least one task is not yet rated
        if (unratedAssessmentTaskIds.length > 0) {
          const isFullyReady = assessmentTaskIds.every(id => 
            carerProgress.some(cp => cp.taskId === id && cp.completionPercentage === 100)
          )
          
          availableAssessments.push({
            assessmentId: assessment.id,
            assessmentName: assessment.name,
            tasksCovered: assessmentTaskIds,
            isFullyReady,
            readyTasks: completedAssessmentTaskIds.length,
            totalTasks: assessmentTaskIds.length
          })
        }
      }

      // Only create trigger event if there are available assessments
      if (availableAssessments.length === 0) {
        return null
      }

      // Find the relevant package for this task update
      const relevantProgress = carerProgress.find(cp => cp.taskId === taskId)
      const packageId = relevantProgress?.packageId || carerProgress[0]?.packageId || 'unknown'
      const packageName = relevantProgress?.package?.name || carerProgress[0]?.package?.name || 'Unknown Package'

      const triggerEvent: AssessmentTriggerEvent = {
        carerId,
        carerName: carer.name,
        taskId,
        taskName: task.name,
        packageId,
        packageName,
        completionPercentage,
        availableAssessments,
        triggeredAt: new Date()
      }

      // Log the trigger event
      await auditService.log({
        action: 'ASSESSMENT_TRIGGER_DETECTED',
        entityType: 'AssessmentTrigger',
        entityId: `${carerId}-${taskId}`,
        newValues: {
          carerId,
          carerName: carer.name,
          taskId,
          taskName: task.name,
          completionPercentage,
          availableAssessments: availableAssessments.length,
          fullyReadyAssessments: availableAssessments.filter(a => a.isFullyReady).length
        },
        performedByAdminId: 'system',
        performedByAdminName: 'Assessment Trigger System',
        ipAddress: 'system',
        userAgent: 'AssessmentTriggerService'
      })

      return triggerEvent

    } catch (error) {
      console.error('Error checking assessment triggers:', error)
      return null
    }
  }

  /**
   * Generate notifications for admins when assessments are ready
   */
  async generateAssessmentNotifications(triggerEvent: AssessmentTriggerEvent): Promise<AssessmentNotification[]> {
    const notifications: AssessmentNotification[] = []

    // High priority: Fully ready assessments (all tasks 100% complete)
    const fullyReadyAssessments = triggerEvent.availableAssessments.filter(a => a.isFullyReady)
    if (fullyReadyAssessments.length > 0) {
      for (const assessment of fullyReadyAssessments) {
        notifications.push({
          type: 'assessment_ready',
          severity: 'high',
          carerId: triggerEvent.carerId,
          carerName: triggerEvent.carerName,
          assessmentId: assessment.assessmentId,
          assessmentName: assessment.assessmentName,
          message: `${triggerEvent.carerName} is ready for ${assessment.assessmentName} assessment - all ${assessment.totalTasks} tasks completed`,
          data: {
            taskId: triggerEvent.taskId,
            taskName: triggerEvent.taskName,
            packageId: triggerEvent.packageId,
            packageName: triggerEvent.packageName,
            completionPercentage: triggerEvent.completionPercentage,
            assessment: assessment
          },
          createdAt: new Date()
        })
      }
    }

    // Medium priority: Partially ready assessments (some tasks complete)
    const partiallyReadyAssessments = triggerEvent.availableAssessments.filter(a => !a.isFullyReady && a.readyTasks >= 1)
    if (partiallyReadyAssessments.length > 0) {
      for (const assessment of partiallyReadyAssessments) {
        notifications.push({
          type: 'assessment_ready',
          severity: 'medium',
          carerId: triggerEvent.carerId,
          carerName: triggerEvent.carerName,
          assessmentId: assessment.assessmentId,
          assessmentName: assessment.assessmentName,
          message: `${triggerEvent.carerName} is partially ready for ${assessment.assessmentName} assessment - ${assessment.readyTasks}/${assessment.totalTasks} tasks completed`,
          data: {
            taskId: triggerEvent.taskId,
            taskName: triggerEvent.taskName,
            packageId: triggerEvent.packageId,
            packageName: triggerEvent.packageName,
            completionPercentage: triggerEvent.completionPercentage,
            assessment: assessment
          },
          createdAt: new Date()
        })
      }
    }

    return notifications
  }

  /**
   * Get all carers currently ready for assessment (comprehensive scan)
   */
  async getCarersReadyForAssessment(): Promise<AssessmentTriggerEvent[]> {
    try {
      const carersWithProgress = await prisma.carer.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          taskProgress: {
            some: { completionPercentage: { gte: 90 } }
          }
        },
        include: {
          taskProgress: {
            where: { completionPercentage: { gte: 90 } },
            include: {
              task: { select: { id: true, name: true } },
              package: { select: { id: true, name: true } }
            }
          },
          competencyRatings: { select: { taskId: true } }
        }
      })

      const triggerEvents: AssessmentTriggerEvent[] = []

      for (const carer of carersWithProgress) {
        const ratedTaskIds = new Set(carer.competencyRatings.map(r => r.taskId))
        
        // Find tasks that are ready for assessment (high completion, no rating)
        const readyTasks = carer.taskProgress.filter(tp => 
          tp.completionPercentage >= 90 && !ratedTaskIds.has(tp.taskId)
        )

        if (readyTasks.length > 0) {
          // For each ready task, check assessment triggers
          for (const readyTask of readyTasks) {
            const trigger = await this.checkAssessmentTriggers(
              carer.id, 
              readyTask.taskId, 
              readyTask.completionPercentage
            )
            
            if (trigger) {
              triggerEvents.push(trigger)
            }
          }
        }
      }

      return triggerEvents
    } catch (error) {
      console.error('Error getting carers ready for assessment:', error)
      return []
    }
  }

  /**
   * Auto-assign assessments based on trigger events
   * This creates assessment draft records that admins can complete
   */
  async autoAssignAssessments(triggerEvent: AssessmentTriggerEvent, adminId: string): Promise<string[]> {
    const assignedAssessmentIds: string[] = []

    try {
      // Only auto-assign fully ready assessments to prevent partial assessments
      const fullyReadyAssessments = triggerEvent.availableAssessments.filter(a => a.isFullyReady)
      
      for (const assessment of fullyReadyAssessments) {
        // Check if draft already exists
        const existingDraft = await prisma.draftAssessmentResponse.findUnique({
          where: {
            assessmentId_carerId: {
              assessmentId: assessment.assessmentId,
              carerId: triggerEvent.carerId
            }
          }
        })

        if (!existingDraft) {
          // Create draft assessment response
          const draftData = {
            carerId: triggerEvent.carerId,
            assessorUniqueId: '',
            overallRating: CompetencyLevel.NOT_ASSESSED,
            knowledgeResponses: [],
            practicalResponses: [],
            emergencyResponses: []
          }

          await prisma.draftAssessmentResponse.create({
            data: {
              assessmentId: assessment.assessmentId,
              carerId: triggerEvent.carerId,
              createdByAdminId: adminId,
              draftData: draftData,
              syncedToServer: false
            }
          })

          assignedAssessmentIds.push(assessment.assessmentId)

          // Log the auto-assignment
          await auditService.log({
            action: 'AUTO_ASSIGN_ASSESSMENT',
            entityType: 'DraftAssessmentResponse',
            entityId: `${assessment.assessmentId}-${triggerEvent.carerId}`,
            newValues: {
              assessmentId: assessment.assessmentId,
              assessmentName: assessment.assessmentName,
              carerId: triggerEvent.carerId,
              carerName: triggerEvent.carerName,
              trigger: 'automatic'
            },
            performedByAdminId: adminId,
            performedByAdminName: 'Auto Assignment System',
            ipAddress: 'system',
            userAgent: 'AssessmentTriggerService'
          })
        }
      }

      return assignedAssessmentIds
    } catch (error) {
      console.error('Error auto-assigning assessments:', error)
      return []
    }
  }

  /**
   * Send assessment notification emails to all active admins
   */
  async sendAssessmentNotificationEmails(triggerEvent: AssessmentTriggerEvent): Promise<boolean> {
    try {
      // Get all active admin users
      const admins = await prisma.adminUser.findMany({
        where: {
          isActive: true,
          deletedAt: null
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })

      if (admins.length === 0) {
        console.log('No active admins found to send assessment notifications')
        return false
      }

      // Generate dashboard URL
      const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard/progress`

      // Send notifications to each admin
      let emailsSent = 0
      for (const admin of admins) {
        try {
          // Send notification for each fully ready assessment
          const fullyReadyAssessments = triggerEvent.availableAssessments.filter(a => a.isFullyReady)
          
          for (const assessment of fullyReadyAssessments) {
            await emailService.sendAssessmentReadyNotification({
              to: admin.email,
              adminName: admin.name,
              carerName: triggerEvent.carerName,
              assessmentName: assessment.assessmentName,
              completedTasks: assessment.tasksCovered.map(taskId => {
                // In a real implementation, you'd fetch task names
                // For now, using the task ID
                return `Task ${taskId}`
              }),
              packageName: triggerEvent.packageName,
              dashboardUrl,
              severity: 'high' // All fully ready assessments are high priority
            })

            emailsSent++
          }

          // Send notification for partially ready assessments with medium priority
          const partiallyReadyAssessments = triggerEvent.availableAssessments.filter(a => !a.isFullyReady && a.readyTasks >= 1)
          
          for (const assessment of partiallyReadyAssessments) {
            await emailService.sendAssessmentReadyNotification({
              to: admin.email,
              adminName: admin.name,
              carerName: triggerEvent.carerName,
              assessmentName: assessment.assessmentName,
              completedTasks: assessment.tasksCovered.slice(0, assessment.readyTasks).map(taskId => {
                return `Task ${taskId}`
              }),
              packageName: triggerEvent.packageName,
              dashboardUrl,
              severity: 'medium'
            })

            emailsSent++
          }

        } catch (emailError) {
          console.error(`Failed to send assessment notification to admin ${admin.email}:`, emailError)
          // Continue with other admins even if one fails
        }
      }

      // Log the email notification activity
      await auditService.log({
        action: 'ASSESSMENT_NOTIFICATION_EMAILS_SENT',
        entityType: 'EmailNotification',
        entityId: `${triggerEvent.carerId}-${triggerEvent.taskId}`,
        newValues: {
          carerId: triggerEvent.carerId,
          carerName: triggerEvent.carerName,
          emailsSent,
          recipientAdmins: admins.length,
          availableAssessments: triggerEvent.availableAssessments.length
        },
        performedByAdminId: 'system',
        performedByAdminName: 'Email Notification System',
        ipAddress: 'system',
        userAgent: 'AssessmentTriggerService'
      })

      console.log(`✅ Sent ${emailsSent} assessment notification emails to ${admins.length} admins`)
      return emailsSent > 0

    } catch (error) {
      console.error('Error sending assessment notification emails:', error)
      return false
    }
  }

  /**
   * Send daily assessment summary emails to admins
   */
  async sendDailyAssessmentSummary(): Promise<boolean> {
    try {
      // Get assessment readiness data
      const triggerEvents = await this.getCarersReadyForAssessment()
      
      if (triggerEvents.length === 0) {
        console.log('No carers ready for assessment - skipping daily summary email')
        return true // Not an error, just nothing to report
      }

      // Aggregate statistics
      const readyCarers = new Set(triggerEvents.map(e => e.carerId)).size
      const totalAssessments = triggerEvents.reduce((sum, e) => sum + e.availableAssessments.length, 0)
      const fullyReadyAssessments = triggerEvents.reduce((sum, e) => sum + e.availableAssessments.filter(a => a.isFullyReady).length, 0)
      
      // Get top priority carers (those with most ready assessments)
      const carerAssessmentCounts = new Map<string, {name: string, packageName: string, count: number}>()
      triggerEvents.forEach(event => {
        const fullyReady = event.availableAssessments.filter(a => a.isFullyReady).length
        if (fullyReady > 0) {
          carerAssessmentCounts.set(event.carerId, {
            name: event.carerName,
            packageName: event.packageName,
            count: fullyReady
          })
        }
      })
      
      const topCarers = Array.from(carerAssessmentCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) // Top 5 carers
        .map(carer => ({
          name: carer.name,
          readyAssessments: carer.count,
          packageName: carer.packageName
        }))

      // Get all active admin users
      const admins = await prisma.adminUser.findMany({
        where: {
          isActive: true,
          deletedAt: null
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })

      if (admins.length === 0) {
        console.log('No active admins found for daily summary')
        return false
      }

      const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard`

      // Send summary to each admin
      let emailsSent = 0
      for (const admin of admins) {
        try {
          await emailService.sendBulkAssessmentSummary({
            to: admin.email,
            adminName: admin.name,
            readyCarers,
            overdueAssessments: 0, // TODO: Implement overdue tracking
            totalAssessments,
            topCarers,
            dashboardUrl,
            period: 'daily'
          })

          emailsSent++
        } catch (emailError) {
          console.error(`Failed to send daily summary to admin ${admin.email}:`, emailError)
        }
      }

      // Log the summary email activity
      await auditService.log({
        action: 'DAILY_ASSESSMENT_SUMMARY_SENT',
        entityType: 'EmailNotification',
        entityId: 'daily-summary',
        newValues: {
          readyCarers,
          totalAssessments,
          fullyReadyAssessments,
          emailsSent,
          recipientAdmins: admins.length
        },
        performedByAdminId: 'system',
        performedByAdminName: 'Daily Summary System',
        ipAddress: 'system',
        userAgent: 'AssessmentTriggerService'
      })

      console.log(`✅ Sent daily assessment summary to ${emailsSent} admins`)
      return emailsSent > 0

    } catch (error) {
      console.error('Error sending daily assessment summary:', error)
      return false
    }
  }
}

export const assessmentTriggerService = new AssessmentTriggerService()