# 🚨 FIX REVIEW ERROR - STEP BY STEP GUIDE

## The Problem
You're getting "HTTP error! status: 500" when submitting a review. This means the database table doesn't exist or isn't configured.

## ✅ QUICK FIX (Copy & Paste Solution)

### Step 1: Open Supabase Dashboard
1. Go to: **https://app.supabase.com**
2. Sign in
3. Select your **Prelyct** project

### Step 2: Open SQL Editor
1. Click **"SQL Editor"** in left sidebar
2. Click **"New query"** button

### Step 3: Copy & Run SQL
1. Open the file **`CREATE_REVIEWS_TABLE.sql`** in this project
2. **Select ALL** (Ctrl+A)
3. **Copy** (Ctrl+C)
4. **Paste** into Supabase SQL Editor (Ctrl+V)
5. Click **"Run"** button (or press Ctrl+Enter)

### Step 4: Verify Success
You should see: **"Success. No rows returned"** or **"Table client_reviews created successfully! ✅"**

### Step 5: Test Again
1. Go back to your website
2. Submit a review
3. **It should work now!** ✅

---

## 🔍 If It Still Doesn't Work

### Check 1: Verify Table Exists
Run this in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'client_reviews';
```
**If no results → Table doesn't exist. Run Step 3 above again.**

### Check 2: Verify Supabase is Configured
1. Check you have `.env.local` file in project root
2. Make sure it contains:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. **Restart your Next.js server** after adding/updating `.env.local`

### Check 3: Test Connection
Visit in browser: `http://localhost:3000/api/reviews/check-table`
This will tell you if the table exists and is accessible.

---

## 📋 What the SQL Creates

The table will have these columns:
- ✅ `id` (UUID)
- ✅ `client_name` (required)
- ✅ `client_company` (optional)
- ✅ `project_category` (required)
- ✅ `rating` (1-5, required)
- ✅ `review_text` (required)
- ✅ `status` (default: 'approved')
- ✅ Timestamps (created_at, updated_at, approved_at)

**That's it! Simple and matches your form exactly.**

---

## 🆘 Still Having Issues?

1. **Check your server console** (where Next.js is running) - look for error messages
2. **Check browser console** (F12) - look for error messages  
3. Share the exact error message you see

The most common issue is: **Table doesn't exist** → Run the SQL from Step 3!


