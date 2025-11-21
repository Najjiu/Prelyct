# Storage Bucket Setup Instructions

## Quick Setup Guide

Due to permission restrictions, you need to create the storage bucket manually first, then run the migration for RLS policies.

### Step 1: Create the Bucket (Manual - Required)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"** button
   - **Bucket name**: `prelyct-votes` (exactly as shown)
   - **Public bucket**: Toggle this **ON** (important for public image URLs)
   - Click **"Create bucket"**

### Step 2: Run the Migration

1. **Go to SQL Editor**
   - In Supabase Dashboard, go to **SQL Editor**
   - Click **"New query"**

2. **Run the Migration**
   - Open `supabase/migrations/006_create_storage_bucket.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **"Run"** or press `Ctrl+Enter`

3. **Expected Behavior**
   - The bucket creation SQL may show a warning (that's okay if bucket already exists)
   - The RLS policies should be created successfully
   - You should see "Success. No rows returned" or similar

### Step 3: Verify Setup

1. **Check Bucket Exists**
   - Go to **Storage** → You should see `prelyct-votes` bucket
   - Verify it's marked as **Public**

2. **Check Policies**
   - Go to **Storage** → **Policies**
   - Select the `prelyct-votes` bucket
   - You should see 4 policies:
     - ✅ Authenticated users can upload candidate images
     - ✅ Public can view images
     - ✅ Authenticated users can update candidate images
     - ✅ Authenticated users can delete candidate images

### Step 4: Test Upload

1. **Test in Application**
   - Go to an election in your dashboard
   - Try adding a candidate with an image
   - Upload should work if everything is configured correctly

## Troubleshooting

### Error: "must be owner of table objects"
- **Solution**: This is expected. The bucket must be created manually via Dashboard first.
- The migration will still create the RLS policies successfully.

### Error: "bucket not found"
- **Solution**: Make sure you created the bucket manually in Step 1
- Verify the bucket name is exactly `prelyct-votes`

### Error: "policy already exists"
- **Solution**: The migration includes `DROP POLICY IF EXISTS` statements
- If you still get this error, manually delete the existing policies and re-run

### Images not uploading
- Check that the bucket is **Public**
- Verify all 4 RLS policies are created
- Check browser console for specific error messages
- Ensure you're authenticated when uploading

## What the Migration Does

1. **Attempts to create bucket** (may fail due to permissions - that's okay)
2. **Creates 4 RLS policies**:
   - Upload policy for authenticated users
   - Public read access
   - Update policy for authenticated users
   - Delete policy for authenticated users

## Folder Structure

Images will be stored in:
```
prelyct-votes/
  └── candidates/
      └── [timestamp]-[random].jpg
```

## File Limits

- **Max file size**: 5MB
- **Allowed types**: JPEG, PNG, WebP, GIF
- Enforced both in database and application code

