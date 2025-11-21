import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { sendElectionReminder } from '@/lib/email'

export const dynamic = 'force-dynamic'

/**
 * Cron job endpoint to send election reminders
 * This should be called periodically (e.g., every hour) to check for upcoming elections
 * 
 * To set up:
 * 1. Use a cron service like Vercel Cron, GitHub Actions, or a traditional cron job
 * 2. Call this endpoint: GET /api/cron/election-reminders
 * 3. Optionally protect with a secret: ?secret=YOUR_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Protect with a secret
    const secret = request.nextUrl.searchParams.get('secret')
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now

    // Find elections starting or ending soon
    const { data: elections, error } = await supabase
      .from('elections')
      .select('id, user_id, name, description, start_date, end_date, status')
      .eq('status', 'active')
      .or(`start_date.gte.${now.toISOString()},end_date.gte.${now.toISOString()}`)
      .lte('start_date', oneDayFromNow.toISOString())
      .or(`end_date.lte.${oneDayFromNow.toISOString()},end_date.gte.${now.toISOString()}`)

    if (error) {
      throw error
    }

    let remindersSent = 0
    const errors: string[] = []

    for (const election of elections || []) {
      try {
        const startDate = new Date(election.start_date)
        const endDate = new Date(election.end_date)

        // Send reminder if election starts within 24 hours (and hasn't started yet)
        if (startDate > now && startDate <= oneDayFromNow) {
          const dateStr = startDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })

          await sendElectionReminder(
            election.user_id,
            election.id,
            'starting',
            election.name,
            dateStr,
            election.description || undefined
          )
          remindersSent++
        }

        // Send reminder if election ends within 24 hours (and hasn't ended yet)
        if (endDate > now && endDate <= oneDayFromNow) {
          const dateStr = endDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })

          await sendElectionReminder(
            election.user_id,
            election.id,
            'ending',
            election.name,
            dateStr,
            election.description || undefined
          )
          remindersSent++
        }
      } catch (error: any) {
        errors.push(`Election ${election.id}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Error in election reminders cron:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process reminders' },
      { status: 500 }
    )
  }
}


