# Notifications System Setup

The notification system has been fully implemented! Here's what's included:

## Features Implemented

### 1. **Notification Types**
- **Election Reminders**: Sent when elections are activated and before they start/end
- **Payment Alerts**: Sent when invoices are created or payment is due
- **Vote Updates**: Sent when votes are cast in your elections

### 2. **User Preferences**
All notifications respect user preferences from Settings:
- Master toggle: Email Notifications
- Election Reminders (requires email notifications)
- Payment Alerts (requires email notifications)
- Vote Updates (requires email notifications)

### 3. **Notification Components**
- **Notification Bell**: Added to dashboard header with unread count badge
- **Notifications Page**: Full page to view all notifications with filters
- **Auto-refresh**: Notifications refresh every 30 seconds

### 4. **Database Schema**
- `notifications` table created with RLS policies
- Tracks email sent status, read status, and metadata
- Indexed for fast queries

## Setup Steps

### 1. Run the Migration

Execute the notification migration in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/008_create_notifications.sql
```

### 2. Email Service Integration

The email sending is currently set up to log emails in development. To enable actual email sending:

1. **Choose an email service** (Resend, SendGrid, AWS SES, etc.)
2. **Update `app/api/emails/send/route.ts`** with your email service integration
3. **Add API keys** to your `.env.local`:
   ```
   RESEND_API_KEY=your_api_key_here
   # or
   SENDGRID_API_KEY=your_api_key_here
   ```

Example with Resend:
```typescript
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'notifications@prelyct.com',
    to,
    subject,
    html,
    text,
  }),
})
```

### 3. Set Up Election Reminder Cron Job

Election reminders are sent automatically when elections are activated, but you can also set up a cron job to send reminders for upcoming elections:

**Option A: Vercel Cron (if using Vercel)**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/election-reminders",
    "schedule": "0 * * * *"
  }]
}
```

**Option B: External Cron Service**
Set up a cron job to call:
```
GET https://your-domain.com/api/cron/election-reminders?secret=YOUR_SECRET
```

**Option C: GitHub Actions**
Create `.github/workflows/notifications.yml`:
```yaml
name: Send Election Reminders
on:
  schedule:
    - cron: '0 * * * *' # Every hour
jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X GET "https://your-domain.com/api/cron/election-reminders?secret=${{ secrets.CRON_SECRET }}"
```

## How It Works

### Automatic Notifications

1. **Invoice Created**: When an election is created with a due amount, a payment alert is sent
2. **Vote Cast**: When a vote is submitted (institutional or public), a vote update is sent
3. **Election Activated**: When an election is activated, a starting reminder is sent
4. **Election Reminders**: Cron job checks for elections starting/ending within 24 hours

### Notification Flow

1. Event occurs (vote, invoice, etc.)
2. System checks user's notification preferences
3. If enabled, email is sent via API route
4. Notification record is created in database
5. User sees notification in bell icon
6. User can click to view details or mark as read

## Testing

1. **Create an election** - Should receive payment alert
2. **Activate an election** - Should receive starting reminder
3. **Cast a vote** - Should receive vote update
4. **Check notification bell** - Should show unread count
5. **View notifications page** - Should list all notifications

## Email Templates

All email templates are HTML-formatted with:
- Professional styling
- Clear call-to-action buttons
- Links to relevant pages
- Unsubscribe/preference information

## Next Steps

1. Integrate with a real email service (Resend, SendGrid, etc.)
2. Set up the cron job for election reminders
3. Customize email templates if needed
4. Add more notification types as needed

The notification system is fully functional and ready to use!


