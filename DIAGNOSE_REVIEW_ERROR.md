# Diagnose Review 500 Error - Step by Step

## Step 1: Check Server Logs (MOST IMPORTANT!)

**Look at your terminal/console where Next.js is running.** When you submit a review, you should see detailed error logs like:

```
Error submitting review: [error details]
Supabase error code: 42P01
Error message: relation "client_reviews" does not exist
```

**Copy the exact error message you see** - this will tell us what's wrong!

## Step 2: Check if Table Exists

1. Open Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'client_reviews';
```

**If you see NO RESULTS** → The table doesn't exist. Go to Step 3.
**If you see `client_reviews`** → The table exists, but there might be a permission issue.

## Step 3: Check Supabase Connection

Visit this URL in your browser:
```
http://localhost:3000/api/reviews/check-table
```

This will tell you if:
- The table exists
- There's a connection issue
- There's a permission issue

## Step 4: Check Environment Variables

Make sure you have `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**After changing .env.local, restart your Next.js server!**

## Step 5: Create the Table

If the table doesn't exist:

1. Open Supabase Dashboard → SQL Editor
2. Open `CREATE_REVIEWS_TABLE.sql` file
3. Copy ALL the contents
4. Paste into SQL Editor
5. Click "Run"
6. You should see: "Success. No rows returned"

## Common Issues:

### Issue 1: Table doesn't exist
**Solution:** Run `CREATE_REVIEWS_TABLE.sql` in Supabase

### Issue 2: Wrong Supabase credentials
**Solution:** Check `.env.local` and restart server

### Issue 3: RLS blocking inserts
**Solution:** The SQL already sets up correct policies, but verify in Supabase Dashboard → Authentication → Policies

### Issue 4: Server not restarted after .env changes
**Solution:** Stop server (Ctrl+C) and restart with `npm run dev`

## What to Share:

Please share:
1. The exact error message from your server console/terminal
2. Result from `/api/reviews/check-table` endpoint
3. Whether the table exists (from Step 2)



