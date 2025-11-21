/**
 * WhatsApp Business API integration
 * Send voting links, reminders, and results via WhatsApp
 */

export interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  businessAccountId?: string
  apiVersion?: string
}

export interface WhatsAppMessage {
  to: string // Phone number in E.164 format (e.g., +233241234567)
  type: 'text' | 'template' | 'interactive'
  content?: string
  templateId?: string
  templateParams?: string[]
  interactiveData?: any
}

export interface WhatsAppResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send WhatsApp message via Business API
 */
export async function sendWhatsAppMessage(
  message: WhatsAppMessage,
  config: WhatsAppConfig
): Promise<WhatsAppResponse> {
  try {
    const apiVersion = config.apiVersion || 'v18.0'
    const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`
    
    let payload: any = {
      messaging_product: 'whatsapp',
      to: message.to,
    }
    
    if (message.type === 'text' && message.content) {
      payload.type = 'text'
      payload.text = { body: message.content }
    } else if (message.type === 'template' && message.templateId) {
      payload.type = 'template'
      payload.template = {
        name: message.templateId,
        language: { code: 'en' },
      }
      
      if (message.templateParams && message.templateParams.length > 0) {
        payload.template.components = [
          {
            type: 'body',
            parameters: message.templateParams.map(param => ({
              type: 'text',
              text: param,
            })),
          },
        ]
      }
    } else if (message.type === 'interactive' && message.interactiveData) {
      payload.type = 'interactive'
      payload.interactive = message.interactiveData
    } else {
      throw new Error('Invalid message type or missing content')
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send WhatsApp message')
    }
    
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    }
  } catch (error: any) {
    console.error('WhatsApp API error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
    }
  }
}

/**
 * Send voting link via WhatsApp
 */
export async function sendVotingLink(
  phoneNumber: string,
  electionName: string,
  votingLink: string,
  config: WhatsAppConfig
): Promise<WhatsAppResponse> {
  const message: WhatsAppMessage = {
    to: formatPhoneNumber(phoneNumber),
    type: 'text',
    content: `🗳️ *${electionName}*\n\nYou can now vote! Click the link below:\n\n${votingLink}\n\nThis link is unique to you. Please do not share it.`,
  }
  
  return sendWhatsAppMessage(message, config)
}

/**
 * Send election reminder via WhatsApp
 */
export async function sendElectionReminder(
  phoneNumber: string,
  electionName: string,
  votingLink: string,
  hoursRemaining: number,
  config: WhatsAppConfig
): Promise<WhatsAppResponse> {
  const message: WhatsAppMessage = {
    to: formatPhoneNumber(phoneNumber),
    type: 'text',
    content: `⏰ *Reminder: ${electionName}*\n\nOnly ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} remaining to vote!\n\nVote now: ${votingLink}`,
  }
  
  return sendWhatsAppMessage(message, config)
}

/**
 * Send election results via WhatsApp
 */
export async function sendElectionResults(
  phoneNumber: string,
  electionName: string,
  resultsUrl: string,
  config: WhatsAppConfig
): Promise<WhatsAppResponse> {
  const message: WhatsAppMessage = {
    to: formatPhoneNumber(phoneNumber),
    type: 'text',
    content: `📊 *${electionName} - Results*\n\nThe election has ended. View results:\n\n${resultsUrl}`,
  }
  
  return sendWhatsAppMessage(message, config)
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // If starts with 0, replace with country code (Ghana: 233)
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1)
  }
  
  // If doesn't start with country code, assume Ghana (233)
  if (!cleaned.startsWith('233')) {
    cleaned = '233' + cleaned
  }
  
  // Add + prefix
  return '+' + cleaned
}

/**
 * Verify WhatsApp webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Parse WhatsApp webhook payload
 */
export function parseWebhookPayload(payload: any): {
  type: 'message' | 'status' | 'other'
  messageId?: string
  from?: string
  status?: string
  timestamp?: string
  data?: any
} {
  const entry = payload.entry?.[0]
  const changes = entry?.changes?.[0]
  const value = changes?.value
  
  if (value?.messages) {
    const message = value.messages[0]
    return {
      type: 'message',
      messageId: message.id,
      from: message.from,
      timestamp: message.timestamp,
      data: message,
    }
  }
  
  if (value?.statuses) {
    const status = value.statuses[0]
    return {
      type: 'status',
      messageId: status.id,
      status: status.status,
      timestamp: status.timestamp,
      data: status,
    }
  }
  
  return {
    type: 'other',
    data: payload,
  }
}


