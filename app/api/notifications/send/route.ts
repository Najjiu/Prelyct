import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, sendElectionReminder, sendPaymentAlert, sendVoteUpdate } from '@/lib/email'

/**
 * API route to send notifications
 * This is called from server-side code to send notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, userId, ...data } = body

    if (!type || !userId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (type, userId)' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'election_reminder':
        await sendElectionReminder(
          userId,
          data.electionId,
          data.reminderType,
          data.electionName,
          data.date,
          data.description
        )
        break

      case 'payment_alert':
        await sendPaymentAlert(
          userId,
          data.invoiceId,
          data.invoiceNumber,
          data.amount,
          data.message,
          data.dueDate
        )
        break

      case 'vote_update':
        await sendVoteUpdate(
          userId,
          data.electionId,
          data.electionName,
          data.message,
          data.voteCount
        )
        break

      default:
        await sendNotification(userId, type, data)
    }

    return NextResponse.json({ success: true, message: 'Notification sent' })
  } catch (error: any) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send notification' },
      { status: 500 }
    )
  }
}


