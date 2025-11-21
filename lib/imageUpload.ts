import { supabase } from './supabaseClient'

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param folder - The folder path in storage (e.g., 'candidates', 'elections')
 * @param fileName - Optional custom file name. If not provided, generates a unique name
 * @returns The public URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  folder: string = 'candidates',
  fileName?: string
): Promise<string> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new Error('Image size must be less than 5MB')
    }

    // Generate unique file name if not provided
    const fileExt = file.name.split('.').pop()
    const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `${folder}/${finalFileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('prelyct-votes') // Storage bucket name
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      // If bucket doesn't exist, create it (this requires admin access)
      if (error.message.includes('Bucket not found')) {
        throw new Error('Storage bucket not configured. Please contact support.')
      }
      throw error
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('prelyct-votes')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error: any) {
    console.error('Image upload error:', error)
    throw new Error(error.message || 'Failed to upload image')
  }
}

/**
 * Delete an image from Supabase Storage
 * @param imageUrl - The public URL of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    const bucketIndex = pathParts.indexOf('prelyct-votes')
    
    if (bucketIndex === -1) {
      throw new Error('Invalid image URL')
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/')

    // Delete file from Supabase Storage
    const { error } = await supabase.storage
      .from('prelyct-votes')
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error: any) {
    console.error('Image deletion error:', error)
    // Don't throw error - image deletion is not critical
  }
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.'
    }
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image size must be less than 5MB. Please compress your image and try again.'
    }
  }

  return { valid: true }
}

