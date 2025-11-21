-- Migration: Clear all data for production preparation
-- This script clears all user data while preserving the schema structure
-- WARNING: This will delete ALL data from the database. Use with caution!

-- Disable triggers temporarily to speed up deletion
SET session_replication_role = 'replica';

-- Delete data in order to respect foreign key constraints
-- Start with child tables first, then parent tables

-- 1. Delete all votes (child of elections, voters, positions, candidates)
TRUNCATE TABLE votes RESTART IDENTITY CASCADE;

-- 2. Delete all voters (child of elections)
TRUNCATE TABLE voters RESTART IDENTITY CASCADE;

-- 3. Delete all candidates (child of positions)
TRUNCATE TABLE candidates RESTART IDENTITY CASCADE;

-- 4. Delete all positions (child of elections)
TRUNCATE TABLE positions RESTART IDENTITY CASCADE;

-- 5. Delete all invoice items (child of invoices)
TRUNCATE TABLE invoice_items RESTART IDENTITY CASCADE;

-- 6. Delete all payment transactions (child of elections, invoices)
TRUNCATE TABLE payment_transactions RESTART IDENTITY CASCADE;

-- 7. Delete all invoices (child of elections)
TRUNCATE TABLE invoices RESTART IDENTITY CASCADE;

-- 8. Delete all election add-ons (junction table)
TRUNCATE TABLE election_add_ons RESTART IDENTITY CASCADE;

-- 9. Delete all elections (parent table)
TRUNCATE TABLE elections RESTART IDENTITY CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Note: We do NOT delete:
-- - pricing_tiers (default configuration data)
-- - add_ons (default configuration data)
-- - auth.users (user accounts - managed separately)
-- - Any schema structures, indexes, triggers, or RLS policies

-- Verify tables are empty (optional - uncomment to check)
-- SELECT 
--   'votes' as table_name, COUNT(*) as row_count FROM votes
-- UNION ALL
-- SELECT 'voters', COUNT(*) FROM voters
-- UNION ALL
-- SELECT 'candidates', COUNT(*) FROM candidates
-- UNION ALL
-- SELECT 'positions', COUNT(*) FROM positions
-- UNION ALL
-- SELECT 'invoice_items', COUNT(*) FROM invoice_items
-- UNION ALL
-- SELECT 'payment_transactions', COUNT(*) FROM payment_transactions
-- UNION ALL
-- SELECT 'invoices', COUNT(*) FROM invoices
-- UNION ALL
-- SELECT 'election_add_ons', COUNT(*) FROM election_add_ons
-- UNION ALL
-- SELECT 'elections', COUNT(*) FROM elections;

