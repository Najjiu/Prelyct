import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabaseClient'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

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

    console.log('📥 Payment Callback (Webhook) Received:', { 
      amount, 
      status, 
      transaction_id, 
      ext_transaction_id, 
      phone_number 
    })

    // Extract our transaction ID from client_reference
    // New format: client_reference is just the transaction ID (UUID, 36 chars)
    // Old format (for backwards compatibility): PRELYCT-{transactionId}-{timestamp}
    let ourTransactionId: string | null = null
    
    if (ext_transaction_id) {
      // Check if it's the old format with PRELYCT prefix
      if (ext_transaction_id.startsWith('PRELYCT-')) {
        const parts = ext_transaction_id.split('-')
        if (parts.length >= 2) {
          ourTransactionId = parts[1]
        }
      } else {
        // New format: ext_transaction_id IS the transaction ID (UUID)
        // UUIDs are exactly 36 characters
        ourTransactionId = ext_transaction_id.length === 36 ? ext_transaction_id : null
      }
    }

    if (!ourTransactionId && !transaction_id) {
      console.error('Could not extract transaction ID from webhook payload:', {
        ext_transaction_id,
        transaction_id,
      })
      return NextResponse.json(
        { error: 'Invalid webhook payload: missing transaction identifiers' },
        { status: 400 }
      )
    }

    // Map BulkClix status to database status
    let dbStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' = 'pending'
    if (status === 'success' || status === 'successful' || status === 'completed') {
      dbStatus = 'completed'
    } else if (status === 'failed' || status === 'error' || status === 'declined' || status === 'cancelled') {
      dbStatus = 'failed'
    }

    // Update payment transaction in database
    if (ourTransactionId) {
      try {
        const transaction = await db.getPaymentTransaction(ourTransactionId)
        if (transaction) {
          await db.updatePaymentTransaction(ourTransactionId, {
            status: dbStatus,
            provider_transaction_id: transaction_id,
            metadata: {
              ...(transaction.metadata || {}),
              webhook_received_at: new Date().toISOString(),
              bulkclix_status: status,
              phone_number: phone_number,
            },
          })
          console.log('✅ Database transaction updated:', ourTransactionId, '→', dbStatus)
        } else {
          console.warn('⚠️ Transaction not found in database:', ourTransactionId)
        }
      } catch (dbError) {
        console.error('Database update error:', dbError)
      }
    }

    return NextResponse.json({ 
      received: true, 
      transaction_id: ourTransactionId || transaction_id,
      status: dbStatus,
      message: 'Webhook processed successfully'
    })
  } catch (error: any) {
    console.error('BulkClix webhook processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

