# Clear All Data - Production Preparation Guide

This guide explains how to clear all data from the Prelyct Vote database to prepare for production.

## ⚠️ WARNING

**This operation will permanently delete ALL data from the following tables:**
- Elections
- Votes
- Voters
- Positions
- Candidates
- Invoices
- Invoice Items
- Payment Transactions
- Election Add-ons

**This will NOT delete:**
- User accounts (auth.users)
- Pricing tiers (default configuration)
- Add-ons (default configuration)
- Database schema, indexes, triggers, or RLS policies

## Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration**
   - Copy the contents of `supabase/migrations/005_clear_all_data.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **Verify**
   - Check that all tables are empty
   - Verify that pricing tiers and add-ons still exist

## Method 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're in the project directory
cd "c:\Users\Najji123z\Desktop\Prelyct.com"

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

## Method 3: Manual SQL Execution

You can also run the SQL commands manually in your database client:

1. Connect to your Supabase database
2. Execute the SQL from `supabase/migrations/005_clear_all_data.sql`
3. Verify the results

## What Gets Preserved

✅ **User Accounts**: All authenticated users remain
✅ **Pricing Tiers**: Default pricing configuration preserved
✅ **Add-ons**: Default add-ons configuration preserved
✅ **Schema**: All tables, indexes, triggers, and RLS policies remain intact
✅ **Migrations**: All migration history is preserved

## What Gets Deleted

❌ All elections
❌ All votes
❌ All voters
❌ All positions
❌ All candidates
❌ All invoices
❌ All invoice items
❌ All payment transactions
❌ All election add-on associations

## After Clearing Data

1. **Verify Schema**: Ensure all tables still exist and have correct structure
2. **Test Creation**: Create a test election to verify everything works
3. **Check RLS**: Verify Row Level Security policies are still active
4. **Test Voting**: Test both institutional and public contest voting flows

## Production Checklist

After clearing data, ensure:

- [ ] All test data has been removed
- [ ] Pricing tiers are configured correctly
- [ ] Add-ons are configured correctly
- [ ] RLS policies are active and working
- [ ] User authentication is working
- [ ] Election creation works
- [ ] Voting flows work (both modes)
- [ ] Invoice generation works
- [ ] Payment processing is ready (if applicable)

## Need Help?

If you encounter any issues:
1. Check Supabase logs for errors
2. Verify your database connection
3. Ensure you have proper permissions
4. Review the migration file for syntax errors

