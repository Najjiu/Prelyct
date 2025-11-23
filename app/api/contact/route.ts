import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

/**
 * API route to handle contact form submissions
 * Sends emails to info@prelyct.com
 */
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(apiKey)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, interest, message } = body

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: 'Please fill in all required fields (name, email, message).' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured')
      return NextResponse.json(
        { success: false, message: 'Email service is not configured. Please contact the administrator.' },
        { status: 500 }
      )
    }

    // Build email content
    const subject = `New Contact Form Submission - ${interest || 'General Inquiry'}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #374151; margin-bottom: 5px; }
          .value { color: #1f2937; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">New Contact Form Submission</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Prelyct Website</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Name:</div>
              <div class="value">${escapeHtml(name)}</div>
            </div>
            <div class="field">
              <div class="label">Email:</div>
              <div class="value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
            </div>
            ${phone ? `
            <div class="field">
              <div class="label">Phone / WhatsApp:</div>
              <div class="value">${escapeHtml(phone)}</div>
            </div>
            ` : ''}
            ${interest ? `
            <div class="field">
              <div class="label">Service of Interest:</div>
              <div class="value">${escapeHtml(interest)}</div>
            </div>
            ` : ''}
            <div class="field">
              <div class="label">Message:</div>
              <div class="value" style="white-space: pre-wrap;">${escapeHtml(message)}</div>
            </div>
          </div>
          <div class="footer">
            <p>This message was sent from the Prelyct contact form.</p>
            <p>You can reply directly to this email to respond to ${escapeHtml(name)}.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
New Contact Form Submission - Prelyct Website

Name: ${name}
Email: ${email}
${phone ? `Phone / WhatsApp: ${phone}\n` : ''}${interest ? `Service of Interest: ${interest}\n` : ''}
Message:
${message}

---
This message was sent from the Prelyct contact form.
You can reply directly to this email to respond to ${name}.
    `.trim()

    // Send email directly using Resend (no internal HTTP call needed)
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Prelyct <onboarding@resend.dev>',
      to: 'info@prelyct.com',
      subject,
      html,
      text,
      replyTo: email, // Set reply-to to the sender's email
    })

    if (error) {
      console.error('Resend API error:', error)
      throw new Error(error.message || 'Failed to send email')
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you within one business day.',
    })
  } catch (error: any) {
    console.error('Contact form API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'An error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to escape HTML
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

