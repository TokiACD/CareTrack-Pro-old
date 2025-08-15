import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'
import { InvitationType } from '@caretrack/shared'

interface AdminInvitationData {
  to: string
  adminName: string
  invitedByName: string
  invitationToken: string
  acceptUrl: string
  expiresAt: Date
}

interface CarerInvitationData {
  to: string
  carerName: string
  invitedByName: string
  invitationToken: string
  acceptUrl: string
  expiresAt: Date
}

interface PasswordResetData {
  to: string
  name: string
  resetUrl: string
}

interface EmailChangeNotificationData {
  to: string
  name: string
  newEmail: string
  cancelUrl: string
  initiatedByAdmin?: string
  isAdminChange?: boolean
}

interface EmailChangeVerificationData {
  to: string
  name: string
  oldEmail: string
  verifyUrl: string
  expiresAt: Date
  initiatedByAdmin?: string
  isAdminChange?: boolean
}

interface AssessmentReadyNotificationData {
  to: string
  adminName: string
  carerName: string
  assessmentName: string
  completedTasks: string[]
  packageName: string
  dashboardUrl: string
  severity: 'high' | 'medium' | 'low'
}

interface AssessmentOverdueNotificationData {
  to: string
  adminName: string
  carerName: string
  assessmentName: string
  daysSinceReady: number
  completedTasks: string[]
  packageName: string
  dashboardUrl: string
}

interface BulkAssessmentSummaryData {
  to: string
  adminName: string
  readyCarers: number
  overdueAssessments: number
  totalAssessments: number
  topCarers: Array<{
    name: string
    readyAssessments: number
    packageName: string
  }>
  dashboardUrl: string
  period: 'daily' | 'weekly'
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private useSendGrid: boolean | null = null
  private initialized = false

  constructor() {
    // Don't initialize here - do it lazily when needed
  }

  private ensureInitialized() {
    if (this.initialized) return

    this.useSendGrid = process.env.EMAIL_SERVICE === 'sendgrid'
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 EmailService initialized - Service: ${this.useSendGrid ? 'SendGrid' : 'SMTP'}`)
    }
    
    if (this.useSendGrid) {
      // Configure SendGrid
      const apiKey = process.env.SENDGRID_API_KEY
      if (!apiKey) {
        throw new Error('SENDGRID_API_KEY is required when EMAIL_SERVICE is set to sendgrid')
      }
      sgMail.setApiKey(apiKey)
    } else {
      // Configure SMTP (Mailtrap/Gmail fallback)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Enhanced timeout and connection settings for Mailtrap
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 10000, // 10 seconds  
        socketTimeout: 15000, // 15 seconds
        // Debugging enabled for development
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development',
        // Additional Mailtrap-specific settings
        requireTLS: false, // Mailtrap supports both TLS and non-TLS
        tls: {
          rejectUnauthorized: false // Accept Mailtrap's certificate
        },
        // Force IPv4 for better Mailtrap compatibility
        family: 4
      })
    }
    
    this.initialized = true
  }

  async sendAdminInvitation(data: AdminInvitationData): Promise<void> {
    this.ensureInitialized()
    const { to, adminName, invitedByName, acceptUrl, expiresAt } = data

    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 Sending admin invitation to: ${to}`)
    }

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: '🏥 Welcome to CareTrack Pro - Admin Invitation',
      html: this.getAdminInvitationHTML(data),
      text: this.getAdminInvitationText(data),
    }

    try {
      if (this.useSendGrid) {
        await sgMail.send(mailData)
        console.log(`✅ Admin invitation sent via SendGrid to: ${to}`)
      } else {
        const result = await this.transporter!.sendMail(mailData)
        
        // Log delivery confirmation
        if (result.accepted && result.accepted.length > 0) {
          console.log(`✅ Admin invitation sent to: ${result.accepted.join(', ')} (ID: ${result.messageId})`)
        }
        if (result.rejected && result.rejected.length > 0) {
          console.error(`❌ Admin invitation rejected for: ${result.rejected.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to send admin invitation to ${to}:`, error instanceof Error ? error.message : error)
      throw error
    }
  }

  async sendCarerInvitation(data: CarerInvitationData): Promise<void> {
    this.ensureInitialized()
    const { to, carerName, invitedByName, acceptUrl, expiresAt } = data

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: '🏥 Welcome to CareTrack Pro - Carer Invitation',
      html: this.getCarerInvitationHTML(data),
      text: this.getCarerInvitationText(data),
    }

    try {
      if (this.useSendGrid) {
        await sgMail.send(mailData)
        console.log(`✅ Carer invitation sent via SendGrid to: ${to}`)
      } else {
        const result = await this.transporter!.sendMail(mailData)
        if (result.accepted && result.accepted.length > 0) {
          console.log(`✅ Carer invitation sent to: ${result.accepted.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to send carer invitation to ${to}:`, error instanceof Error ? error.message : error)
      throw error
    }
  }

  async sendPasswordResetEmail(data: PasswordResetData): Promise<void> {
    this.ensureInitialized()
    const { to, name, resetUrl } = data

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: '🔐 CareTrack Pro - Password Reset Request',
      html: this.getPasswordResetHTML(data),
      text: this.getPasswordResetText(data),
    }

    try {
      if (this.useSendGrid) {
        await sgMail.send(mailData)
        console.log(`✅ Password reset email sent via SendGrid to: ${to}`)
      } else {
        const result = await this.transporter!.sendMail(mailData)
        if (result.accepted && result.accepted.length > 0) {
          console.log(`✅ Password reset email sent to: ${result.accepted.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${to}:`, error instanceof Error ? error.message : error)
      throw error
    }
  }

  async sendEmailChangeNotification(data: EmailChangeNotificationData): Promise<void> {
    this.ensureInitialized()
    const { to, name, newEmail, cancelUrl } = data

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: '⚠️ CareTrack Pro - Email Change Request',
      html: this.getEmailChangeNotificationHTML(data),
      text: this.getEmailChangeNotificationText(data),
    }

    try {
      if (this.useSendGrid) {
        await sgMail.send(mailData)
        console.log(`✅ Email change notification sent via SendGrid to: ${to}`)
      } else {
        const result = await this.transporter!.sendMail(mailData)
        if (result.accepted && result.accepted.length > 0) {
          console.log(`✅ Email change notification sent to: ${result.accepted.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to send email change notification to ${to}:`, error instanceof Error ? error.message : error)
      throw error
    }
  }

  async sendEmailChangeVerification(data: EmailChangeVerificationData): Promise<void> {
    this.ensureInitialized()
    const { to, name, oldEmail, verifyUrl, expiresAt } = data

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: '✅ CareTrack Pro - Verify Email Change',
      html: this.getEmailChangeVerificationHTML(data),
      text: this.getEmailChangeVerificationText(data),
    }

    try {
      if (this.useSendGrid) {
        await sgMail.send(mailData)
        console.log(`✅ Email change verification sent via SendGrid to: ${to}`)
      } else {
        const result = await this.transporter!.sendMail(mailData)
        if (result.accepted && result.accepted.length > 0) {
          console.log(`✅ Email change verification sent to: ${result.accepted.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to send email change verification to ${to}:`, error instanceof Error ? error.message : error)
      throw error
    }
  }

  async sendAssessmentReadyNotification(data: AssessmentReadyNotificationData): Promise<void> {
    this.ensureInitialized()
    const { to, adminName, carerName, assessmentName, severity } = data

    const priorityIcon = severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : '📋'
    const priorityText = severity === 'high' ? 'HIGH PRIORITY' : severity === 'medium' ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: `${priorityIcon} CareTrack Pro - Assessment Ready: ${carerName}`,
      html: this.getAssessmentReadyHTML(data),
      text: this.getAssessmentReadyText(data),
    }

    try {
      if (this.useSendGrid) {
        await sgMail.send(mailData)
        console.log(`✅ Assessment ready notification sent via SendGrid to: ${to}`)
      } else {
        const result = await this.transporter!.sendMail(mailData)
        if (result.accepted && result.accepted.length > 0) {
          console.log(`✅ Assessment ready notification sent to: ${result.accepted.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to send assessment ready notification to ${to}:`, error instanceof Error ? error.message : error)
      throw error
    }
  }

  async sendAssessmentOverdueNotification(data: AssessmentOverdueNotificationData): Promise<void> {
    this.ensureInitialized()
    const { to, adminName, carerName, assessmentName, daysSinceReady } = data

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: `⏰ CareTrack Pro - Overdue Assessment: ${carerName} (${daysSinceReady} days)`,
      html: this.getAssessmentOverdueHTML(data),
      text: this.getAssessmentOverdueText(data),
    }

    try {
      if (this.useSendGrid) {
        await sgMail.send(mailData)
        console.log(`✅ Assessment overdue notification sent via SendGrid to: ${to}`)
      } else {
        const result = await this.transporter!.sendMail(mailData)
        if (result.accepted && result.accepted.length > 0) {
          console.log(`✅ Assessment overdue notification sent to: ${result.accepted.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to send assessment overdue notification to ${to}:`, error instanceof Error ? error.message : error)
      throw error
    }
  }

  async sendBulkAssessmentSummary(data: BulkAssessmentSummaryData): Promise<void> {
    this.ensureInitialized()
    const { to, adminName, readyCarers, period } = data

    const periodText = period === 'daily' ? 'Daily' : 'Weekly'

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: `📊 CareTrack Pro - ${periodText} Assessment Summary (${readyCarers} carers ready)`,
      html: this.getBulkAssessmentSummaryHTML(data),
      text: this.getBulkAssessmentSummaryText(data),
    }

    try {
      if (this.useSendGrid) {
        await sgMail.send(mailData)
        console.log(`✅ Bulk assessment summary sent via SendGrid to: ${to}`)
      } else {
        const result = await this.transporter!.sendMail(mailData)
        if (result.accepted && result.accepted.length > 0) {
          console.log(`✅ Bulk assessment summary sent to: ${result.accepted.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to send bulk assessment summary to ${to}:`, error instanceof Error ? error.message : error)
      throw error
    }
  }

  private getAdminInvitationHTML(data: AdminInvitationData): string {
    const { adminName, invitedByName, acceptUrl, expiresAt } = data
    const expiryDate = expiresAt.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CareTrack Pro - Admin Invitation</title>
        ${this.getEmailStyles()}
      </head>
      <body>
        <div class="header">
          <h1>🏥 CareTrack Pro</h1>
          <p>Care Management System</p>
        </div>
        
        <div class="content">
          <h2>Welcome to CareTrack Pro, ${adminName}!</h2>
          
          <p>You have been invited by <strong>${invitedByName}</strong> to join CareTrack Pro as an administrator.</p>
          
          <p>CareTrack Pro is a comprehensive care management system that helps you manage carers, care packages, tasks, assessments, and scheduling all in one place.</p>
          
          <div class="invitation-box">
            <h3>🔐 Complete Your Registration</h3>
            <p>Click the button below to accept your invitation and create your password:</p>
            <a href="${acceptUrl}" class="button">Accept Invitation & Set Password</a>
          </div>
          
          <div class="warning">
            <h4>⏰ Important</h4>
            <p>This invitation expires on <strong>${expiryDate}</strong>. Please accept it before then.</p>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <div class="url-box">
            <a href="${acceptUrl}">${acceptUrl}</a>
          </div>
          
          <h3>📋 What you can do as an admin:</h3>
          <ul>
            <li><strong>User Management:</strong> Invite and manage admin and carer accounts</li>
            <li><strong>Care Packages:</strong> Create and manage care packages</li>
            <li><strong>Task Management:</strong> Set up tasks and completion targets</li>
            <li><strong>Assessments:</strong> Create competency assessments</li>
            <li><strong>Progress Tracking:</strong> Monitor carer progress and competencies</li>
            <li><strong>Scheduling:</strong> Manage rotas and shift assignments</li>
            <li><strong>Reporting:</strong> Generate reports and track system activity</li>
          </ul>
          
          <p>If you have any questions or need help getting started, please contact your system administrator.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by CareTrack Pro Care Management System</p>
          <p>© ${new Date().getFullYear()} CareTrack Pro. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  private getCarerInvitationHTML(data: CarerInvitationData): string {
    const { carerName, invitedByName, acceptUrl, expiresAt } = data
    const expiryDate = expiresAt.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CareTrack Pro - Carer Invitation</title>
        ${this.getEmailStyles()}
      </head>
      <body>
        <div class="header">
          <h1>🏥 CareTrack Pro</h1>
          <p>Care Management System</p>
        </div>
        
        <div class="content">
          <h2>Welcome to CareTrack Pro, ${carerName}!</h2>
          
          <p>You have been invited by <strong>${invitedByName}</strong> to join CareTrack Pro as a carer.</p>
          
          <p>CareTrack Pro helps you track your progress, manage tasks, view your schedule, and maintain your competency assessments all in one convenient platform.</p>
          
          <div class="invitation-box">
            <h3>🔐 Complete Your Registration</h3>
            <p>Click the button below to accept your invitation and create your password:</p>
            <a href="${acceptUrl}" class="button">Accept Invitation & Set Password</a>
          </div>
          
          <div class="warning">
            <h4>⏰ Important</h4>
            <p>This invitation expires on <strong>${expiryDate}</strong>. Please accept it before then.</p>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <div class="url-box">
            <a href="${acceptUrl}">${acceptUrl}</a>
          </div>
          
          <h3>📱 What you can do in CareTrack Pro:</h3>
          <ul>
            <li><strong>Task Progress:</strong> Track completion of care tasks</li>
            <li><strong>Competency Management:</strong> View and update your skill assessments</li>
            <li><strong>Schedule Management:</strong> View your shifts and rota</li>
            <li><strong>Care Package Access:</strong> Access details for your assigned packages</li>
            <li><strong>Progress Reports:</strong> Generate and view your progress reports</li>
          </ul>
          
          <p>If you have any questions about getting started, please contact your administrator.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by CareTrack Pro Care Management System</p>
          <p>© ${new Date().getFullYear()} CareTrack Pro. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  private getEmailStyles(): string {
    return `
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .header {
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 5px 0 0 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .content {
          background: white;
          padding: 40px;
          border-radius: 0 0 12px 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .content h2 {
          color: #1976d2;
          margin-top: 0;
          font-size: 24px;
        }
        .content h3 {
          color: #1976d2;
          margin-top: 30px;
          font-size: 18px;
        }
        .invitation-box {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 12px;
          border-left: 4px solid #1976d2;
          margin: 25px 0;
          text-align: center;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white !important;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 15px 0;
          box-shadow: 0 4px 15px rgba(25, 118, 210, 0.3);
          transition: all 0.3s ease;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(25, 118, 210, 0.4);
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #666;
          font-size: 14px;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
        }
        .warning h4 {
          margin-top: 0;
          color: #856404;
        }
        .url-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          word-break: break-all;
          font-family: monospace;
          font-size: 14px;
          margin: 15px 0;
        }
        ul {
          padding-left: 20px;
        }
        li {
          margin: 8px 0;
        }
        li strong {
          color: #1976d2;
        }
      </style>
    `
  }

  private getAdminInvitationText(data: AdminInvitationData): string {
    const { adminName, invitedByName, acceptUrl, expiresAt } = data
    const expiryDate = expiresAt.toLocaleDateString('en-GB')
    
    return `
      Welcome to CareTrack Pro, ${adminName}!
      
      You have been invited by ${invitedByName} to join CareTrack Pro as an administrator.
      
      CareTrack Pro is a comprehensive care management system that helps you manage carers, care packages, tasks, assessments, and scheduling all in one place.
      
      To complete your registration and set your password, please visit:
      ${acceptUrl}
      
      IMPORTANT: This invitation expires on ${expiryDate}. Please accept it before then.
      
      What you can do as an admin:
      • User Management: Invite and manage admin and carer accounts
      • Care Packages: Create and manage care packages
      • Task Management: Set up tasks and completion targets
      • Assessments: Create competency assessments
      • Progress Tracking: Monitor carer progress and competencies
      • Scheduling: Manage rotas and shift assignments
      • Reporting: Generate reports and track system activity
      
      If you have any questions, please contact your system administrator.
      
      © ${new Date().getFullYear()} CareTrack Pro. All rights reserved.
    `
  }

  private getCarerInvitationText(data: CarerInvitationData): string {
    const { carerName, invitedByName, acceptUrl, expiresAt } = data
    const expiryDate = expiresAt.toLocaleDateString('en-GB')
    
    return `
      Welcome to CareTrack Pro, ${carerName}!
      
      You have been invited by ${invitedByName} to join CareTrack Pro as a carer.
      
      CareTrack Pro helps you track your progress, manage tasks, view your schedule, and maintain your competency assessments all in one convenient platform.
      
      To complete your registration and set your password, please visit:
      ${acceptUrl}
      
      IMPORTANT: This invitation expires on ${expiryDate}. Please accept it before then.
      
      What you can do in CareTrack Pro:
      • Task Progress: Track completion of care tasks
      • Competency Management: View and update your skill assessments
      • Schedule Management: View your shifts and rota
      • Care Package Access: Access details for your assigned packages
      • Progress Reports: Generate and view your progress reports
      
      If you have any questions about getting started, please contact your administrator.
      
      © ${new Date().getFullYear()} CareTrack Pro. All rights reserved.
    `
  }

  private getPasswordResetHTML(data: PasswordResetData): string {
    const { name, resetUrl } = data

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CareTrack Pro - Password Reset</title>
        ${this.getEmailStyles()}
      </head>
      <body>
        <div class="header">
          <h1>🏥 CareTrack Pro</h1>
          <p>Care Management System</p>
        </div>
        
        <div class="content">
          <h2>Password Reset Request</h2>
          
          <p>Hello ${name},</p>
          
          <p>We received a request to reset your password for your CareTrack Pro account.</p>
          
          <div class="invitation-box">
            <h3>🔐 Reset Your Password</h3>
            <p>Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <div class="warning">
            <h4>⏰ Important</h4>
            <p>This password reset link expires in <strong>15 minutes</strong> for security reasons.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <div class="url-box">
            <a href="${resetUrl}">${resetUrl}</a>
          </div>
          
          <p><strong>Security Note:</strong> For your protection, this link can only be used once and will expire shortly.</p>
          
          <p>If you continue to have trouble accessing your account, please contact your system administrator.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by CareTrack Pro Care Management System</p>
          <p>© ${new Date().getFullYear()} CareTrack Pro. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  private getPasswordResetText(data: PasswordResetData): string {
    const { name, resetUrl } = data
    
    return `
      CareTrack Pro - Password Reset Request
      
      Hello ${name},
      
      We received a request to reset your password for your CareTrack Pro account.
      
      To reset your password, please visit:
      ${resetUrl}
      
      IMPORTANT: This password reset link expires in 15 minutes for security reasons.
      
      If you didn't request this password reset, you can safely ignore this email.
      
      Security Note: For your protection, this link can only be used once and will expire shortly.
      
      If you continue to have trouble accessing your account, please contact your system administrator.
      
      © ${new Date().getFullYear()} CareTrack Pro. All rights reserved.
    `
  }

  private getEmailChangeNotificationHTML(data: EmailChangeNotificationData): string {
    const { name, newEmail, cancelUrl, initiatedByAdmin, isAdminChange } = data

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CareTrack Pro - Email Change Request</title>
        ${this.getEmailStyles()}
      </head>
      <body>
        <div class="header">
          <h1>🏥 CareTrack Pro</h1>
          <p>Care Management System</p>
        </div>
        
        <div class="content">
          <h2>Email Change Request</h2>
          
          <p>Hello ${name},</p>
          
          <p>${isAdminChange ? `<strong>${initiatedByAdmin}</strong> has requested` : 'We received a request'} to change your email address to <strong>${newEmail}</strong>.</p>
          
          <div class="warning">
            <h4>⚠️ Security Alert</h4>
            <p>If you did not request this email change, please take immediate action to secure your account.</p>
          </div>
          
          <div class="invitation-box">
            <h3>🔐 What Happens Next</h3>
            <p>A verification email has been sent to <strong>${newEmail}</strong>. The email change will only be completed after the new email address is verified.</p>
            <p>If you did not request this change, click the button below to cancel it immediately:</p>
            <a href="${cancelUrl}" class="button" style="background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);">Cancel Email Change</a>
          </div>
          
          <h3>🛡️ Security Tips:</h3>
          <ul>
            <li><strong>Check your account:</strong> Review recent login activity</li>
            <li><strong>Update your password:</strong> If you suspect unauthorized access</li>
            <li><strong>Contact support:</strong> If you need immediate assistance</li>
          </ul>
          
          <p>This email change request will expire automatically if not verified within 24 hours.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by CareTrack Pro Care Management System</p>
          <p>© ${new Date().getFullYear()} CareTrack Pro. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  private getEmailChangeVerificationHTML(data: EmailChangeVerificationData): string {
    const { name, oldEmail, verifyUrl, expiresAt, initiatedByAdmin, isAdminChange } = data
    const expiryDate = expiresAt.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CareTrack Pro - Verify Email Change</title>
        ${this.getEmailStyles()}
      </head>
      <body>
        <div class="header">
          <h1>🏥 CareTrack Pro</h1>
          <p>Care Management System</p>
        </div>
        
        <div class="content">
          <h2>Verify Your New Email Address</h2>
          
          <p>Hello ${name},</p>
          
          <p>${isAdminChange ? `${initiatedByAdmin} has requested` : 'You requested'} to change your email address from <strong>${oldEmail}</strong> to this email address.</p>
          
          <div class="invitation-box">
            <h3>✅ Complete Email Change</h3>
            <p>Click the button below to verify this email address and complete the change:</p>
            <a href="${verifyUrl}" class="button">Verify Email Change</a>
          </div>
          
          <div class="warning">
            <h4>⏰ Important</h4>
            <p>This verification link expires on <strong>${expiryDate}</strong>. Please verify before then.</p>
            <p>If you did not request this email change, you can safely ignore this email or contact support.</p>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <div class="url-box">
            <a href="${verifyUrl}">${verifyUrl}</a>
          </div>
          
          <h3>🔒 What This Means:</h3>
          <ul>
            <li><strong>Account Security:</strong> Your account email will be updated only after verification</li>
            <li><strong>Future Communications:</strong> All system emails will be sent to the new address</li>
            <li><strong>Login Changes:</strong> You'll use the new email to log in</li>
          </ul>
          
          <p>If you have any questions or concerns, please contact your system administrator.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by CareTrack Pro Care Management System</p>
          <p>© ${new Date().getFullYear()} CareTrack Pro. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  private getEmailChangeNotificationText(data: EmailChangeNotificationData): string {
    const { name, newEmail, cancelUrl, initiatedByAdmin, isAdminChange } = data
    
    return `
      CareTrack Pro - Email Change Request
      
      Hello ${name},
      
      ${isAdminChange ? `${initiatedByAdmin} has requested` : 'We received a request'} to change your email address to ${newEmail}.
      
      SECURITY ALERT: If you did not request this email change, please take immediate action to secure your account.
      
      What Happens Next:
      A verification email has been sent to ${newEmail}. The email change will only be completed after the new email address is verified.
      
      If you did not request this change, cancel it immediately by visiting:
      ${cancelUrl}
      
      Security Tips:
      • Check your account: Review recent login activity
      • Update your password: If you suspect unauthorized access
      • Contact support: If you need immediate assistance
      
      This email change request will expire automatically if not verified within 24 hours.
      
      © ${new Date().getFullYear()} CareTrack Pro. All rights reserved.
    `
  }

  private getEmailChangeVerificationText(data: EmailChangeVerificationData): string {
    const { name, oldEmail, verifyUrl, expiresAt, initiatedByAdmin, isAdminChange } = data
    const expiryDate = expiresAt.toLocaleDateString('en-GB')
    
    return `
      CareTrack Pro - Verify Your New Email Address
      
      Hello ${name},
      
      ${isAdminChange ? `${initiatedByAdmin} has requested` : 'You requested'} to change your email address from ${oldEmail} to this email address.
      
      To complete the email change, please verify this email address by visiting:
      ${verifyUrl}
      
      IMPORTANT: This verification link expires on ${expiryDate}. Please verify before then.
      
      If you did not request this email change, you can safely ignore this email or contact support.
      
      What This Means:
      • Account Security: Your account email will be updated only after verification
      • Future Communications: All system emails will be sent to the new address
      • Login Changes: You'll use the new email to log in
      
      If you have any questions or concerns, please contact your system administrator.
      
      © ${new Date().getFullYear()} CareTrack Pro. All rights reserved.
    `
  }

  private getAssessmentReadyHTML(data: AssessmentReadyNotificationData): string {
    const { adminName, carerName, assessmentName, completedTasks, packageName, dashboardUrl, severity } = data

    const priorityIcon = severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : '📋'
    const priorityText = severity === 'high' ? 'HIGH PRIORITY' : severity === 'medium' ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'
    const priorityColor = severity === 'high' ? '#d32f2f' : severity === 'medium' ? '#f57c00' : '#1976d2'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CareTrack Pro - Assessment Ready</title>
        ${this.getEmailStyles()}
      </head>
      <body>
        <div class="header">
          <h1>🏥 CareTrack Pro</h1>
          <p>Care Management System</p>
        </div>
        
        <div class="content">
          <div class="priority-banner" style="background: ${priorityColor}; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
            <h2 style="margin: 0; font-size: 18px;">${priorityIcon} ${priorityText}</h2>
          </div>

          <h2>Assessment Ready: ${carerName}</h2>
          
          <p>Hello ${adminName},</p>
          
          <p><strong>${carerName}</strong> has completed all required tasks and is now ready for the <strong>${assessmentName}</strong> assessment.</p>
          
          <div class="invitation-box">
            <h3>📋 Assessment Details</h3>
            <p><strong>Carer:</strong> ${carerName}</p>
            <p><strong>Assessment:</strong> ${assessmentName}</p>
            <p><strong>Package:</strong> ${packageName}</p>
            <p><strong>Completed Tasks:</strong></p>
            <ul style="margin: 10px 0;">
              ${completedTasks.map(task => `<li>${task}</li>`).join('')}
            </ul>
            <a href="${dashboardUrl}" class="button">View in Dashboard</a>
          </div>
          
          <h3>🎯 Next Steps:</h3>
          <ul>
            <li><strong>Schedule Assessment:</strong> Arrange a suitable time with the carer</li>
            <li><strong>Prepare Materials:</strong> Review assessment questions and practical skills</li>
            <li><strong>Complete Assessment:</strong> Use the dashboard to record results</li>
            <li><strong>Update Competencies:</strong> System will automatically update ratings</li>
          </ul>
          
          <div class="warning">
            <h4>${priorityIcon} Priority Level: ${priorityText}</h4>
            <p>${severity === 'high' 
              ? 'All required tasks are 100% complete. This assessment should be scheduled immediately.'
              : severity === 'medium'
                ? 'Most tasks are complete. This assessment can be scheduled when convenient.'
                : 'Some progress made toward assessment readiness. Consider scheduling when fully ready.'
            }</p>
          </div>
          
          <p>You can manage this assessment and view full progress details in your dashboard.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by CareTrack Pro Care Management System</p>
          <p>© ${new Date().getFullYear()} CareTrack Pro. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  private getAssessmentOverdueHTML(data: AssessmentOverdueNotificationData): string {
    const { adminName, carerName, assessmentName, daysSinceReady, completedTasks, packageName, dashboardUrl } = data

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CareTrack Pro - Overdue Assessment</title>
        ${this.getEmailStyles()}
      </head>
      <body>
        <div class="header">
          <h1>🏥 CareTrack Pro</h1>
          <p>Care Management System</p>
        </div>
        
        <div class="content">
          <div class="priority-banner" style="background: #d32f2f; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
            <h2 style="margin: 0; font-size: 18px;">⏰ ASSESSMENT OVERDUE</h2>
          </div>

          <h2>Overdue Assessment: ${carerName}</h2>
          
          <p>Hello ${adminName},</p>
          
          <p><strong>${carerName}</strong> has been ready for the <strong>${assessmentName}</strong> assessment for <strong>${daysSinceReady} days</strong> and still needs to be assessed.</p>
          
          <div class="warning">
            <h4>⚠️ Action Required</h4>
            <p>This assessment is now overdue. Please schedule and complete it as soon as possible to maintain compliance and accurate competency records.</p>
          </div>
          
          <div class="invitation-box">
            <h3>📋 Assessment Details</h3>
            <p><strong>Carer:</strong> ${carerName}</p>
            <p><strong>Assessment:</strong> ${assessmentName}</p>
            <p><strong>Package:</strong> ${packageName}</p>
            <p><strong>Days Overdue:</strong> ${daysSinceReady} days</p>
            <p><strong>Completed Tasks:</strong></p>
            <ul style="margin: 10px 0;">
              ${completedTasks.map(task => `<li>${task}</li>`).join('')}
            </ul>
            <a href="${dashboardUrl}" class="button">Schedule Assessment Now</a>
          </div>
          
          <h3>🚨 Why This Matters:</h3>
          <ul>
            <li><strong>Compliance:</strong> Timely assessments ensure regulatory compliance</li>
            <li><strong>Safety:</strong> Verified competencies protect service users</li>
            <li><strong>Career Development:</strong> Assessments validate carer skills and progress</li>
            <li><strong>Record Keeping:</strong> Complete assessments maintain audit trails</li>
          </ul>
          
          <p><strong>Please prioritize completing this assessment.</strong> Use the dashboard link above to schedule and record the assessment results.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by CareTrack Pro Care Management System</p>
          <p>© ${new Date().getFullYear()} CareTrack Pro. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  private getBulkAssessmentSummaryHTML(data: BulkAssessmentSummaryData): string {
    const { adminName, readyCarers, overdueAssessments, totalAssessments, topCarers, dashboardUrl, period } = data

    const periodText = period === 'daily' ? 'Daily' : 'Weekly'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CareTrack Pro - ${periodText} Assessment Summary</title>
        ${this.getEmailStyles()}
      </head>
      <body>
        <div class="header">
          <h1>🏥 CareTrack Pro</h1>
          <p>Care Management System</p>
        </div>
        
        <div class="content">
          <h2>📊 ${periodText} Assessment Summary</h2>
          
          <p>Hello ${adminName},</p>
          
          <p>Here's your ${period} assessment overview for CareTrack Pro:</p>
          
          <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 25px 0;">
            <div class="stat-card" style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0; color: #1976d2; font-size: 32px;">${readyCarers}</h3>
              <p style="margin: 5px 0 0 0; color: #1976d2;">Carers Ready</p>
            </div>
            <div class="stat-card" style="background: ${overdueAssessments > 0 ? '#ffebee' : '#e8f5e8'}; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0; color: ${overdueAssessments > 0 ? '#d32f2f' : '#388e3c'}; font-size: 32px;">${overdueAssessments}</h3>
              <p style="margin: 5px 0 0 0; color: ${overdueAssessments > 0 ? '#d32f2f' : '#388e3c'};">Overdue</p>
            </div>
            <div class="stat-card" style="background: #f3e5f5; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0; color: #7b1fa2; font-size: 32px;">${totalAssessments}</h3>
              <p style="margin: 5px 0 0 0; color: #7b1fa2;">Total Available</p>
            </div>
          </div>

          ${topCarers.length > 0 ? `
          <div class="invitation-box">
            <h3>🌟 Top Priority Carers</h3>
            <div style="margin: 15px 0;">
              ${topCarers.map(carer => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                  <div>
                    <strong>${carer.name}</strong>
                    <br>
                    <small style="color: #666;">${carer.packageName}</small>
                  </div>
                  <div style="text-align: right;">
                    <span style="background: #1976d2; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ${carer.readyAssessments} ready
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
            <a href="${dashboardUrl}" class="button">View Full Dashboard</a>
          </div>
          ` : ''}

          ${overdueAssessments > 0 ? `
          <div class="warning">
            <h4>⚠️ Attention Required</h4>
            <p>You have <strong>${overdueAssessments} overdue assessments</strong> that need immediate attention. Timely assessments are crucial for compliance and safety.</p>
          </div>
          ` : ''}
          
          <h3>🎯 ${period === 'daily' ? 'Today\'s' : 'This Week\'s'} Action Items:</h3>
          <ul>
            <li><strong>Priority 1:</strong> Complete any overdue assessments (${overdueAssessments})</li>
            <li><strong>Priority 2:</strong> Schedule assessments for ready carers (${readyCarers})</li>
            <li><strong>Priority 3:</strong> Review progress for carers approaching readiness</li>
            <li><strong>Follow-up:</strong> Update competency ratings based on assessment results</li>
          </ul>
          
          <p>Access your full dashboard for detailed carer progress, assessment tools, and comprehensive reporting.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by CareTrack Pro Care Management System</p>
          <p>© ${new Date().getFullYear()} CareTrack Pro. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  private getAssessmentReadyText(data: AssessmentReadyNotificationData): string {
    const { adminName, carerName, assessmentName, completedTasks, packageName, dashboardUrl, severity } = data
    const priorityText = severity === 'high' ? 'HIGH PRIORITY' : severity === 'medium' ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'
    
    return `
      CareTrack Pro - Assessment Ready: ${carerName}
      ${priorityText}
      
      Hello ${adminName},
      
      ${carerName} has completed all required tasks and is now ready for the ${assessmentName} assessment.
      
      Assessment Details:
      • Carer: ${carerName}
      • Assessment: ${assessmentName}
      • Package: ${packageName}
      • Completed Tasks: ${completedTasks.join(', ')}
      
      Next Steps:
      • Schedule Assessment: Arrange a suitable time with the carer
      • Prepare Materials: Review assessment questions and practical skills
      • Complete Assessment: Use the dashboard to record results
      • Update Competencies: System will automatically update ratings
      
      Priority Level: ${priorityText}
      ${severity === 'high' 
        ? 'All required tasks are 100% complete. This assessment should be scheduled immediately.'
        : severity === 'medium'
          ? 'Most tasks are complete. This assessment can be scheduled when convenient.'
          : 'Some progress made toward assessment readiness. Consider scheduling when fully ready.'
      }
      
      View in Dashboard: ${dashboardUrl}
      
      © ${new Date().getFullYear()} CareTrack Pro. All rights reserved.
    `
  }

  private getAssessmentOverdueText(data: AssessmentOverdueNotificationData): string {
    const { adminName, carerName, assessmentName, daysSinceReady, completedTasks, packageName, dashboardUrl } = data
    
    return `
      CareTrack Pro - Overdue Assessment: ${carerName} (${daysSinceReady} days)
      
      Hello ${adminName},
      
      ${carerName} has been ready for the ${assessmentName} assessment for ${daysSinceReady} days and still needs to be assessed.
      
      ACTION REQUIRED: This assessment is now overdue. Please schedule and complete it as soon as possible to maintain compliance and accurate competency records.
      
      Assessment Details:
      • Carer: ${carerName}
      • Assessment: ${assessmentName}
      • Package: ${packageName}
      • Days Overdue: ${daysSinceReady} days
      • Completed Tasks: ${completedTasks.join(', ')}
      
      Why This Matters:
      • Compliance: Timely assessments ensure regulatory compliance
      • Safety: Verified competencies protect service users
      • Career Development: Assessments validate carer skills and progress
      • Record Keeping: Complete assessments maintain audit trails
      
      Please prioritize completing this assessment.
      
      Schedule Assessment Now: ${dashboardUrl}
      
      © ${new Date().getFullYear()} CareTrack Pro. All rights reserved.
    `
  }

  private getBulkAssessmentSummaryText(data: BulkAssessmentSummaryData): string {
    const { adminName, readyCarers, overdueAssessments, totalAssessments, topCarers, dashboardUrl, period } = data
    const periodText = period === 'daily' ? 'Daily' : 'Weekly'
    
    return `
      CareTrack Pro - ${periodText} Assessment Summary
      
      Hello ${adminName},
      
      Here's your ${period} assessment overview for CareTrack Pro:
      
      Summary Statistics:
      • Carers Ready: ${readyCarers}
      • Overdue Assessments: ${overdueAssessments}
      • Total Available: ${totalAssessments}
      
      ${topCarers.length > 0 ? `
      Top Priority Carers:
      ${topCarers.map(carer => `• ${carer.name} (${carer.packageName}) - ${carer.readyAssessments} ready`).join('\n')}
      ` : ''}
      
      ${overdueAssessments > 0 ? `
      ATTENTION REQUIRED: You have ${overdueAssessments} overdue assessments that need immediate attention. Timely assessments are crucial for compliance and safety.
      ` : ''}
      
      ${period === 'daily' ? 'Today\'s' : 'This Week\'s'} Action Items:
      • Priority 1: Complete any overdue assessments (${overdueAssessments})
      • Priority 2: Schedule assessments for ready carers (${readyCarers})
      • Priority 3: Review progress for carers approaching readiness
      • Follow-up: Update competency ratings based on assessment results
      
      View Full Dashboard: ${dashboardUrl}
      
      © ${new Date().getFullYear()} CareTrack Pro. All rights reserved.
    `
  }

  async testConnection(): Promise<boolean> {
    this.ensureInitialized()
    try {
      if (this.useSendGrid) {
        // Test SendGrid API key validity
        const apiKey = process.env.SENDGRID_API_KEY
        if (!apiKey || apiKey.length < 10) {
          console.error('Invalid SendGrid API key configuration')
          return false
        }
        return true
      }
      
      if (!this.transporter) {
        console.error('SMTP transporter not initialized')
        return false
      }
      
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email service connection test failed:', error)
      return false
    }
  }

  /**
   * Initialize email service with better error handling
   */
  async initializeService(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.useSendGrid) {
        const apiKey = process.env.SENDGRID_API_KEY
        if (!apiKey) {
          return { success: false, error: 'SendGrid API key not configured' }
        }
        // Test API key with a lightweight request
        try {
          sgMail.setApiKey(apiKey)
          return { success: true }
        } catch (error) {
          return { success: false, error: 'Invalid SendGrid API key' }
        }
      } else {
        // Validate SMTP configuration
        const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
        const missing = requiredVars.filter(v => !process.env[v])
        if (missing.length > 0) {
          return { success: false, error: `Missing SMTP configuration: ${missing.join(', ')}` }
        }
        
        if (this.transporter) {
          const verified = await this.transporter.verify()
          return { success: verified }
        }
        
        return { success: false, error: 'SMTP transporter not initialized' }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export const emailService = new EmailService()