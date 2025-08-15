import { Job } from 'bullmq'
import { emailService } from '../../services/EmailService'
import { JobResult } from '../JobProcessor'

export interface EmailJobData {
  type: 'admin-invitation' | 'carer-invitation' | 'password-reset' | 'email-change-notification' | 'email-change-verification'
  data: any
  userId?: number
  retryCount?: number
}

/**
 * Email job handlers for processing various email types in background
 */
export class EmailJobHandlers {
  
  /**
   * Handle admin invitation emails
   */
  static async handleAdminInvitation(job: Job): Promise<JobResult> {
    const { data } = job.data as EmailJobData
    
    try {
      console.log(`📧 Processing admin invitation email for: ${data.to}`)
      
      // Validate required data
      if (!data.to || !data.adminName || !data.acceptUrl) {
        throw new Error('Missing required admin invitation data')
      }
      
      // Fix date serialization issue - convert string back to Date object
      const emailData = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date()
      }
      
      await emailService.sendAdminInvitation(emailData)
      
      console.log(`✅ Admin invitation sent successfully to: ${data.to}`)
      
      return {
        success: true,
        data: {
          emailType: 'admin-invitation',
          recipient: data.to,
          sentAt: new Date().toISOString()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to send admin invitation to ${data.to}:`, error)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Handle carer invitation emails
   */
  static async handleCarerInvitation(job: Job): Promise<JobResult> {
    const { data } = job.data as EmailJobData
    
    try {
      console.log(`📧 Processing carer invitation email for: ${data.to}`)
      
      // Validate required data
      if (!data.to || !data.carerName || !data.acceptUrl) {
        throw new Error('Missing required carer invitation data')
      }
      
      // Fix date serialization issue - convert string back to Date object
      const emailData = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date()
      }
      
      await emailService.sendCarerInvitation(emailData)
      
      console.log(`✅ Carer invitation sent successfully to: ${data.to}`)
      
      return {
        success: true,
        data: {
          emailType: 'carer-invitation',
          recipient: data.to,
          sentAt: new Date().toISOString()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to send carer invitation to ${data.to}:`, error)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Handle password reset emails
   */
  static async handlePasswordReset(job: Job): Promise<JobResult> {
    const { data } = job.data as EmailJobData
    
    try {
      console.log(`📧 Processing password reset email for: ${data.to}`)
      
      // Validate required data
      if (!data.to || !data.name || !data.resetUrl) {
        throw new Error('Missing required password reset data')
      }
      
      await emailService.sendPasswordResetEmail(data)
      
      console.log(`✅ Password reset email sent successfully to: ${data.to}`)
      
      return {
        success: true,
        data: {
          emailType: 'password-reset',
          recipient: data.to,
          sentAt: new Date().toISOString()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to send password reset email to ${data.to}:`, error)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Handle email change notification emails
   */
  static async handleEmailChangeNotification(job: Job): Promise<JobResult> {
    const { data } = job.data as EmailJobData
    
    try {
      console.log(`📧 Processing email change notification for: ${data.to}`)
      
      // Validate required data
      if (!data.to || !data.name || !data.newEmail || !data.cancelUrl) {
        throw new Error('Missing required email change notification data')
      }
      
      await emailService.sendEmailChangeNotification(data)
      
      console.log(`✅ Email change notification sent successfully to: ${data.to}`)
      
      return {
        success: true,
        data: {
          emailType: 'email-change-notification',
          recipient: data.to,
          sentAt: new Date().toISOString()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to send email change notification to ${data.to}:`, error)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Handle email change verification emails
   */
  static async handleEmailChangeVerification(job: Job): Promise<JobResult> {
    const { data } = job.data as EmailJobData
    
    try {
      console.log(`📧 Processing email change verification for: ${data.to}`)
      
      // Validate required data
      if (!data.to || !data.name || !data.oldEmail || !data.verifyUrl) {
        throw new Error('Missing required email change verification data')
      }
      
      // Fix date serialization issue - convert string back to Date object
      const emailData = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date()
      }
      
      await emailService.sendEmailChangeVerification(emailData)
      
      console.log(`✅ Email change verification sent successfully to: ${data.to}`)
      
      return {
        success: true,
        data: {
          emailType: 'email-change-verification',
          recipient: data.to,
          sentAt: new Date().toISOString()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to send email change verification to ${data.to}:`, error)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Handle general notification emails (for future use)
   */
  static async handleNotificationEmail(job: Job): Promise<JobResult> {
    const { data } = job.data as EmailJobData
    
    try {
      console.log(`📧 Processing notification email for: ${data.to}`)
      
      // This is a placeholder for future notification types
      // Could include assessment reminders, shift notifications, etc.
      
      console.log(`✅ Notification email processed successfully for: ${data.to}`)
      
      return {
        success: true,
        data: {
          emailType: 'notification',
          recipient: data.to,
          sentAt: new Date().toISOString()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to send notification email to ${data.to}:`, error)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Get all email job handlers mapped by type
   */
  static getHandlers(): Record<string, (job: Job) => Promise<JobResult>> {
    return {
      'admin-invitation': EmailJobHandlers.handleAdminInvitation,
      'carer-invitation': EmailJobHandlers.handleCarerInvitation,
      'password-reset': EmailJobHandlers.handlePasswordReset,
      'email-change-notification': EmailJobHandlers.handleEmailChangeNotification,
      'email-change-verification': EmailJobHandlers.handleEmailChangeVerification,
      'notification': EmailJobHandlers.handleNotificationEmail
    }
  }

  /**
   * Register all email handlers with the job processor
   */
  static registerHandlers(jobProcessor: any): void {
    const handlers = EmailJobHandlers.getHandlers()
    
    for (const [type, handler] of Object.entries(handlers)) {
      jobProcessor.registerJobHandler('email', type, handler)
      console.log(`📝 Registered email handler for: ${type}`)
    }
    
    console.log('✅ All email job handlers registered successfully')
  }
}

export default EmailJobHandlers