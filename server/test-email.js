const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// Manually load environment variables
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/"/g, '');
    }
  });
}

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  
  const useSendGrid = process.env.EMAIL_SERVICE === 'sendgrid';
  
  if (useSendGrid) {
    console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '***configured***' : 'NOT SET');
    console.log('SMTP_FROM:', process.env.SMTP_FROM);
    
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY is required when EMAIL_SERVICE is sendgrid');
      return;
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    try {
      console.log('Sending test email via SendGrid...');
      const msg = {
        to: 'test@example.com', // Replace with your email for testing
        from: process.env.SMTP_FROM || 'noreply@yourdomain.com',
        subject: 'CareTrack Pro - SendGrid Test',
        text: 'This is a test email from CareTrack Pro using SendGrid.',
        html: '<p>This is a test email from <strong>CareTrack Pro</strong> using <strong>SendGrid</strong>.</p>',
      };
      
      await sgMail.send(msg);
      console.log('✅ SendGrid test email sent successfully');
    } catch (error) {
      console.error('❌ SendGrid test failed:');
      console.error(error.message);
      if (error.response) {
        console.error('Response:', error.response.body);
      }
    }
  } else {
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***configured***' : 'NOT SET');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      console.log('Verifying SMTP connection...');
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');

      console.log('Sending test email via SMTP...');
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@caretrack.com>',
        to: process.env.SMTP_USER,
        subject: 'CareTrack Pro - SMTP Test', 
        text: 'This is a test email from CareTrack Pro via SMTP.',
        html: '<p>This is a test email from <strong>CareTrack Pro</strong> via <strong>SMTP</strong>.</p>',
      });

      console.log('✅ SMTP test email sent successfully');
      console.log('Message ID:', info.messageId);
    } catch (error) {
      console.error('❌ SMTP test failed:');
      console.error(error.message);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      if (error.response) {
        console.error('SMTP response:', error.response);
      }
    }
  }
}

testEmail();