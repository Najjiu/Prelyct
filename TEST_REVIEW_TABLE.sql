-- ============================================
-- TEST IF CLIENT_REVIEWS TABLE EXISTS
-- ============================================
-- Run this in Supabase SQL Editor to check if the table exists

-- Check if table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'client_reviews'
    ) 
    THEN '✅ Table EXISTS' 
    ELSE '❌ Table DOES NOT EXIST' 
  END AS table_status;

-- If table exists, show its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'client_reviews'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'client_reviews';


