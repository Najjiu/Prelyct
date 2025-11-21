import { NextRequest, NextResponse } from 'next/server'
import { initiateBulkClixPayment, formatPhoneForBulkClix, queryMobileMoneyName } from '@/lib/bulkclix'

/**
 * API Route to initiate BulkClix payment
 * This is called from the client to avoid CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, account_number, channel, account_name, client_reference } = body

    // Validate required fields
    if (!amount || !account_number || !channel || !account_name || !client_reference) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneForBulkClix(account_number)

    // Try to query account name if not provided
    let finalAccountName = account_name
    if (!finalAccountName || finalAccountName === 'Voter') {
      try {
        const queriedName = await queryMobileMoneyName(formattedPhone)
        if (queriedName) {
          finalAccountName = queriedName
        }
      } catch (error) {
        console.warn('Could not query account name:', error)
        // Continue with provided name
      }
    }

    // Initiate payment
    const paymentResponse = await initiateBulkClixPayment({
      amount: String(amount),
      account_number: formattedPhone,
      channel: channel as 'MTN' | 'Airtel' | 'Vodafone',
      account_name: finalAccountName,
      client_reference: client_reference,
    })

    if (!paymentResponse.success) {
      const errorMessage = paymentResponse.message || 'Failed to initiate payment'
      
      // Provide helpful message for account configuration issues
      if (errorMessage.toLowerCase().includes('not allowed') || 
          errorMessage.toLowerCase().includes('momo collection') ||
          errorMessage.toLowerCase().includes('contact support')) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Your BulkClix account is not enabled for mobile money collection. Please contact BulkClix support to enable this feature for your account.' 
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction_id: paymentResponse.transaction_id,
      client_reference: paymentResponse.client_reference,
      message: paymentResponse.message,
      data: paymentResponse.data,
    })
  } catch (error: any) {
    console.error('Payment initiation error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to initiate payment' },
      { status: 500 }
    )
  }
}

