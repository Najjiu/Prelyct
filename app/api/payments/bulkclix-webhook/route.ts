import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabaseClient'

/**
 * BulkClix Webhook Handler
 * This endpoint receives payment status updates from BulkClix
 * 
 * Webhook payload structure (from BulkClix docs):
 * {
 *   "amount": "2.00",
 *   "status": "success",
 *   "transaction_id": "9034434787488798989",
 *   "ext_transaction_id": "346223118291",
 *   "phone_number": "0541000000"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract webhook data
    const {
      amount,
      status,
      transaction_id, // BulkClix transaction ID
      ext_transaction_id, // External transaction ID (our client_reference)
      phone_number,
    } = body

    console.log('BulkClix webhook received:', { amount, status, transaction_id, ext_transaction_id, phone_number })

    // Extract our transaction ID from client_reference (format: PRELYCT-{transactionId}-{timestamp})
    let ourTransactionId: string | null = null
    if (ext_transaction_id && ext_transaction_id.startsWith('PRELYCT-')) {
      const parts = ext_transaction_id.split('-')
      if (parts.length >= 2) {
        ourTransactionId = parts[1]
      }
    }

    if (!ourTransactionId) {
      console.error('Could not extract transaction ID from client_reference:', ext_transaction_id)
      return NextResponse.json(
        { error: 'Invalid client_reference format' },
        { status: 400 }
      )
    }

    // Map BulkClix status to our status format
    let transactionStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' = 'pending'
    if (status === 'success' || status === 'successful') {
      transactionStatus = 'completed'
    } else if (status === 'failed' || status === 'error') {
      transactionStatus = 'failed'
    } else if (status === 'pending') {
      transactionStatus = 'pending'
    }

    // Update payment transaction in database
    const transaction = await db.getPaymentTransaction(ourTransactionId)
    if (!transaction) {
      console.error('Transaction not found:', ourTransactionId)
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Update transaction status
    await db.updatePaymentTransaction(ourTransactionId, {
      status: transactionStatus,
      provider_transaction_id: transaction_id,
      metadata: {
        ...(transaction.metadata || {}),
        webhook_received_at: new Date().toISOString(),
        bulkclix_status: status,
        phone_number: phone_number,
      },
    })

    // If payment is successful, we need to check if votes need to be submitted
    // This is handled by the frontend polling, but we can also trigger it here if needed
    if (transactionStatus === 'completed') {
      console.log('Payment completed for transaction:', ourTransactionId)
      // The frontend will detect the status change when polling
    }

    return NextResponse.json({ received: true, status: transactionStatus })
  } catch (error: any) {
    console.error('BulkClix webhook processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

