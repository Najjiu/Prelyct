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
  client_reference: string // Transaction ID - must be 36 characters or less
  reference?: string // Optional short reference (max 20 characters) - unique per voter
  callback_url?: string
}

/**
 * Validate and truncate client_reference to meet BulkClix 36 character limit
 */
function validateClientReference(ref: string): string {
  if (ref.length > 36) {
    console.warn(`⚠️ Client reference exceeds 36 characters (${ref.length}), truncating: ${ref}`)
    return ref.substring(0, 36)
  }
  return ref
}

/**
 * Generate a unique 20-character reference based on voter information
 * Format: {electionId8chars}{phoneLast4digits}{hash8chars} = 20 characters
 */
export function generateVoterReference(electionId: string, phoneNumber: string, transactionId: string): string {
  // Get first 8 characters of election ID (UUID without hyphens)
  const elecPart = electionId.replace(/-/g, '').substring(0, 8).toUpperCase()
  
  // Get last 4 digits of phone number
  const phoneDigits = phoneNumber.replace(/\D/g, '') // Remove non-digits
  const phonePart = phoneDigits.substring(Math.max(0, phoneDigits.length - 4)).padStart(4, '0')
  
  // Create 8-character hash from transaction ID + timestamp
  const hashInput = `${transactionId}-${Date.now()}`
  let hash = 0
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  const hashPart = Math.abs(hash).toString(36).substring(0, 8).toUpperCase().padStart(8, '0')
  
  return `${elecPart}${phonePart}${hashPart}`.substring(0, 20)
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

    // Validate client_reference length (BulkClix requires max 36 characters)
    const clientRef = validateClientReference(request.client_reference)
    
    // Generate or validate reference field (must be max 20 characters)
    let shortReference: string
    if (request.reference && request.reference.length <= 20) {
      shortReference = request.reference
    } else if (request.reference && request.reference.length > 20) {
      // Truncate if too long
      console.warn(`⚠️ Reference exceeds 20 characters (${request.reference.length}), truncating: ${request.reference}`)
      shortReference = request.reference.substring(0, 20)
    } else {
      // Generate from transaction ID if not provided (use last 20 chars of UUID)
      shortReference = clientRef.replace(/-/g, '').substring(0, 20).toUpperCase()
    }

    const payload: any = {
      amount: String(request.amount),
      currency: 'GHS',
      phone_number: formatPhoneForBulkClix(request.account_number),
      network: channel,
      transaction_id: clientRef, // Full UUID (36 chars) for transaction_id
      reference: shortReference, // Short reference (max 20 chars) for reference field
    }

    // Add callback URL if provided
    if (request.callback_url) {
      payload.callback_url = request.callback_url
    }

    // Use the correct endpoint from documentation: /api/v1/payment-api/momopay
    const endpoint = '/api/v1/payment-api/momopay'
    const url = `${BULKCLIX_API_URL}${endpoint}`
    
    console.log('💳 Payment Request Details:', {
      url,
      payload,
      api_key_set: !!BULKCLIX_API_KEY,
    })

    console.log('📤 Sending to BulkClix API:', {
      endpoint,
      amount: payload.amount,
      phone: payload.phone_number,
      network: payload.network,
      transaction_id: payload.transaction_id,
      reference: payload.reference,
      callback_url: payload.callback_url,
    })
    
    // Log full payload for debugging USSD issues
    console.log('🔍 Full BulkClix Payload:', JSON.stringify(payload, null, 2))

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BULKCLIX_API_KEY,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    // Get response text first to see raw response
    const responseText = await response.text()
    console.log('📥 BulkClix API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    })

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('❌ Failed to parse BulkClix response:', responseText)
      throw new Error(`Invalid response from BulkClix API: ${responseText.substring(0, 200)}`)
    }

    if (!response.ok) {
      const errorMessage = data.message || data.error || data.msg || data.errorMessage || `Payment initiation failed: ${response.statusText}`
      console.error('❌ BulkClix Error Response:', {
        status: response.status,
        errorMessage,
        data,
      })
      throw new Error(errorMessage)
    }

    // Handle success response - check for transaction_id in various possible formats
    const transactionId = 
      data.data?.transaction_id || 
      data.transaction_id || 
      data.data?.client_reference || 
      request.client_reference

    if (!transactionId) {
      console.error('❌ No transaction ID in response:', data)
      throw new Error('BulkClix API did not return a transaction ID')
    }

    // Check if USSD prompt was actually triggered
    const ussdStatus = data.status || data.data?.status || data.ussd_status
    const message = data.message || data.msg || data.data?.message || 'Payment initiated successfully'
    
    console.log('✅ BulkClix Payment Initiated Successfully:', {
      transaction_id: transactionId,
      client_reference: request.client_reference,
      phone_number: payload.phone_number,
      network: payload.network,
      ussd_status: ussdStatus,
      message: message,
      full_response: data,
    })
    
    // Warn if USSD prompt might not have been triggered
    if (message.toLowerCase().includes('success') && !ussdStatus) {
      console.warn('⚠️ Payment initiated but USSD status unclear. Please check BulkClix account configuration:')
      console.warn('   - Ensure mobile money collection is enabled')
      console.warn('   - Verify server IP is whitelisted')
      console.warn('   - Check phone number format matches network requirements')
    }

    return {
      success: true,
      transaction_id: transactionId,
      client_reference: data.data?.client_reference || data.client_reference || request.client_reference,
      message: message,
      data: data.data || data,
    }
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
 * Uses the checkstatus endpoint from BulkClix API
 */
export async function checkBulkClixTransactionStatus(
  transactionId: string
): Promise<BulkClixTransactionStatus | null> {
  try {
    if (!BULKCLIX_API_KEY) {
      throw new Error('BulkClix API key is not configured')
    }

    // Use checkstatus endpoint from documentation
    const url = `${BULKCLIX_API_URL}/api/v1/payment-api/checkstatus/${transactionId}`
    
    console.log('🔍 Checking BulkClix transaction status:', transactionId)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': BULKCLIX_API_KEY,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        // Transaction not found yet (normal for first few seconds)
        return {
          transaction_id: transactionId,
          status: 'pending',
          amount: 0,
          currency: 'GHS',
          phone: '',
          network: 'MTN',
          message: 'Transaction not found yet',
        }
      }
      throw new Error(`Status check failed: ${response.statusText}`)
    }

    const responseText = await response.text()
    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse status response:', responseText)
      return null
    }

    console.log('📥 BulkClix Status Response:', data)

    // Parse nested response structure: responseData.data.status
    const statusData = data.data || data
    const status = statusData.status || data.status || 'pending'
    
    // Normalize status
    const normalizedStatus = mapBulkClixStatus(status)

    // Check for failure keywords in message
    const message = data.message || statusData.message || ''
    const failureKeywords = ['insufficient', 'cannot', 'fail', 'declin', 'cancel', 'rejected']
    const hasFailureKeyword = failureKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    )

    const finalStatus = hasFailureKeyword ? 'failed' : normalizedStatus

    return {
      transaction_id: statusData.transaction_id || transactionId,
      status: finalStatus,
      amount: parseFloat(statusData.amount || '0'),
      currency: 'GHS',
      phone: statusData.phone_number || '',
      network: statusData.network || 'MTN',
      reference: statusData.ext_transaction_id || statusData.transaction_id,
      message: message,
    }
  } catch (error: any) {
    console.error('BulkClix status check error:', error)
    return null
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
/**
 * Format phone number for BulkClix API
 * BulkClix requires local format for USSD: 0XXXXXXXXX (must start with 0)
 */
export function formatPhoneForBulkClix(phone: string): string {
  // Remove all spaces and non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Convert international format (+233 or 233) to local format (0)
  if (cleaned.startsWith('+233')) {
    cleaned = '0' + cleaned.substring(4)
  } else if (cleaned.startsWith('233')) {
    cleaned = '0' + cleaned.substring(3)
  }
  
  // Ensure it starts with 0 (local Ghana format)
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned
  }
  
  // Return local format (e.g., 0244123456) - required for USSD prompts
  return cleaned
}
