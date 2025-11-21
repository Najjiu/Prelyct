-- Create storage bucket for Prelyct Votes
-- This migration creates the storage bucket and configures RLS policies for image uploads

-- IMPORTANT: You must create the bucket manually first via Supabase Dashboard:
-- 1. Go to Storage → New bucket
-- 2. Name: prelyct-votes
-- 3. Public: Yes (toggle it on)
-- 4. Click "Create bucket"
--
-- Then run this migration to set up the RLS policies.

-- Note: Bucket creation via SQL requires superuser privileges which are not available
-- in the standard Supabase SQL editor. The bucket must be created via the Dashboard.

-- Try to insert bucket (may fail if you don't have permissions, that's okay)
-- If this fails, create the bucket manually in the Dashboard first
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prelyct-votes',
  'prelyct-votes',
  true, -- Public bucket so images can be accessed via public URLs
  5242880, -- 5MB file size limit (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We don't need to enable it again

-- Policy 1: Allow Authenticated Users to Upload Images
-- Users can upload images to the candidates folder
-- Drop policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload candidate images" ON storage.objects;

CREATE POLICY "Authenticated users can upload candidate images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prelyct-votes' AND
  (storage.foldername(name))[1] = 'candidates'
);

-- Policy 2: Allow Public Read Access
-- Anyone can view images (since bucket is public)
-- Drop policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;

CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'prelyct-votes');

-- Policy 3: Allow Authenticated Users to Update Their Images
-- Users can update images they've uploaded
-- Drop policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can update candidate images" ON storage.objects;

CREATE POLICY "Authenticated users can update candidate images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'prelyct-votes' AND
  (storage.foldername(name))[1] = 'candidates'
)
WITH CHECK (
  bucket_id = 'prelyct-votes' AND
  (storage.foldername(name))[1] = 'candidates'
);

-- Policy 4: Allow Authenticated Users to Delete Images
-- Users can delete images from the candidates folder
-- Drop policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can delete candidate images" ON storage.objects;

CREATE POLICY "Authenticated users can delete candidate images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'prelyct-votes' AND
  (storage.foldername(name))[1] = 'candidates'
);

-- ============================================
-- IMPORTANT SETUP INSTRUCTIONS
-- ============================================
-- 
-- Step 1: Create the bucket manually (REQUIRED)
--   1. Go to Supabase Dashboard → Storage
--   2. Click "New bucket"
--   3. Name: prelyct-votes
--   4. Public: Yes (toggle it ON)
--   5. Click "Create bucket"
--
-- Step 2: Run this migration
--   - This will create the RLS policies
--   - The bucket creation SQL above may fail, that's okay
--   - Just make sure the bucket exists before running this
--
-- Step 3: Verify
--   - Go to Storage → Policies
--   - Select the 'prelyct-votes' bucket
--   - You should see 4 policies created
--
-- ============================================

