import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Diagnostic endpoint to check Supabase configuration from the app's point of view.
 * Does NOT expose keys, only whether they are present.
 */
export async function GET(request: NextRequest) {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return NextResponse.json({
    hasUrl,
    hasKey,
  })
}



