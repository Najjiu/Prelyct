import { NextRequest, NextResponse } from 'next/server'
import { getWhiteLabelSettings, updateWhiteLabelSettings } from '@/lib/whiteLabel'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { user } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getWhiteLabelSettings(user.id)

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error: any) {
    console.error('Error getting white-label settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get white-label settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const settings = body.settings

    if (!settings || !settings.organizationName) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    await updateWhiteLabelSettings(user.id, settings)

    return NextResponse.json({
      success: true,
      message: 'White-label settings updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating white-label settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update white-label settings' },
      { status: 500 }
    )
  }
}


