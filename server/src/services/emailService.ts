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
  firstName: string
  lastName: string
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

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private useSendGrid: boolean

  constructor() {
    this.useSendGrid = process.env.EMAIL_SERVICE === 'sendgrid'
    
    if (this.useSendGrid) {
      // Configure SendGrid
      const apiKey = process.env.SENDGRID_API_KEY
      if (!apiKey) {
        throw new Error('SENDGRID_API_KEY is required when EMAIL_SERVICE is set to sendgrid')
      }
      sgMail.setApiKey(apiKey)
      console.log('📧 Email service: SendGrid configured')
    } else {
      // Configure SMTP (Gmail fallback)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
      console.log('📧 Email service: SMTP configured')
    }
  }

  async sendAdminInvitation(data: AdminInvitationData): Promise<void> {
    const { to, adminName, invitedByName, acceptUrl, expiresAt } = data

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: '🏥 Welcome to CareTrack Pro - Admin Invitation',
      html: this.getAdminInvitationHTML(data),
      text: this.getAdminInvitationText(data),
    }

    if (this.useSendGrid) {
      await sgMail.send(mailData)
    } else {
      await this.transporter!.sendMail(mailData)
    }
  }

  async sendCarerInvitation(data: CarerInvitationData): Promise<void> {
    const { to, firstName, lastName, invitedByName, acceptUrl, expiresAt } = data

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: '🏥 Welcome to CareTrack Pro - Carer Invitation',
      html: this.getCarerInvitationHTML(data),
      text: this.getCarerInvitationText(data),
    }

    if (this.useSendGrid) {
      await sgMail.send(mailData)
    } else {
      await this.transporter!.sendMail(mailData)
    }
  }

  async sendPasswordResetEmail(data: PasswordResetData): Promise<void> {
    const { to, name, resetUrl } = data

    const mailData = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: '🔐 CareTrack Pro - Password Reset Request',
      html: this.getPasswordResetHTML(data),
      text: this.getPasswordResetText(data),
    }

    if (this.useSendGrid) {
      await sgMail.send(mailData)
    } else {
      await this.transporter!.sendMail(mailData)
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
    const { firstName, lastName, invitedByName, acceptUrl, expiresAt } = data
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
          <h2>Welcome to CareTrack Pro, ${firstName} ${lastName}!</h2>
          
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
    const { firstName, lastName, invitedByName, acceptUrl, expiresAt } = data
    const expiryDate = expiresAt.toLocaleDateString('en-GB')
    
    return `
      Welcome to CareTrack Pro, ${firstName} ${lastName}!
      
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

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email service connection failed:', error)
      return false
    }
  }
}

export const emailService = new EmailService()