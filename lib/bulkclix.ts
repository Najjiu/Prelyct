/**
 * BulkClix Mobile Money Payment Integration
 * API Documentation: https://developers.bulkclix.com
 */

// TODO: Move API key to environment variables for production
// For now, using the provided API key. In production, set NEXT_PUBLIC_BULKCLIX_API_KEY in .env.local
const BULKCLIX_API_KEY = process.env.NEXT_PUBLIC_BULKCLIX_API_KEY || 'wYijXEZBNaYMOBWP3aSiZb7TFsMZDR5HoxQ15uTn'
const BULKCLIX_API_URL = process.env.NEXT_PUBLIC_BULKCLIX_API_URL || 'https://api.bulkclix.com'

export interface BulkClixPaymentRequest {
  amount: number | string
  account_number: string
  channel: 'MTN' | 'Airtel' | 'Vodafone'
  account_name: string
  client_reference: string
}

export interface BulkClixPaymentResponse {
  success: boolean
  transaction_id?: string
  client_reference?: string
  message?: string
  data?: {
    client_reference: string
    transaction_id: string
    amount: string
    channel: string
    account_number: string
  }
}

export interface BulkClixTransactionStatus {
  transaction_id: string
  status: 'pending' | 'successful' | 'failed' | 'cancelled'
  amount: number
  currency: string
  phone: string
  network: string
  reference?: string
  message?: string
}

/**
 * Query mobile money account name from phone number
 */
export async function queryMobileMoneyName(phoneNumber: string): Promise<string | null> {
  try {
    if (!BULKCLIX_API_KEY) {
      throw new Error('BulkClix API key is not configured')
    }

    const formattedPhone = formatPhoneForBulkClix(phoneNumber)
    const response = await fetch(
      `${BULKCLIX_API_URL}/api/v1/kyc-api/msisdNameQuery?phone_number=${formattedPhone}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': BULKCLIX_API_KEY,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data?.data?.name || null
  } catch (error: any) {
    console.error('BulkClix name query error:', error)
    return null
  }
}

/**
 * Initialize a mobile money payment via BulkClix
 */
export async function initiateBulkClixPayment(
  request: BulkClixPaymentRequest
): Promise<BulkClixPaymentResponse> {
  try {
    if (!BULKCLIX_API_KEY) {
      throw new Error('BulkClix API key is not configured')
    }

    // Map channel names to API format
    const channelMap: Record<string, string> = {
      'MTN': 'MTN',
      'VODAFONE': 'Vodafone',
      'AIRTELTIGO': 'Airtel',
    }

    const channel = channelMap[request.channel] || request.channel

    const payload = {
      amount: String(request.amount),
      account_number: formatPhoneForBulkClix(request.account_number),
      channel: channel,
      account_name: request.account_name,
      client_reference: request.client_reference,
    }

    const response = await fetch(`${BULKCLIX_API_URL}/api/v1/payment-api/send/mobilemoney`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BULKCLIX_API_KEY,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `Payment initiation failed: ${response.statusText}`)
    }

    // Check if response indicates success
    if (data.message && data.message.toLowerCase().includes('success')) {
      return {
        success: true,
        transaction_id: data.data?.transaction_id,
        client_reference: data.data?.client_reference || request.client_reference,
        message: data.message || 'Payment initiated successfully',
        data: data.data,
      }
    }

    throw new Error(data.message || 'Payment initiation failed')
  } catch (error: any) {
    console.error('BulkClix payment initiation error:', error)
    return {
      success: false,
      message: error.message || 'Failed to initiate payment',
    }
  }
}

/**
 * Check the status of a BulkClix transaction
 * NOTE: The BulkClix API documentation doesn't provide a transaction status endpoint.
 * Status updates are received via webhooks. This function is a placeholder.
 * In production, implement webhook handling at /api/payments/bulkclix-webhook
 */
export async function checkBulkClixTransactionStatus(
  transactionId: string
): Promise<BulkClixTransactionStatus | null> {
  // Since there's no status endpoint in the API docs, we can't check status directly.
  // Status will be updated via webhooks. This function returns pending status.
  // The actual status will be updated when the webhook is received.
  
  console.warn('BulkClix: No status endpoint available. Status updates must come via webhooks.')
  
  return {
    transaction_id: transactionId,
    status: 'pending',
    amount: 0,
    currency: 'GHS',
    phone: '',
    network: 'MTN',
    message: 'Status check not available. Waiting for webhook confirmation.',
  }
}

/**
 * Verify a payment transaction
 * Note: The API documentation doesn't show a verify endpoint.
 * You may need to use webhooks or contact BulkClix support for verification.
 */
export async function verifyBulkClixPayment(
  reference: string
): Promise<BulkClixTransactionStatus | null> {
  try {
    // Note: The BulkClix API documentation doesn't provide a verify endpoint.
    // Verification is typically done via webhooks.
    // This is a placeholder - you may need to implement webhook handling.
    
    console.warn('BulkClix payment verification: No verify endpoint available in documentation. Using webhook-based verification.')
    
    return {
      transaction_id: reference,
      status: 'pending',
      amount: 0,
      currency: 'GHS',
      phone: '',
      network: 'MTN',
      reference: reference,
      message: 'Verification not available. Please use webhooks for payment verification.',
    }
  } catch (error: any) {
    console.error('BulkClix payment verification error:', error)
    return null
  }
}

/**
 * Detect mobile network from phone number
 */
function detectNetwork(phone: string): 'MTN' | 'VODAFONE' | 'AIRTELTIGO' {
  // Remove spaces and format
  const cleanPhone = formatPhoneForBulkClix(phone)
  
  // MTN: 024, 054, 055, 059
  if (/^0(24|54|55|59)/.test(cleanPhone)) {
    return 'MTN'
  }
  
  // Vodafone: 020, 050
  if (/^0(20|50)/.test(cleanPhone)) {
    return 'VODAFONE'
  }
  
  // AirtelTigo: 027, 057, 026, 056
  if (/^0(27|57|26|56)/.test(cleanPhone)) {
    return 'AIRTELTIGO'
  }
  
  // Default to MTN
  return 'MTN'
}

/**
 * Map BulkClix status to our status format
 */
function mapBulkClixStatus(status: string): 'pending' | 'successful' | 'failed' | 'cancelled' {
  const statusLower = status.toLowerCase()
  
  if (statusLower === 'success' || statusLower === 'successful' || statusLower === 'completed') {
    return 'successful'
  }
  
  if (statusLower === 'failed' || statusLower === 'error') {
    return 'failed'
  }
  
  if (statusLower === 'cancelled' || statusLower === 'canceled') {
    return 'cancelled'
  }
  
  return 'pending'
}

/**
 * Format phone number for BulkClix (remove spaces, ensure proper format)
 */
export function formatPhoneForBulkClix(phone: string): string {
  // Remove all spaces and non-digit characters except +
  let formatted = phone.replace(/[^\d+]/g, '')
  
  // Convert +233 to 0
  if (formatted.startsWith('+233')) {
    formatted = '0' + formatted.substring(4)
  }
  
  // Ensure it starts with 0
  if (!formatted.startsWith('0')) {
    formatted = '0' + formatted
  }
  
  return formatted
}
