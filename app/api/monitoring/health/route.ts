import { NextRequest, NextResponse } from 'next/server'
import { getSystemHealth } from '@/lib/monitoring'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { user } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const health = await getSystemHealth()

    return NextResponse.json({
      success: true,
      data: health,
    })
  } catch (error: any) {
    console.error('Error getting system health:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get system health' },
      { status: 500 }
    )
  }
}


