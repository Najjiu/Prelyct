# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage for candidate image uploads.

## Step 1: Create Storage Bucket

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"**
   - Bucket name: `prelyct-votes`
   - Make it **Public** (so images can be accessed via public URLs)
   - Click **"Create bucket"**

## Step 2: Configure Bucket Policies

1. **Set up RLS Policies**
   - Go to **Storage** → **Policies** → Select `prelyct-votes` bucket
   - Add the following policies:

### Policy 1: Allow Authenticated Users to Upload
```sql
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prelyct-votes' AND
  (storage.foldername(name))[1] = 'candidates'
);
```

### Policy 2: Allow Public Read Access
```sql
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'prelyct-votes');
```

### Policy 3: Allow Users to Delete Their Own Images
```sql
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'prelyct-votes' AND
  (storage.foldername(name))[1] = 'candidates'
);
```

## Step 3: Verify Setup

1. **Test Upload**
   - Try uploading a candidate image in the dashboard
   - Verify the image appears correctly
   - Check that the public URL works

## Folder Structure

The storage bucket will organize files as follows:
```
prelyct-votes/
  └── candidates/
      └── [timestamp]-[random].jpg
```

## File Size Limits

- Maximum file size: **5MB** (enforced in the application)
- Supported formats: JPEG, PNG, WebP, GIF

## Troubleshooting

### Error: "Bucket not found"
- Make sure the bucket name is exactly `prelyct-votes`
- Verify the bucket exists in your Supabase project

### Error: "Permission denied"
- Check that RLS policies are correctly configured
- Verify the user is authenticated
- Check bucket is set to public

### Images not displaying
- Verify the bucket is public
- Check that the public URL is correct
- Ensure CORS is configured (should be automatic for public buckets)

