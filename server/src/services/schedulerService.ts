import cron from 'node-cron'
import { prisma } from '../index'
import { auditService } from './auditService'
import { emailService } from './emailService'

class SchedulerService {
  private isInitialized = false

  /**
   * Initialize scheduled tasks
   */
  init() {
    if (this.isInitialized) {
      console.log('Scheduler already initialized')
      return
    }

    console.log('Initializing scheduler service...')

    // Daily cleanup at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      await this.runDailyCleanup()
    }, {
      scheduled: true,
      timezone: "Europe/London"
    })

    // Weekly email warnings on Mondays at 9:00 AM
    cron.schedule('0 9 * * 1', async () => {
      await this.sendWeeklyWarnings()
    }, {
      scheduled: true,
      timezone: "Europe/London"
    })

    this.isInitialized = true
    console.log('Scheduler service initialized successfully')
  }

  /**
   * Daily automated cleanup of old deleted items
   * Excludes carers for CQC compliance (6-year retention)
   */
  private async runDailyCleanup() {
    try {
      console.log('Starting daily recycle bin cleanup...')
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 30) // 30 days ago

      // CQC COMPLIANCE: Exclude carers from automatic cleanup
      const entityTypes = ['adminUser', 'carePackage', 'task', 'assessment']
      const cleanupResults: any[] = []
      let totalCleaned = 0

      for (const entityType of entityTypes) {
        const model = (prisma as any)[entityType]
        if (model) {
          try {
            const deletedCount = await model.deleteMany({
              where: {
                deletedAt: {
                  not: null,
                  lt: cutoffDate
                }
              }
            })

            if (deletedCount.count > 0) {
              cleanupResults.push({
                entityType,
                deletedCount: deletedCount.count
              })
              totalCleaned += deletedCount.count

              console.log(`Cleaned up ${deletedCount.count} ${entityType}(s)`)

              // Log the cleanup
              await auditService.log({
                action: `DAILY_CLEANUP_${entityType.toUpperCase()}S`,
                entityType: 'RecycleBin',
                entityId: 'daily-cleanup',
                newValues: { 
                  deletedCount: deletedCount.count, 
                  cutoffDate,
                  automated: true
                },
                performedByAdminId: 'system',
                performedByAdminName: 'System Scheduler',
                ipAddress: 'localhost',
                userAgent: 'Daily Cleanup Service'
              })
            }
          } catch (error) {
            console.error(`Error cleaning up ${entityType}:`, error)
          }
        }
      }

      // Check retained carers for reporting
      const carersCount = await prisma.carer.count({
        where: {
          deletedAt: {
            not: null,
            lt: cutoffDate
          }
        }
      })

      console.log(`Daily cleanup completed: ${totalCleaned} items deleted, ${carersCount} carers retained for CQC compliance`)

      // Log summary
      await auditService.log({
        action: 'DAILY_CLEANUP_SUMMARY',
        entityType: 'RecycleBin',
        entityId: 'daily-cleanup-summary',
        newValues: {
          totalCleaned,
          carersRetained: carersCount,
          results: cleanupResults,
          cutoffDate,
          completedAt: new Date()
        },
        performedByAdminId: 'system',
        performedByAdminName: 'System Scheduler',
        ipAddress: 'localhost',
        userAgent: 'Daily Cleanup Service'
      })

    } catch (error) {
      console.error('Daily cleanup failed:', error)
      
      // Log the failure
      await auditService.log({
        action: 'DAILY_CLEANUP_FAILED',
        entityType: 'RecycleBin',
        entityId: 'daily-cleanup-error',
        newValues: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        },
        performedByAdminId: 'system',
        performedByAdminName: 'System Scheduler',
        ipAddress: 'localhost',
        userAgent: 'Daily Cleanup Service'
      })
    }
  }

  /**
   * Send weekly email warnings for items approaching 30-day deletion
   */
  private async sendWeeklyWarnings() {
    try {
      console.log('Sending weekly deletion warnings...')

      // Items that will be deleted in 7 days (23 days old)
      const warningDate = new Date()
      warningDate.setDate(warningDate.getDate() - 23)
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 22) // Items between 22-23 days old

      // Get all admin users to send warnings to
      const adminUsers = await prisma.adminUser.findMany({
        where: { 
          deletedAt: null,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })

      if (adminUsers.length === 0) {
        console.log('No active admin users found for warnings')
        return
      }

      // Find items approaching deletion (excluding carers)
      const entityTypes = ['adminUser', 'carePackage', 'task', 'assessment']
      const warningItems: any[] = []

      for (const entityType of entityTypes) {
        const model = (prisma as any)[entityType]
        if (model) {
          const items = await model.findMany({
            where: {
              deletedAt: {
                gte: cutoffDate,
                lt: warningDate
              }
            },
            select: {
              id: true,
              name: true,
              deletedAt: true,
              ...(entityType === 'carePackage' && { postcode: true }),
              ...(entityType === 'task' && { targetCount: true }),
              ...(entityType === 'adminUser' && { email: true })
            }
          })

          warningItems.push(...items.map(item => ({
            ...item,
            entityType,
            displayName: this.formatItemDisplayName(item, entityType)
          })))
        }
      }

      if (warningItems.length === 0) {
        console.log('No items approaching deletion threshold')
        return
      }

      // Send warning emails to all admin users
      for (const admin of adminUsers) {
        try {
          await this.sendDeletionWarningEmail(admin, warningItems)
          console.log(`Warning email sent to ${admin.email}`)
        } catch (error) {
          console.error(`Failed to send warning email to ${admin.email}:`, error)
        }
      }

      // Log the warning
      await auditService.log({
        action: 'WEEKLY_DELETION_WARNINGS_SENT',
        entityType: 'RecycleBin',
        entityId: 'weekly-warnings',
        newValues: {
          adminUsersNotified: adminUsers.length,
          itemsApproachingDeletion: warningItems.length,
          warningItems: warningItems.map(item => ({
            entityType: item.entityType,
            id: item.id,
            displayName: item.displayName,
            deletedAt: item.deletedAt
          })),
          sentAt: new Date()
        },
        performedByAdminId: 'system',
        performedByAdminName: 'System Scheduler',
        ipAddress: 'localhost',
        userAgent: 'Weekly Warning Service'
      })

    } catch (error) {
      console.error('Weekly warnings failed:', error)
      
      await auditService.log({
        action: 'WEEKLY_WARNINGS_FAILED',
        entityType: 'RecycleBin',
        entityId: 'weekly-warnings-error',
        newValues: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        },
        performedByAdminId: 'system',
        performedByAdminName: 'System Scheduler',
        ipAddress: 'localhost',
        userAgent: 'Weekly Warning Service'
      })
    }
  }

  /**
   * Format item display name based on entity type
   */
  private formatItemDisplayName(item: any, entityType: string): string {
    switch (entityType) {
      case 'adminUser':
        return `${item.name} (${item.email})`
      case 'carePackage':
        return `${item.name} (${item.postcode})`
      case 'task':
        return `${item.name} (Target: ${item.targetCount})`
      case 'assessment':
        return item.name
      default:
        return item.name || item.id
    }
  }

  /**
   * Send deletion warning email to admin user
   */
  private async sendDeletionWarningEmail(admin: any, warningItems: any[]) {
    const entityGroups = warningItems.reduce((groups: any, item) => {
      if (!groups[item.entityType]) {
        groups[item.entityType] = []
      }
      groups[item.entityType].push(item)
      return groups
    }, {})

    const entityTypeNames: Record<string, string> = {
      adminUser: 'Admin Users',
      carePackage: 'Care Packages', 
      task: 'Tasks',
      assessment: 'Assessments'
    }

    let itemsList = ''
    for (const [entityType, items] of Object.entries(entityGroups)) {
      itemsList += `\n**${entityTypeNames[entityType]}:**\n`
      for (const item of items as any[]) {
        const deletedDate = new Date(item.deletedAt).toLocaleDateString('en-GB')
        itemsList += `• ${item.displayName} (deleted ${deletedDate})\n`
      }
    }

    const emailContent = `
Dear ${admin.name},

This is a weekly reminder that some items in the CareTrack Pro recycle bin will be permanently deleted in approximately 7 days.

**Items Approaching Permanent Deletion:**
${itemsList}

**What you need to know:**
• These items will be automatically and permanently deleted in about 7 days
• This action cannot be undone once completed
• If you need to restore any of these items, please do so before they are permanently deleted
• Deleted carers are retained for 6 years as required by CQC regulations and are not affected by this cleanup

**To manage these items:**
1. Log into CareTrack Pro
2. Navigate to the Recycle Bin
3. Select items you want to restore or permanently delete
4. Use the bulk actions to restore or delete multiple items at once

If you have any questions or need assistance, please contact your system administrator.

Best regards,
CareTrack Pro System
    `.trim()

    await emailService.sendEmail({
      to: admin.email,
      subject: 'CareTrack Pro: Items Scheduled for Permanent Deletion',
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    })
  }

  /**
   * Manual trigger for testing (development only)
   */
  async triggerCleanup() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Manual cleanup trigger not allowed in production')
    }
    console.log('Manually triggering cleanup...')
    await this.runDailyCleanup()
  }

  /**
   * Manual trigger for testing (development only)
   */
  async triggerWarnings() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Manual warning trigger not allowed in production')
    }
    console.log('Manually triggering warnings...')
    await this.sendWeeklyWarnings()
  }
}

export const schedulerService = new SchedulerService()