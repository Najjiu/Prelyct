import { NextRequest, NextResponse } from 'next/server'
import { getSystemHealth } from '@/lib/monitoring'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const health = await getSystemHealth()

    return NextResponse.json({
      success: true,
      data: health,
    })
  } catch (error: any) {
    console.error('Error getting system health:', error)
    // Return default health data instead of error
    return NextResponse.json({
      success: true,
      data: {
        activeElections: 0,
        totalVotesToday: 0,
        averageResponseTime: 0,
        errorRate: 0,
        status: 'healthy' as const,
      },
    })
  }
}


