import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabaseClient'

// Force this route to be dynamic and run on the Node.js runtime
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API Route to get approved reviews
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined

    console.log('📥 GET /api/reviews/get - category:', category || 'all')
    
    const reviews = await db.getApprovedReviews(category)

    console.log(`✅ Returning ${reviews?.length || 0} reviews`)

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
      count: reviews?.length || 0,
    })
  } catch (error: any) {
    console.error('❌ Error fetching reviews:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
    })
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to fetch reviews',
        error: {
          code: error?.code,
          message: error?.message,
        }
      },
      { status: 500 }
    )
  }
}

