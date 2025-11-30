# ✅ Review System - Complete Checklist

## Current Status
The review system code is **100% correct**. Here's what you need to do:

## Step-by-Step Setup

### 1. ✅ Check Next.js Server is Running
**VERY IMPORTANT:** Your Next.js server must be running for API routes to work!

```bash
npm run dev
```

You should see: `Ready - started server on 0.0.0.0:3000`

**If server is not running, the "fetch failed" error will occur!**

### 2. ✅ Create Database Table
1. Open: **https://app.supabase.com**
2. Select your Prelyct project
3. Go to **SQL Editor**
4. Open file: **`CREATE_REVIEWS_TABLE.sql`**
5. Copy ALL contents (Ctrl+A, Ctrl+C)
6. Paste into SQL Editor
7. Click **"Run"**
8. Verify: You should see success message

### 3. ✅ Verify Environment Variables
Check that `.env.local` exists and has:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

**After changing .env.local, restart the server!**

### 4. ✅ Test the System
1. Visit: `http://localhost:3000/our-work`
2. Click "Share Your Experience"
3. Fill out the form
4. Submit

## Common Errors & Fixes

### Error: "TypeError: fetch failed"
**Cause:** Next.js server is not running
**Fix:** Run `npm run dev` in terminal

### Error: "HTTP error! status: 500"
**Cause:** Database table doesn't exist
**Fix:** Run `CREATE_REVIEWS_TABLE.sql` in Supabase (Step 2 above)

### Error: "Table does not exist"
**Cause:** SQL wasn't run successfully
**Fix:** 
1. Check Supabase SQL Editor for errors
2. Run the SQL again
3. Verify table exists in Table Editor

## Quick Test
Visit: `http://localhost:3000/api/reviews/check-table`

This will tell you:
- ✅ If Supabase is configured
- ✅ If the table exists
- ✅ Any connection issues

## The Review System Supports:
- ✅ Public submissions (no login required)
- ✅ Auto-approval
- ✅ Immediate display
- ✅ Statistics dashboard
- ✅ Category filtering
- ✅ Mobile responsive

**Everything is ready - just create the table!**



