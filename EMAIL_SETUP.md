# Email Setup Guide for CareTrack Pro Invitations

This guide will help you set up email functionality so you can send invitation emails to admins and carers.

## Gmail Setup (Recommended for Testing)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Navigate to "Security"
3. Enable 2-Factor Authentication if not already enabled

### Step 2: Generate App Password
1. In Google Account Security settings
2. Click on "App passwords"
3. Select "Mail" and your device
4. Copy the generated 16-character password

### Step 3: Update Server Environment
Update your `/server/.env` file with:

```env
# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
SMTP_FROM="CareTrack Pro <your-email@gmail.com>"
FRONTEND_URL="http://localhost:3000"
```

## Other Email Providers

### SendGrid (Production Recommended)
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
SMTP_FROM="CareTrack Pro <noreply@yourdomain.com>"
```

### Mailgun
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="your-mailgun-smtp-user"
SMTP_PASS="your-mailgun-smtp-password"
SMTP_FROM="CareTrack Pro <noreply@yourdomain.com>"
```

## Testing the Setup

### 1. Test Email Connection
The server will test the email connection on startup. Check the console for:
```
✅ Email service connected successfully
```

### 2. Send Test Invitation
1. Start the server: `npm run dev`
2. Log in to the admin dashboard
3. Go to Users Card → Invite Admin/Carer
4. Enter your own email address
5. Check your inbox for the invitation email

### 3. Test Complete Flow
1. Send invitation to your email
2. Open the invitation email
3. Click "Accept Invitation & Set Password"
4. Create your password
5. Log in with your new credentials

## Email Templates

The system includes professional HTML email templates with:

- **Admin Invitations**: Welcome message with system overview and features list
- **Carer Invitations**: User-friendly interface guide and functionality overview
- **Mobile Responsive**: Works perfectly on mobile devices
- **Professional Design**: CareTrack Pro branding with modern styling

## Security Features

- **Secure Tokens**: 64-character cryptographically secure invitation tokens
- **Expiration**: Invitations expire after 7 days automatically
- **One-Time Use**: Tokens can only be used once
- **Resend Capability**: Admins can resend expired invitations
- **Decline Option**: Users can decline invitations if needed

## Troubleshooting

### "Email service connection failed"
- Check your email credentials in `.env`
- Verify SMTP settings for your provider
- Ensure 2FA and app passwords are set up correctly

### "Failed to send invitation email"
- Check server logs for detailed error messages
- Verify recipient email address is valid
- Check your email provider's sending limits

### Invitation emails going to spam
- Use a verified domain for SMTP_FROM
- Set up SPF, DKIM, and DMARC records
- Consider using a dedicated email service like SendGrid

## Production Recommendations

1. **Use Dedicated Email Service**: SendGrid, Mailgun, or AWS SES
2. **Custom Domain**: Use your own domain for professional emails
3. **Email Authentication**: Set up SPF, DKIM, and DMARC records
4. **Monitor Delivery**: Track email delivery rates and bounces
5. **Rate Limiting**: Configure appropriate sending limits

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password/token | `app-password-or-api-key` |
| `SMTP_FROM` | From address for emails | `CareTrack Pro <noreply@domain.com>` |
| `FRONTEND_URL` | Frontend URL for links | `http://localhost:3000` |

Your invitation system is now ready! 🎉