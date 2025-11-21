import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabaseClient'

// This endpoint handles webhooks from payment providers (Stripe/Paystack)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const eventType = body.type || body.event

    // Verify webhook signature (important for security)
    // TODO: Add signature verification for Stripe/Paystack

    // Handle payment success
    if (eventType === 'payment_intent.succeeded' || eventType === 'charge.success') {
      const transactionId = body.data?.id || body.data?.reference
      const amount = body.data?.amount || body.data?.amount_paid
      const electionId = body.metadata?.election_id

      if (transactionId && electionId) {
        // Update payment transaction
        await db.updatePaymentTransaction(transactionId, {
          status: 'completed',
          provider_transaction_id: transactionId,
        })

        // Update election payment status
        const election = await db.getElection(electionId)
        if (election) {
          await db.updateElection(electionId, {
            payment_status: 'paid',
            payment_date: new Date().toISOString(),
            payment_intent_id: transactionId,
          })

          // Update invoice status
          const invoices = await db.getInvoices(electionId)
          const pendingInvoice = invoices.find((inv) => inv.status === 'pending')
          if (pendingInvoice) {
            // Update invoice via Supabase
            const { supabase } = await import('@/lib/supabaseClient')
            await supabase
              .from('invoices')
              .update({
                status: 'paid',
                paid_date: new Date().toISOString(),
                transaction_id: transactionId,
              })
              .eq('id', pendingInvoice.id)
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}




