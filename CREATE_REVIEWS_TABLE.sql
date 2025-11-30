-- ============================================
-- CREATE CLIENT REVIEWS TABLE
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- This will create the client_reviews table needed for the review system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop table if it exists (to start fresh)
DROP TABLE IF EXISTS client_reviews CASCADE;

-- Create the simplified client_reviews table
CREATE TABLE client_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  client_company TEXT,
  project_category TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_client_reviews_status ON client_reviews(status);
CREATE INDEX idx_client_reviews_category ON client_reviews(project_category);
CREATE INDEX idx_client_reviews_created_at ON client_reviews(created_at DESC);

-- Enable Row Level Security
ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON client_reviews
  FOR SELECT
  TO public
  USING (status = 'approved');

-- Policy: Anyone can insert reviews (auto-approved)
CREATE POLICY "Anyone can submit reviews"
  ON client_reviews
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Authenticated users can update reviews
CREATE POLICY "Authenticated users can update reviews"
  ON client_reviews
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete reviews
CREATE POLICY "Authenticated users can delete reviews"
  ON client_reviews
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to auto-update updated_at timestamp
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

-- Success message
SELECT 'Table client_reviews created successfully! ✅' AS message;

