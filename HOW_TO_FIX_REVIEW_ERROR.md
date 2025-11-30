# How to Fix the Review 500 Error

## The Problem
You're getting a "HTTP error! status: 500" when submitting a review. This means the `client_reviews` table doesn't exist in your Supabase database.

## Quick Fix (5 minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Sign in to your account
3. Select your Prelyct project

### Step 2: Open SQL Editor
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New query"** button

### Step 3: Copy and Paste SQL
1. Open the file `CREATE_REVIEWS_TABLE.sql` in this project
2. **Select ALL** the text (Ctrl+A or Cmd+A)
3. **Copy** it (Ctrl+C or Cmd+C)
4. **Paste** it into the Supabase SQL Editor (Ctrl+V or Cmd+V)

### Step 4: Run the SQL
1. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for it to complete
3. You should see: **"Success. No rows returned"** or a success message

### Step 5: Verify Table Was Created
1. Click **"Table Editor"** in the left sidebar
2. Look for **"client_reviews"** in the table list
3. If you see it, you're done! ✅

### Step 6: Test Again
1. Go back to your website
2. Try submitting a review again
3. It should work now! 🎉

## Alternative: If Table Already Exists

If you get an error saying the table already exists, use this instead:

1. In Supabase SQL Editor, run:
```sql
DROP TABLE IF EXISTS client_reviews CASCADE;
```

2. Then run the full `CREATE_REVIEWS_TABLE.sql` script again

## Need Help?

Check the browser console (F12) for detailed error messages. The error should tell you exactly what's wrong.


