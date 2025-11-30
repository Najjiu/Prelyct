import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabaseClient'
import { checkBulkClixTransactionStatus } from '@/lib/bulkclix'

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic'

/**
 * Payment Status Check API
 * Checks the current status of a payment transaction by querying both
 * the database (updated by webhook) and BulkClix API
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('transaction_id')

    if (!transactionId) {
      return NextResponse.json(
        { error: 'transaction_id is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Checking payment status for:', transactionId)

    // First check: Database (updated by webhook - most reliable)
    try {
      const dbTransaction = await db.getPaymentTransaction(transactionId)
      
      if (dbTransaction) {
        // Map database status to API status
        if (dbTransaction.status === 'completed') {
          console.log('✅ Status from database: completed')
          return NextResponse.json({
            status: 'success',
            transaction_id: transactionId,
            amount: dbTransaction.amount?.toString(),
            source: 'database',
            message: 'Payment completed',
            updated_at: dbTransaction.updated_at || dbTransaction.created_at,
          })
        } else if (dbTransaction.status === 'failed' || dbTransaction.status === 'refunded') {
          console.log('❌ Status from database: failed')
          return NextResponse.json({
            status: 'failed',
            transaction_id: transactionId,
            source: 'database',
            message: 'Payment failed',
            updated_at: dbTransaction.updated_at || dbTransaction.created_at,
          })
        }
      }
    } catch (dbError) {
      console.warn('Database check error (continuing with API check):', dbError)
      // Continue to BulkClix API check
    }

    // Second check: BulkClix API (fallback if database doesn't have final status)
    // Get BulkClix transaction ID from database transaction metadata if available
    let bulkclixTransactionId = transactionId
    try {
      const dbTransaction = await db.getPaymentTransaction(transactionId)
      if (dbTransaction?.provider_transaction_id) {
        bulkclixTransactionId = dbTransaction.provider_transaction_id
      }
    } catch (e) {
      // Use transactionId as fallback
    }

    const bulkclixStatus = await checkBulkClixTransactionStatus(bulkclixTransactionId)
    
    if (bulkclixStatus) {
      console.log('📥 Status from BulkClix API:', bulkclixStatus.status)
      
      // Normalize status
      let normalizedStatus: 'pending' | 'success' | 'failed' = 'pending'
      if (bulkclixStatus.status === 'successful' || bulkclixStatus.status === 'success') {
        normalizedStatus = 'success'
      } else if (bulkclixStatus.status === 'failed' || bulkclixStatus.status === 'cancelled') {
        normalizedStatus = 'failed'
      }

      return NextResponse.json({
        status: normalizedStatus,
        transaction_id: transactionId,
        amount: bulkclixStatus.amount?.toString(),
        phone_number: bulkclixStatus.phone,
        network: bulkclixStatus.network,
        ext_transaction_id: bulkclixStatus.reference,
        source: 'api',
        message: bulkclixStatus.message || 'Status from BulkClix API',
        updated_at: new Date().toISOString(),
      })
    }

    // Default: pending status
    console.log('⏳ Status: pending (no updates found)')
    return NextResponse.json({
      status: 'pending',
      transaction_id: transactionId,
      source: 'default',
      message: 'Payment is being processed',
      updated_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check payment status' },
      { status: 500 }
    )
  }
}

