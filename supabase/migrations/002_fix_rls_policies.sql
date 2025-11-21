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

