# Fix RLS Policy Error

## Problem
When creating an election, you get this error:
```
new row violates row-level security policy for table "invoices"
```

## Solution
The RLS policies for `invoices` table are missing INSERT and UPDATE policies. Run this migration to fix it.

## Steps to Fix

### Option 1: Run the Fix Migration (Recommended)

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Open the file: `supabase/migrations/002_fix_rls_policies.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **"Run"** (or press Ctrl+Enter)
8. Verify success: Should see "Success. No rows returned"

### Option 2: Run SQL Directly

Copy and paste this SQL into your Supabase SQL Editor:

```sql
-- Fix RLS Policies: Add missing INSERT and UPDATE policies

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can create invoices for their elections" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices for their elections" ON invoices;
DROP POLICY IF EXISTS "Users can create payment transactions for their elections" ON payment_transactions;
DROP POLICY IF EXISTS "Users can update payment transactions for their elections" ON payment_transactions;
DROP POLICY IF EXISTS "Users can manage invoice items for their invoices" ON invoice_items;

-- Add INSERT policy for invoices
CREATE POLICY "Users can create invoices for their elections" ON invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = invoices.election_id
      AND elections.user_id = auth.uid()
    )
  );

-- Add UPDATE policy for invoices
CREATE POLICY "Users can update invoices for their elections" ON invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = invoices.election_id
      AND elections.user_id = auth.uid()
    )
  );

-- Enable RLS on invoice_items if not already enabled
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Add policies for invoice_items
CREATE POLICY "Users can manage invoice items for their invoices" ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN elections ON elections.id = invoices.election_id
      WHERE invoices.id = invoice_items.invoice_id
      AND elections.user_id = auth.uid()
    )
  );

-- Add INSERT policy for payment_transactions
CREATE POLICY "Users can create payment transactions for their elections" ON payment_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = payment_transactions.election_id
      AND elections.user_id = auth.uid()
    )
  );

-- Add UPDATE policy for payment_transactions
CREATE POLICY "Users can update payment transactions for their elections" ON payment_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = payment_transactions.election_id
      AND elections.user_id = auth.uid()
    )
  );
```

## What This Does

This migration adds the missing RLS policies:
- ✅ **INSERT policy for invoices** - Allows users to create invoices for their elections
- ✅ **UPDATE policy for invoices** - Allows users to update invoices for their elections
- ✅ **RLS on invoice_items** - Enables RLS and adds policies for invoice items
- ✅ **INSERT policy for payment_transactions** - Allows users to create payment transactions
- ✅ **UPDATE policy for payment_transactions** - Allows users to update payment transactions

## After Running the Migration

1. Try creating an election again at `/dashboard/votes/new`
2. The invoice should be created automatically without errors
3. Check your Supabase dashboard → **Table Editor** → `invoices` to verify

## Verification

After running the migration, you can verify the policies were created:

1. Go to **Supabase Dashboard** → **Authentication** → **Policies**
2. Look for the `invoices` table
3. You should see:
   - "Users can view invoices for their elections" (SELECT)
   - "Users can create invoices for their elections" (INSERT)
   - "Users can update invoices for their elections" (UPDATE)




