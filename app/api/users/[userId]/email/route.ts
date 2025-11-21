import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

/**
 * API route to get user email by user ID
 * This is used by the notification service to get user emails
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user email from Supabase Auth
    // Note: This requires service role key or admin access
    // For now, we'll try to get it from the current session if it matches
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (currentUser && currentUser.id === userId) {
      return NextResponse.json({ 
        success: true, 
        email: currentUser.email 
      })
    }

    // If not current user, we'd need admin access
    // For production, use Supabase Admin API with service role key
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 403 }
    )
  } catch (error: any) {
    console.error('Error fetching user email:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch user email' },
      { status: 500 }
    )
  }
}


