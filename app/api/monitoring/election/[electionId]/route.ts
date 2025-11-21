import { NextRequest, NextResponse } from 'next/server'
import { getElectionMetrics } from '@/lib/monitoring'
import { supabase } from '@/lib/supabaseClient'

export async function GET(
  request: NextRequest,
  { params }: { params: { electionId: string } }
) {
  try {
    const { user } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { electionId } = params

    // Verify user owns this election
    const { data: election } = await supabase
      .from('elections')
      .select('user_id')
      .eq('id', electionId)
      .single()

    if (!election || election.user_id !== user.id) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    const metrics = await getElectionMetrics(electionId)

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error: any) {
    console.error('Error getting election metrics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get election metrics' },
      { status: 500 }
    )
  }
}


