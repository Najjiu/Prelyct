# How to Run Migration 009 - Security & Monitoring Features

## Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste Migration**
   - Open the file: `supabase/migrations/009_security_and_monitoring_features.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Wait for the migration to complete
   - Check for any errors in the output

5. **Verify Success**
   - You should see "Success. No rows returned" or similar success message
   - Check that new tables are created:
     - `blockchain_audit_log`
     - `encryption_keys`
     - `ip_tracking`
     - `white_label_settings`
     - `system_monitoring`
     - `alert_rules`
     - `alerts`
     - `custom_reports`
     - `report_generations`
     - `whatsapp_integrations`
     - `whatsapp_messages`

## Option 2: Supabase CLI (If Installed)

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

## What This Migration Does

This migration adds:

1. **Security Enhancements to Votes Table**
   - IP address tracking
   - Geolocation data (country, region, city, coordinates)
   - Encrypted vote data storage
   - Blockchain hash storage
   - Risk score calculation
   - Flagging system

2. **New Tables**
   - `blockchain_audit_log` - Blockchain transaction records
   - `encryption_keys` - Encryption key management
   - `ip_tracking` - IP address tracking and analysis
   - `white_label_settings` - Custom branding per user
   - `system_monitoring` - System health metrics
   - `alert_rules` - Configurable alert rules
   - `alerts` - Triggered alerts
   - `custom_reports` - Report configurations
   - `report_generations` - Report generation history
   - `whatsapp_integrations` - WhatsApp API credentials
   - `whatsapp_messages` - WhatsApp message logs

3. **Database Functions & Triggers**
   - Risk score calculation on vote insert
   - IP tracking updates
   - Automatic timestamp updates

4. **Row Level Security (RLS) Policies**
   - Secure access to all new tables
   - User-specific data isolation

## Troubleshooting

If you encounter errors:

1. **"relation already exists"** - Some tables might already exist. The migration uses `IF NOT EXISTS` so this should be safe, but you can skip those statements.

2. **"function already exists"** - The migration uses `CREATE OR REPLACE` so this should update existing functions.

3. **RLS Policy errors** - If policies already exist, you may need to drop them first:
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   ```

4. **Permission errors** - Make sure you're running as the database owner or have sufficient privileges.

## After Migration

Once the migration is complete:

1. **Install Dependencies**
   ```bash
   npm install jspdf jspdf-autotable xlsx
   npm install --save-dev @types/xlsx
   ```

2. **Set Environment Variables**
   Add to `.env.local`:
   ```env
   ENCRYPTION_MASTER_KEY=your-secure-master-key-here
   ```

3. **Test the Features**
   - Access `/dashboard/monitoring` to see system health
   - Access `/dashboard/alerts` to see alerts
   - Try submitting a vote to test encryption and IP tracking

## Need Help?

If you encounter any issues, check:
- Supabase logs in the Dashboard
- Browser console for frontend errors
- Server logs for API errors


