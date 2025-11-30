import { NextRequest, NextResponse } from 'next/server'
import { initiateBulkClixPayment, formatPhoneForBulkClix, queryMobileMoneyName, generateVoterReference } from '@/lib/bulkclix'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

/**
 * API Route to initiate BulkClix payment
 * This is called from the client to avoid CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, account_number, channel, account_name, client_reference, reference, election_id } = body

    console.log('📥 Payment Initiate Request:', {
      amount,
      account_number,
      channel,
      account_name,
      client_reference,
      api_key_set: !!process.env.NEXT_PUBLIC_BULKCLIX_API_KEY,
    })

    // Validate required fields
    if (!amount || !account_number || !channel || !account_name || !client_reference) {
      console.error('❌ Missing required fields:', { amount, account_number, channel, account_name, client_reference })
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

    // Get callback URL from environment or construct it
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.prelyct.com')
    const callbackUrl = `${siteUrl}/api/payments/bulkclix-webhook`

    // Generate unique voter reference if election_id is provided and reference is not
    let voterReference = reference
    if (!voterReference && election_id && client_reference) {
      voterReference = generateVoterReference(election_id, formattedPhone, client_reference)
    }

    // Initiate payment
    const paymentResponse = await initiateBulkClixPayment({
      amount: String(amount),
      account_number: formattedPhone,
      channel: channel as 'MTN' | 'Airtel' | 'Vodafone',
      account_name: finalAccountName,
      client_reference: client_reference,
      reference: voterReference,
      callback_url: callbackUrl,
    })

    if (!paymentResponse.success) {
      const errorMessage = paymentResponse.message || 'Failed to initiate payment'
      
      console.error('❌ Payment Initiation Failed:', {
        errorMessage,
        paymentResponse,
      })
      
      // Provide helpful message for account configuration issues
      if (errorMessage.toLowerCase().includes('not allowed') || 
          errorMessage.toLowerCase().includes('momo collection') ||
          errorMessage.toLowerCase().includes('contact support') ||
          errorMessage.toLowerCase().includes('ip address') ||
          errorMessage.toLowerCase().includes('not whitelisted') ||
          errorMessage.toLowerCase().includes('access denied')) {
        return NextResponse.json(
          { 
            success: false, 
            message: `BulkClix Error: ${errorMessage}. Please ensure your server IP address is whitelisted in your BulkClix dashboard and mobile money collection is enabled for your account.` 
          },
          { status: 403 }
        )
      }
      
      // Include more details in error for debugging
      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage,
          debug: {
            endpoint: '/api/v1/payment-api/momopay',
            api_url: process.env.NEXT_PUBLIC_BULKCLIX_API_URL || 'https://api.bulkclix.com'
          }
        },
        { status: 400 }
      )
    }

    console.log('✅ Payment Initiated Successfully:', {
      transaction_id: paymentResponse.transaction_id,
      client_reference: paymentResponse.client_reference,
    })

    return NextResponse.json({
      success: true,
      transaction_id: paymentResponse.transaction_id,
      client_reference: paymentResponse.client_reference,
      message: paymentResponse.message || 'Payment initiated. Please check your phone for the prompt.',
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

