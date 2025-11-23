import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

/**
 * API route to send emails using Resend
 * Make sure to set RESEND_API_KEY in your environment variables
 */
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, html, text, replyTo } = body

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (to, subject, html)' },
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

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Prelyct <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback to plain text if not provided
      replyTo: replyTo || undefined,
    })

    if (error) {
      console.error('Resend API error:', error)
      throw new Error(error.message || 'Failed to send email')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      id: data?.id
    })
  } catch (error: any) {
    console.error('Error in email API:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}


