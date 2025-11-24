import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const electionId = searchParams.get('electionId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (electionId) {
      query = query.eq('election_id', electionId)
    }

    const { data: alerts, error } = await query

    if (error) {
      // If table doesn't exist or other error, return empty array
      console.error('Error getting alerts:', error)
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    return NextResponse.json({
      success: true,
      data: alerts || [],
    })
  } catch (error: any) {
    console.error('Error getting alerts:', error)
    // Return empty array instead of error
    return NextResponse.json({
      success: true,
      data: [],
    })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { alertId, action } = body // action: 'acknowledge' | 'resolve'

    if (!alertId || !action) {
      return NextResponse.json(
        { success: false, error: 'alertId and action are required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (action === 'acknowledge') {
      updateData.status = 'acknowledged'
      updateData.acknowledged_at = new Date().toISOString()
      updateData.acknowledged_by = user.id
    } else if (action === 'resolve') {
      updateData.status = 'resolved'
      updateData.resolved_at = new Date().toISOString()
      updateData.resolved_by = user.id
    }

    const { data, error } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', alertId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating alert:', error)
      return NextResponse.json({
        success: false,
        error: error.message || 'Failed to update alert',
      })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update alert' },
      { status: 500 }
    )
  }
}


