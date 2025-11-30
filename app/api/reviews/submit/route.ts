import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Add CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * API Route to submit a client review
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      client_name,
      client_company,
      project_category,
      rating,
      review_text,
    } = body

    // Validate required fields
    if (!client_name || !project_category || !rating || !review_text) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    console.log('Review submission request:', {
      client_name,
      client_company,
      project_category,
      rating,
      review_text,
    })

    // Submit review (simplified - only fields from form)
    const review = await db.submitReview({
      client_name,
      client_company: client_company || undefined,
      project_category,
      rating,
      review_text,
    })
    
    console.log('Review submitted successfully:', review)

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully! Your review has been published.',
      review_id: review.id,
      review: review, // Return the full review object
    }, {
      headers: corsHeaders,
    })
  } catch (error: any) {
    console.error('Error submitting review:', error)
    console.error('Full error object:', JSON.stringify(error, null, 2))
    
    // Extract detailed error information
    const errorDetails: any = {
      message: error?.message || 'Unknown error',
      details: error?.details || null,
      hint: error?.hint || null,
      code: error?.code || null,
    }
    
    // Check if it's a Supabase error
    if (error?.code) {
      console.error('Supabase error code:', error.code)
      if (error.code === '42P01') {
        errorDetails.message = 'Database table "client_reviews" does not exist. Please run the migration SQL.'
        errorDetails.hint = 'Run the SQL in supabase/migrations/010_create_client_reviews.sql'
      } else if (error.code === '42501') {
        errorDetails.message = 'Permission denied. Check Row Level Security policies.'
      }
    }
    
    // Return detailed error message (always show details for debugging)
    // Include the full error message so user can see what's wrong
    const userMessage = errorDetails.code === '42P01' 
      ? 'Database table "client_reviews" does not exist. Please run the migration SQL in Supabase Dashboard.'
      : errorDetails.message
    
    return NextResponse.json(
      { 
        success: false, 
        message: userMessage,
        error: {
          ...errorDetails,
          help: errorDetails.code === '42P01' 
            ? 'Go to Supabase Dashboard → SQL Editor → Run the SQL from supabase/migrations/011_simplify_client_reviews.sql'
            : 'Check server logs for more details'
        },
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

