import { jobProcessor } from '../jobs/JobProcessor'
import { EmailJobData } from '../jobs/handlers/EmailJobHandlers'

export interface AdminInvitationData {
  to: string
  adminName: string
  invitedByName: string
  invitationToken: string
  acceptUrl: string
  expiresAt: Date
}

export interface CarerInvitationData {
  to: string
  carerName: string
  invitedByName: string
  invitationToken: string
  acceptUrl: string
  expiresAt: Date
}

export interface PasswordResetData {
  to: string
  name: string
  resetUrl: string
}

export interface EmailChangeNotificationData {
  to: string
  name: string
  newEmail: string
  cancelUrl: string
  initiatedByAdmin?: string
  isAdminChange?: boolean
}

export interface EmailChangeVerificationData {
  to: string
  name: string
  oldEmail: string
  verifyUrl: string
  expiresAt: Date
  initiatedByAdmin?: string
  isAdminChange?: boolean
}

export interface EmailQueueOptions {
  priority?: number
  delay?: number
  userId?: number
}

/**
 * Service for queuing email operations as background jobs
 * Replaces synchronous email sending with asynchronous job processing
 */
export class EmailQueueService {
  
  /**
   * Queue admin invitation email
   */
  async queueAdminInvitation(
    data: AdminInvitationData, 
    options: EmailQueueOptions = {}
  ): Promise<void> {
    const jobData: EmailJobData = {
      type: 'admin-invitation',
      data,
      userId: options.userId
    }

    await jobProcessor.addJob('email', jobData, {
      priority: options.priority || 5, // High priority for invitations
      delay: options.delay || 0
    })

    console.log(`📧 Queued admin invitation email for: ${data.to}`)
  }

  /**
   * Queue carer invitation email
   */
  async queueCarerInvitation(
    data: CarerInvitationData, 
    options: EmailQueueOptions = {}
  ): Promise<void> {
    const jobData: EmailJobData = {
      type: 'carer-invitation',
      data,
      userId: options.userId
    }

    await jobProcessor.addJob('email', jobData, {
      priority: options.priority || 5, // High priority for invitations
      delay: options.delay || 0
    })

    console.log(`📧 Queued carer invitation email for: ${data.to}`)
  }

  /**
   * Queue password reset email
   */
  async queuePasswordReset(
    data: PasswordResetData, 
    options: EmailQueueOptions = {}
  ): Promise<void> {
    const jobData: EmailJobData = {
      type: 'password-reset',
      data,
      userId: options.userId
    }

    await jobProcessor.addJob('email', jobData, {
      priority: options.priority || 10, // Very high priority for security
      delay: options.delay || 0
    })

    console.log(`📧 Queued password reset email for: ${data.to}`)
  }

  /**
   * Queue email change notification
   */
  async queueEmailChangeNotification(
    data: EmailChangeNotificationData, 
    options: EmailQueueOptions = {}
  ): Promise<void> {
    const jobData: EmailJobData = {
      type: 'email-change-notification',
      data,
      userId: options.userId
    }

    await jobProcessor.addJob('email', jobData, {
      priority: options.priority || 8, // High priority for security notifications
      delay: options.delay || 0
    })

    console.log(`📧 Queued email change notification for: ${data.to}`)
  }

  /**
   * Queue email change verification
   */
  async queueEmailChangeVerification(
    data: EmailChangeVerificationData, 
    options: EmailQueueOptions = {}
  ): Promise<void> {
    const jobData: EmailJobData = {
      type: 'email-change-verification',
      data,
      userId: options.userId
    }

    await jobProcessor.addJob('email', jobData, {
      priority: options.priority || 8, // High priority for security verifications
      delay: options.delay || 0
    })

    console.log(`📧 Queued email change verification for: ${data.to}`)
  }

  /**
   * Queue general notification email (for future use)
   */
  async queueNotificationEmail(
    data: {
      to: string
      subject: string
      content: string
      type?: string
    }, 
    options: EmailQueueOptions = {}
  ): Promise<void> {
    const jobData: EmailJobData = {
      type: 'notification',
      data,
      userId: options.userId
    }

    await jobProcessor.addJob('email', jobData, {
      priority: options.priority || 3, // Lower priority for general notifications
      delay: options.delay || 0
    })

    console.log(`📧 Queued notification email for: ${data.to}`)
  }

  /**
   * Queue bulk emails (e.g., for announcements)
   */
  async queueBulkEmails(
    emails: Array<{
      to: string
      subject: string
      content: string
      type?: string
    }>, 
    options: EmailQueueOptions = {}
  ): Promise<void> {
    const bulkPromises = emails.map((emailData, index) => 
      this.queueNotificationEmail(emailData, {
        ...options,
        delay: (options.delay || 0) + (index * 1000) // Spread emails over time
      })
    )

    await Promise.all(bulkPromises)
    console.log(`📧 Queued ${emails.length} bulk emails`)
  }

  /**
   * Queue scheduled email (with delay)
   */
  async queueScheduledEmail(
    type: 'admin-invitation' | 'carer-invitation' | 'password-reset' | 'email-change-notification' | 'email-change-verification' | 'notification',
    data: any,
    scheduleTime: Date,
    options: EmailQueueOptions = {}
  ): Promise<void> {
    const delay = scheduleTime.getTime() - Date.now()
    
    if (delay < 0) {
      throw new Error('Scheduled time must be in the future')
    }

    const jobData: EmailJobData = {
      type,
      data,
      userId: options.userId
    }

    await jobProcessor.addJob('email', jobData, {
      priority: options.priority || 1,
      delay
    })

    console.log(`📧 Scheduled ${type} email for ${scheduleTime.toISOString()}`)
  }

  /**
   * Get email queue statistics
   */
  async getEmailQueueStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    return await jobProcessor.getQueueStats('email')
  }

  /**
   * Health check for email queue system
   */
  async healthCheck(): Promise<{
    emailQueue: boolean
    jobProcessor: boolean
    details: any
  }> {
    try {
      const queueStats = await this.getEmailQueueStats()
      const jobProcessorHealth = await jobProcessor.healthCheck()

      return {
        emailQueue: true,
        jobProcessor: jobProcessorHealth.healthy,
        details: {
          queueStats,
          jobProcessorHealth
        }
      }
    } catch (error) {
      console.error('Email queue health check failed:', error)
      return {
        emailQueue: false,
        jobProcessor: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Retry failed email jobs
   */
  async retryFailedEmails(): Promise<{ retriedCount: number }> {
    // This would implement retry logic for failed email jobs
    // For now, we'll return a placeholder
    console.log('🔄 Retry failed emails functionality - implementation pending')
    return { retriedCount: 0 }
  }

  /**
   * Clear old completed jobs from email queue
   */
  async cleanupCompletedJobs(olderThanHours: number = 24): Promise<{ cleanedCount: number }> {
    // This would implement cleanup logic for old completed jobs
    // For now, we'll return a placeholder
    console.log(`🧹 Cleanup jobs older than ${olderThanHours} hours - implementation pending`)
    return { cleanedCount: 0 }
  }
}

// Export singleton instance
export const emailQueueService = new EmailQueueService()