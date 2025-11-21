-- Add access token and access tracking to voters table

-- Add access_token column to voters table
ALTER TABLE voters 
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS access_token_used BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS access_token_used_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_voters_access_token ON voters(access_token);
CREATE INDEX IF NOT EXISTS idx_voters_access_token_used ON voters(access_token_used);

-- Function to generate a unique access token
CREATE OR REPLACE FUNCTION generate_voter_access_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generate a random token (32 characters, alphanumeric)
    token := upper(
      substr(
        encode(gen_random_bytes(24), 'base64'),
        1,
        32
      )
    );
    
    -- Replace any non-alphanumeric characters
    token := regexp_replace(token, '[^A-Z0-9]', '', 'g');
    
    -- Ensure it's exactly 32 characters
    token := substr(token, 1, 32);
    
    -- Check if token already exists
    SELECT COUNT(*) INTO exists_count
    FROM voters
    WHERE access_token = token;
    
    -- If token doesn't exist, we can use it
    EXIT WHEN exists_count = 0;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Update existing voters to have access tokens (if they don't have one)
UPDATE voters
SET access_token = generate_voter_access_token()
WHERE access_token IS NULL;




