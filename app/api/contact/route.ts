import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COMPANY_WHATSAPP_NUMBER = '+79966632943'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const name = (body?.name || '').toString().trim()
    const email = (body?.email || '').toString().trim()
    const phone = (body?.phone || '').toString().trim()
    const interest = (body?.interest || '').toString().trim()
    const message = (body?.message || '').toString().trim()

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: 'Name, email and message are required.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Log the contact form submission
    console.log('📩 New contact form submission:', { name, email, phone, interest })

    // Send WhatsApp confirmation if credentials and phone are present
    const whatsappToken = process.env.WHATSAPP_API_TOKEN
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (whatsappToken && whatsappPhoneId && phone) {
      try {
        const whatsappBody = {
          messaging_product: 'whatsapp',
          to: phone.replace(/\s+/g, ''),
          type: 'text',
          text: {
            body:
              `Thank you for contacting Prelyct, ${name}.\n\n` +
              `We've received your message${interest ? ` about "${interest}"` : ''} and will follow up shortly.\n\n` +
              `If you have any supporting documents or links, feel free to reply here.\n\n` +
              `– Prelyct Team (${COMPANY_WHATSAPP_NUMBER})`,
          },
        }

        const whatsappResponse = await fetch(
          `https://graph.facebook.com/v19.0/${whatsappPhoneId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(whatsappBody),
          }
        )

        if (!whatsappResponse.ok) {
          const errorText = await whatsappResponse.text().catch(() => '')
          console.error('❌ WhatsApp API error:', whatsappResponse.status, errorText)
        } else {
          console.log('✅ WhatsApp confirmation sent successfully')
        }
      } catch (err) {
        console.error('❌ Failed to send WhatsApp message:', err)
      }
    } else {
      if (!phone) {
        console.log('ℹ️ No phone provided, skipping WhatsApp send.')
      } else {
        console.log('ℹ️ WhatsApp env vars not configured, skipping WhatsApp send.')
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your message has been sent. We will get back to you shortly.',
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('❌ Error in /api/contact:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Something went wrong while sending your message. Please try again later.',
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
