-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pricing tiers table
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  min_voters INTEGER NOT NULL,
  max_voters INTEGER,
  rate_per_voter DECIMAL(10, 2) NOT NULL,
  minimum_charge DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add-ons table
CREATE TABLE IF NOT EXISTS add_ons (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Elections table (extended with pricing)
CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  
  -- Pricing fields
  expected_voters INTEGER NOT NULL DEFAULT 0,
  tier_id TEXT REFERENCES pricing_tiers(id),
  billing_model TEXT NOT NULL DEFAULT 'upfront' CHECK (billing_model IN ('upfront', 'post_event')),
  
  -- Cost breakdown
  projected_base_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  add_ons_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  due_now DECIMAL(10, 2) NOT NULL DEFAULT 0,
  pending_after_event DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Payment status
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
  payment_intent_id TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Election add-ons junction table
CREATE TABLE IF NOT EXISTS election_add_ons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  add_on_id TEXT NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(election_id, add_on_id)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  payment_provider TEXT,
  provider_transaction_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voters table
CREATE TABLE IF NOT EXISTS voters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  name TEXT,
  email TEXT,
  has_voted BOOLEAN NOT NULL DEFAULT FALSE,
  voted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(election_id, identifier)
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(election_id, voter_id, position_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_elections_user_id ON elections(user_id);
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_payment_status ON elections(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_election_id ON invoices(election_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_election_id ON payment_transactions(election_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_positions_election_id ON positions(election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_position_id ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_voters_election_id ON voters(election_id);
CREATE INDEX IF NOT EXISTS idx_voters_has_voted ON voters(has_voted);
CREATE INDEX IF NOT EXISTS idx_votes_election_id ON votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);

-- Insert default pricing tiers
INSERT INTO pricing_tiers (id, label, min_voters, max_voters, rate_per_voter, minimum_charge, description) VALUES
  ('starter', 'Starter', 0, 500, 0.50, 250.00, 'Student unions & smaller clubs. Up to 500 verified voters.'),
  ('growth', 'Growth', 501, 2000, 0.42, 750.00, 'Faculty-wide elections or NGOs with a few thousand members.'),
  ('campus', 'Campus', 2001, 10000, 0.36, 1800.00, 'Whole-campus polls and national associations.'),
  ('enterprise', 'Enterprise', 10001, NULL, 0.30, 3200.00, 'Large-scale mandates. Custom SLAs and multi-channel support.')
ON CONFLICT (id) DO NOTHING;

-- Insert default add-ons
INSERT INTO add_ons (id, label, description, price) VALUES
  ('audit_trail', 'Audit-ready PDF export', 'Formatted reports with signatures & timestamped logs.', 350.00),
  ('sms_blast', 'Bulk SMS reminders', '1,000 SMS credits to drive turnout (additional billed usage).', 420.00),
  ('concierge', 'Concierge success crew', 'Live monitoring + on-call channel during election day.', 650.00)
ON CONFLICT (id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON elections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for elections
CREATE POLICY "Users can view their own elections" ON elections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own elections" ON elections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own elections" ON elections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own elections" ON elections
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices for their elections" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = invoices.election_id
      AND elections.user_id = auth.uid()
    )
  );

-- RLS Policies for payment transactions
CREATE POLICY "Users can view payment transactions for their elections" ON payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = payment_transactions.election_id
      AND elections.user_id = auth.uid()
    )
  );

-- RLS Policies for positions, candidates, voters, votes (cascade from elections)
CREATE POLICY "Users can manage positions for their elections" ON positions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = positions.election_id
      AND elections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage candidates for their positions" ON candidates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM positions
      JOIN elections ON elections.id = positions.election_id
      WHERE positions.id = candidates.position_id
      AND elections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage voters for their elections" ON voters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = voters.election_id
      AND elections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view votes for their elections" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = votes.election_id
      AND elections.user_id = auth.uid()
    )
  );




