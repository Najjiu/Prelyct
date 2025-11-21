# Settings Page Setup

The settings page is now fully functional with database persistence. Follow these steps to set it up:

## 1. Run the Migration

Run the new migration to create the `user_settings` table:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase/migrations/007_create_user_settings.sql
```

Or copy and paste the contents of `supabase/migrations/007_create_user_settings.sql` into the Supabase SQL Editor and execute it.

## 2. Features

The settings page now includes:

### Account Information
- **User ID**: Read-only display of the user's unique identifier
- **Email**: Read-only display (contact support to change)

### Notification Preferences
All notification toggles are functional and saved to the database:
- **Email Notifications**: Master toggle for all email notifications
- **Election Reminders**: Get reminders before elections start or end (requires email notifications)
- **Payment Alerts**: Receive notifications about invoice payments (requires email notifications)
- **Vote Updates**: Get updates when votes are cast (requires email notifications)

### Election Preferences
All dropdowns are functional and saved to the database:
- **Default Billing Model**: Choose between "Upfront Payment" or "Post-Event Payment"
- **Default Pricing Tier**: Choose between "Starter", "Growth", "Campus", or "Enterprise"
- **Currency**: Choose between "GHS - Ghanaian Cedi", "USD - US Dollar", or "EUR - Euro"
- **Timezone**: Choose between "Africa/Accra (GMT)", "UTC", or "America/New_York (EST)"

## 3. How It Works

1. **Loading Settings**: When the page loads, it fetches the user's settings from the `user_settings` table. If no settings exist, it uses default values.

2. **Saving Settings**: When you click "Save Settings", all changes are saved to the database. The settings are automatically created if they don't exist, or updated if they do.

3. **Persistence**: All settings are persisted in the database and will be loaded automatically the next time you visit the settings page.

## 4. Database Schema

The `user_settings` table includes:
- `user_id`: Links settings to the authenticated user
- Notification preferences (4 boolean fields)
- Election preferences (4 fields: billing model, tier, currency, timezone)
- Automatic timestamps (`created_at`, `updated_at`)

## 5. Security

- Row Level Security (RLS) is enabled
- Users can only view, insert, and update their own settings
- All operations require authentication

## 6. Next Steps

The settings are now saved and can be used throughout the application:
- Use `db.getUserSettings()` to retrieve user preferences
- Apply default billing model and pricing tier when creating new elections
- Use currency and timezone settings for displaying dates and amounts
- Respect notification preferences when sending emails

