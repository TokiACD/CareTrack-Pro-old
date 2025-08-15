# Gmail Setup for Development Email Testing

## 🔧 Quick Setup Guide

### **Step 1: Enable 2-Factor Authentication**
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" if not already enabled

### **Step 2: Generate App Password**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" from the dropdown
3. Click "Generate"
4. Copy the 16-character password (format: `abcd efgh ijkl mnop`)
5. **Important**: Remove spaces when adding to .env file

### **Step 3: Update Your .env File**

Add these lines to your `server/.env` file:

```env
# Email Configuration for Development
EMAIL_SERVICE="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="youremail@gmail.com"
SMTP_PASS="abcdefghijklmnop"  # Your 16-character app password (no spaces)
SMTP_FROM="CareTrack Pro <youremail@gmail.com>"
```

### **Step 4: Test the Configuration**

After updating your .env file, restart the server and check:

1. **Health Check**: http://localhost:5001/health
   - Should show `"emailService": true` if configured correctly

2. **Job Status**: http://localhost:5001/job-status
   - Should show healthy email queue system

3. **Test Email**: POST to http://localhost:5001/api/email-queue/test-email
   ```json
   {
     "type": "admin-invitation",
     "priority": 5
   }
   ```

## 🆓 **Alternative Free Options**

### **Option 1: Gmail (Recommended)**
- ✅ Free forever
- ✅ 500 emails per day limit
- ✅ Reliable and fast
- ✅ Perfect for development

### **Option 2: Mailtrap (Development Only)**
- ✅ Free tier: 500 emails/month
- ✅ Email testing without sending real emails
- ✅ Great for testing email templates
- 🔗 https://mailtrap.io

**Mailtrap Config:**
```env
SMTP_HOST="sandbox.smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-mailtrap-username"
SMTP_PASS="your-mailtrap-password"
```

### **Option 3: Ethereal Email (Testing)**
- ✅ Completely free
- ✅ Temporary email testing
- ✅ No signup required
- 🔗 https://ethereal.email

## 🚨 **Security Notes**

1. **Never commit real credentials** to git
2. **Use environment variables** for all email config
3. **App passwords are safer** than your main Gmail password
4. **Revoke app passwords** when no longer needed

## 🧪 **Testing Your Setup**

Once configured, you can test emails using our built-in endpoints:

```bash
# Test admin invitation email
curl -X POST http://localhost:5001/api/email-queue/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"type": "admin-invitation", "priority": 5}'

# Check email queue stats
curl http://localhost:5001/api/email-queue/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 **Next Steps**

After setting up email:
1. Test invitation emails work
2. Test password reset emails work
3. Verify email queue processing works
4. Ready for Week 2: Enhanced Authentication System!