# Quick Supabase Setup Guide

## 🚀 Automated Setup (Recommended)

### For Windows (PowerShell):
```powershell
.\setup-supabase.ps1
```

### For Mac/Linux:
```bash
npm run setup:supabase
# or
node setup-supabase.js
```

The script will guide you through:
1. Creating your Supabase project
2. Getting your API keys
3. Setting up environment variables
4. Running the database migration

## 📋 Manual Setup (Alternative)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `prelyct-votes`
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** and wait

### Step 2: Get API Keys
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL**
   - **anon public** key

### Step 3: Set Environment Variables
Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4: Run Database Migration
1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Open `supabase/migrations/001_initial_schema.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. Verify success: "Success. No rows returned"

### Step 5: Verify Setup
1. Start dev server: `npm run dev`
2. Navigate to `/dashboard/votes/new`
3. Create a test election
4. Check Supabase dashboard → **Table Editor** → `elections`
5. Verify election and invoice were created

## ✅ What Gets Created

The migration creates:
- ✅ Pricing tiers (Starter, Growth, Campus, Enterprise)
- ✅ Add-ons (Audit PDF, SMS Blast, Concierge)
- ✅ Elections table with pricing fields
- ✅ Invoices and invoice items tables
- ✅ Payment transactions table
- ✅ Voting system tables (positions, candidates, voters, votes)
- ✅ Row Level Security (RLS) policies

## 🐛 Troubleshooting

**"User not authenticated" errors:**
- Make sure you're signed in to the dashboard
- Check that Supabase auth is configured

**"Election not found" errors:**
- Verify RLS policies are enabled
- Check that election belongs to current user

**Migration errors:**
- Make sure you're in the correct Supabase project
- Check for existing tables that might conflict
- Verify database permissions

## 📞 Need Help?

Check:
1. Supabase dashboard logs
2. Browser console for errors
3. Network tab for API errors
4. [Supabase docs](https://supabase.com/docs)




