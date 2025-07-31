import nodemailer from 'nodemailer'

interface AdminInvitationData {
  to: string
  adminName: string
  tempPassword: string
  invitedByName: string
  loginUrl: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendAdminInvitation(data: AdminInvitationData): Promise<void> {
    const { to, adminName, tempPassword, invitedByName, loginUrl } = data

    const mailOptions = {
      from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
      to,
      subject: 'Welcome to CareTrack Pro - Admin Access',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to CareTrack Pro</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
              border: 1px solid #e0e0e0;
            }
            .credentials {
              background: white;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #1976d2;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background: #1976d2;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
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
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
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
            
            <div class="credentials">
              <h3>🔐 Your Login Credentials</h3>
              <p><strong>Email:</strong> ${to}</p>
              <p><strong>Temporary Password:</strong> <code style="background: #f1f1f1; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
            </div>
            
            <div class="warning">
              <h4>⚠️ Important Security Notice</h4>
              <p>This is a temporary password. Please change it immediately after your first login for security reasons.</p>
            </div>
            
            <p>Click the button below to access your admin dashboard:</p>
            
            <a href="${loginUrl}" class="button">Access Admin Dashboard</a>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="${loginUrl}">${loginUrl}</a></p>
            
            <h3>📋 What you can do as an admin:</h3>
            <ul>
              <li><strong>User Management:</strong> Manage admin and carer accounts</li>
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
      `,
      text: `
        Welcome to CareTrack Pro, ${adminName}!
        
        You have been invited by ${invitedByName} to join CareTrack Pro as an administrator.
        
        Your login credentials:
        Email: ${to}
        Temporary Password: ${tempPassword}
        
        IMPORTANT: This is a temporary password. Please change it immediately after your first login.
        
        Login URL: ${loginUrl}
        
        If you have any questions, please contact your system administrator.
        
        © ${new Date().getFullYear()} CareTrack Pro. All rights reserved.
      `,
    }

    await this.transporter.sendMail(mailOptions)
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