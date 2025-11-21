import { NextRequest, NextResponse } from 'next/server'
import { supabase, db } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { election_id, amount, currency = 'GHS' } = body

    if (!election_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify election belongs to user
    const election = await db.getElection(election_id)
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    // Create payment transaction
    const transaction = await db.createPaymentTransaction({
      election_id,
      amount,
      currency,
      payment_provider: 'stripe', // or 'paystack' based on your preference
    })

    // TODO: Integrate with Stripe/Paystack here
    // For now, we'll return a mock payment intent
    // In production, you would:
    // 1. Create a payment intent with Stripe/Paystack
    // 2. Store the payment intent ID
    // 3. Return the client secret or payment link

    return NextResponse.json({
      transaction_id: transaction.id,
      amount,
      currency,
      status: 'pending',
      // payment_intent_id: paymentIntent.id, // from Stripe/Paystack
      // client_secret: paymentIntent.client_secret, // for Stripe
      // payment_link: paymentLink.url, // for Paystack
    })
  } catch (error: any) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}




