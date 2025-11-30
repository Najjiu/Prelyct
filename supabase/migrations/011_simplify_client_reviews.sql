-- Simplify client_reviews table to match the form fields only
-- This migration removes unnecessary columns and keeps only what's needed:
-- client_name, client_company (optional), project_category, rating, review_text

-- Drop the table if it exists (will recreate with simplified schema)
DROP TABLE IF EXISTS client_reviews CASCADE;

-- Recreate with simplified schema
CREATE TABLE client_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Required fields from form
  client_name TEXT NOT NULL,
  client_company TEXT,
  project_category TEXT NOT NULL, -- 'voting', 'hostel', 'web-development', 'graphic-design', 'ms-suite', etc.
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_client_reviews_status ON client_reviews(status);
CREATE INDEX idx_client_reviews_category ON client_reviews(project_category);
CREATE INDEX idx_client_reviews_created_at ON client_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON client_reviews;
DROP POLICY IF EXISTS "Anyone can submit reviews" ON client_reviews;
DROP POLICY IF EXISTS "Authenticated users can update reviews" ON client_reviews;
DROP POLICY IF EXISTS "Authenticated users can delete reviews" ON client_reviews;

-- Policy: Anyone can read approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON client_reviews
  FOR SELECT
  TO public
  USING (status = 'approved');

-- Policy: Anyone can insert reviews (they'll be auto-approved)
CREATE POLICY "Anyone can submit reviews"
  ON client_reviews
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Only authenticated users can update reviews
CREATE POLICY "Authenticated users can update reviews"
  ON client_reviews
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only authenticated users can delete reviews
CREATE POLICY "Authenticated users can delete reviews"
  ON client_reviews
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_client_reviews_updated_at ON client_reviews;
CREATE TRIGGER update_client_reviews_updated_at
  BEFORE UPDATE ON client_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_client_reviews_updated_at();

