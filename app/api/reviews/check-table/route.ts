import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint to check if client_reviews table exists
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        exists: false,
        error: 'Supabase not configured',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        },
        hint: 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local',
      }, { status: 500 })
    }

    // Try to query the table
    const { data, error } = await supabase
      .from('client_reviews')
      .select('id')
      .limit(1)

    if (error) {
      // Check if it's a "table doesn't exist" error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          exists: false,
          error: 'Table "client_reviews" does not exist',
          hint: 'Run the SQL from CREATE_REVIEWS_TABLE.sql in Supabase SQL Editor',
          code: error.code,
          message: error.message,
          fix: 'Go to Supabase Dashboard → SQL Editor → Run CREATE_REVIEWS_TABLE.sql',
        })
      }

      // Check for permission errors
      if (error.code === '42501') {
        return NextResponse.json({
          exists: true,
          accessible: false,
          error: 'Permission denied',
          hint: 'Check Row Level Security policies',
          code: error.code,
          message: error.message,
        })
      }

      return NextResponse.json({
        exists: false,
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
      })
    }

    return NextResponse.json({
      exists: true,
      accessible: true,
      message: 'Table "client_reviews" exists and is accessible',
      sampleData: data,
    })
  } catch (error: any) {
    return NextResponse.json({
      exists: false,
      error: error.message || 'Unknown error',
      type: error.constructor.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}

