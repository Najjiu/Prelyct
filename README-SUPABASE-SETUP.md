# Supabase Setup Guide for Prelyct Votes

This guide will help you set up Supabase for the Prelyct Votes pricing and billing system.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A new Supabase project created

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `prelyct-votes` (or your preferred name)
   - Database Password: Choose a strong password (save it!)
   - Region: Choose closest to your users
4. Click "Create new project" and wait for it to initialize

## Step 2: Run Database Migrations

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. Verify the migration succeeded (you should see "Success. No rows returned")

## Step 3: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Replace `your_project_url_here` and `your_anon_key_here` with the values from Step 3

## Step 5: Verify Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard/votes/new` and try creating an election
3. Check your Supabase dashboard → **Table Editor** → `elections` to see if the election was created

## Database Schema Overview

The migration creates the following tables:

- **pricing_tiers**: Stores pricing tier definitions (Starter, Growth, Campus, Enterprise)
- **add_ons**: Stores available add-ons (Audit PDF, SMS Blast, Concierge)
- **elections**: Main elections table with pricing fields
- **election_add_ons**: Junction table linking elections to add-ons
- **invoices**: Invoice records for each election
- **invoice_items**: Line items for each invoice
- **payment_transactions**: Payment transaction records
- **positions**: Election positions
- **candidates**: Candidates for each position
- **voters**: Voter records
- **votes**: Vote records

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only see/modify their own elections
- All related data (invoices, transactions, etc.) is scoped to the user's elections

## Next Steps

1. **Payment Integration**: Set up Stripe or Paystack to process actual payments
   - Update `app/api/payments/create-intent/route.ts` with your payment provider
   - Configure webhook endpoints in your payment provider dashboard
   - Update `app/api/payments/webhook/route.ts` to handle webhook events

2. **Email Notifications**: Set up email sending for invoices
   - Use Supabase Edge Functions or a service like Resend/SendGrid
   - Send invoice emails when elections are created
   - Send payment confirmation emails

3. **Testing**: Test the complete flow
   - Create an election
   - Verify invoice is created
   - Process a test payment
   - Verify payment status updates

## Troubleshooting

### "User not authenticated" errors
- Make sure you're signed in to the dashboard
- Check that Supabase auth is properly configured

### "Election not found" errors
- Verify RLS policies are correctly set up
- Check that the election belongs to the current user

### Migration errors
- Make sure you're running the migration in the correct Supabase project
- Check for any existing tables that might conflict
- Verify you have the correct database permissions

## Support

If you encounter issues, check:
1. Supabase dashboard logs
2. Browser console for client-side errors
3. Network tab for API errors
4. Supabase documentation: [supabase.com/docs](https://supabase.com/docs)




