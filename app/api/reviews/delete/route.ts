import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API Route to delete a review by ID.
 * Note: There is no authentication on the marketing site, so this is
 * a best-effort "delete your own review" feature. The frontend only
 * exposes the delete button for reviews created from the current browser.
 */
export async function DELETE(request: NextRequest) {
  try {
    let reviewId: string | null = null

    // Try to read ID from JSON body
    try {
      const body = await request.json()
      if (body && typeof body.id === 'string') {
        reviewId = body.id
      }
    } catch {
      // Ignore body parse errors; we'll fall back to query param
    }

    // Fallback: read from query string
    if (!reviewId) {
      const { searchParams } = new URL(request.url)
      reviewId = searchParams.get('id')
    }

    if (!reviewId) {
      return NextResponse.json(
        { success: false, message: 'Review ID is required' },
        { status: 400 }
      )
    }

    await db.deleteReview(reviewId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Error deleting review:', error)
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to delete review',
      },
      { status: 500 }
    )
  }
}



