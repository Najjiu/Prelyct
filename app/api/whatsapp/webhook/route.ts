import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, parseWebhookPayload } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  // WhatsApp webhook verification
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    return NextResponse.json(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get('x-hub-signature-256') || ''

    // Verify webhook signature
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''
    const payload = JSON.stringify(body)

    // Note: WhatsApp uses HMAC SHA256 with the app secret, not verify token
    // For now, we'll skip signature verification in development
    if (process.env.NODE_ENV === 'production' && verifyToken) {
      const isValid = verifyWebhookSignature(payload, signature, verifyToken)
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    // Parse webhook payload
    const parsed = parseWebhookPayload(body)

    if (parsed.type === 'status') {
      // Update message status in database
      if (parsed.messageId) {
        await supabase
          .from('whatsapp_messages')
          .update({
            status: parsed.status === 'sent' ? 'sent' : 
                    parsed.status === 'delivered' ? 'delivered' :
                    parsed.status === 'read' ? 'read' : 'failed',
            sent_at: parsed.status === 'sent' ? new Date().toISOString() : undefined,
            delivered_at: parsed.status === 'delivered' ? new Date().toISOString() : undefined,
            read_at: parsed.status === 'read' ? new Date().toISOString() : undefined,
          })
          .eq('whatsapp_message_id', parsed.messageId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}


