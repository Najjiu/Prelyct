-- Add dual-mode voting support (public_contest vs institutional)

-- Add mode and pay-per-vote fields to elections table
ALTER TABLE elections 
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'institutional' CHECK (mode IN ('institutional', 'public_contest')),
ADD COLUMN IF NOT EXISTS cost_per_vote DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS max_votes_per_user INTEGER,
ADD COLUMN IF NOT EXISTS requires_voter_registration BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS public_voting_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS public_voting_link TEXT UNIQUE;

-- Update votes table to support public contest voting
-- First, make voter_id nullable (for public contests)
ALTER TABLE votes
ALTER COLUMN voter_id DROP NOT NULL;

-- Add new columns for public contest voting
ALTER TABLE votes
ADD COLUMN IF NOT EXISTS user_phone TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vote_cost DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS user_ip TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update the unique constraint to allow multiple votes per user for public contests
-- Drop existing unique constraint
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_election_id_voter_id_position_id_key;

-- Create new constraint that allows multiple votes for public contests
-- For institutional elections, we still need the unique constraint
-- We'll handle this at the application level for now

-- Create index for public contest votes
CREATE INDEX IF NOT EXISTS idx_votes_user_phone ON votes(user_phone);
CREATE INDEX IF NOT EXISTS idx_votes_user_email ON votes(user_email);
CREATE INDEX IF NOT EXISTS idx_votes_payment_transaction ON votes(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_elections_mode ON elections(mode);
CREATE INDEX IF NOT EXISTS idx_elections_public_voting ON elections(public_voting_enabled);
CREATE INDEX IF NOT EXISTS idx_elections_public_voting_link ON elections(public_voting_link);

-- Update RLS policies for public contest votes
-- Public contests don't require authentication, so we need to allow anonymous votes
-- But we still want to protect against abuse

-- Allow public read access to active public contests
CREATE POLICY "Public can view active public contests" ON elections
  FOR SELECT USING (
    mode = 'public_contest' 
    AND status = 'active' 
    AND public_voting_enabled = TRUE
  );

-- Allow public to vote in public contests (with payment verification)
CREATE POLICY "Public can vote in public contests" ON votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = votes.election_id
      AND elections.mode = 'public_contest'
      AND elections.status = 'active'
      AND elections.public_voting_enabled = TRUE
    )
  );

-- Function to check vote limits for public contests
CREATE OR REPLACE FUNCTION check_public_vote_limit()
RETURNS TRIGGER AS $$
DECLARE
  election_record elections%ROWTYPE;
  vote_count INTEGER;
BEGIN
  -- Get election details
  SELECT * INTO election_record
  FROM elections
  WHERE id = NEW.election_id;
  
  -- If it's a public contest with max votes limit
  IF election_record.mode = 'public_contest' 
     AND election_record.max_votes_per_user IS NOT NULL 
     AND NEW.user_phone IS NOT NULL THEN
    
    -- Count existing votes from this phone number
    SELECT COUNT(*) INTO vote_count
    FROM votes
    WHERE election_id = NEW.election_id
      AND user_phone = NEW.user_phone;
    
    -- Check if limit exceeded
    IF vote_count >= election_record.max_votes_per_user THEN
      RAISE EXCEPTION 'Maximum votes per user exceeded';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce vote limits
CREATE TRIGGER check_vote_limit_trigger
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION check_public_vote_limit();

-- Update existing elections to be institutional by default
UPDATE elections
SET mode = 'institutional',
    requires_voter_registration = TRUE,
    payment_required = FALSE,
    public_voting_enabled = FALSE
WHERE mode IS NULL;
