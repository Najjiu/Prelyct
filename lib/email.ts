/**
 * Email notification service
 * Handles sending emails based on user notification preferences
 */

import { db } from './supabaseClient'
import { supabase } from './supabaseClient'

export type NotificationType = 'election_reminder' | 'payment_alert' | 'vote_update' | 'system'

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

/**
 * Get user's email address
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    // Try to get from current session first
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id === userId && user.email) {
      return user.email
    }
    
    // Fallback: Use API route to get user email (since admin API requires service role)
    const response = await fetch(`/api/users/${userId}/email`)
    if (response.ok) {
      const data = await response.json()
      return data.email || null
    }
    
    return null
  } catch (error) {
    console.error('Error fetching user email:', error)
    return null
  }
}

/**
 * Check if user wants to receive a specific notification type
 */
async function shouldSendNotification(userId: string, notificationType: NotificationType): Promise<boolean> {
  try {
    // Get settings for the specific user (not current user)
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    // If no settings exist, use defaults (send all notifications)
    if (error || !settings) {
      return true
    }
    
    // Master toggle check
    if (!settings.email_notifications) {
      return false
    }

    // Type-specific checks
    switch (notificationType) {
      case 'election_reminder':
        return settings.election_reminders
      case 'payment_alert':
        return settings.payment_alerts
      case 'vote_update':
        return settings.vote_updates
      case 'system':
        return true // System notifications always sent if email enabled
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking notification preferences:', error)
    return true // Default to sending if check fails
  }
}

/**
 * Create email templates
 */
function getEmailTemplate(
  type: NotificationType,
  data: Record<string, any>
): EmailTemplate {
  switch (type) {
    case 'election_reminder':
      return {
        subject: `Reminder: ${data.electionName} ${data.reminderType}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Election Reminder</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>This is a reminder that your election <strong>${data.electionName}</strong> will ${data.reminderType === 'starting' ? 'start' : 'end'} on ${data.date}.</p>
                ${data.description ? `<p>${data.description}</p>` : ''}
                <a href="${data.electionUrl}" class="button">View Election</a>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  You're receiving this because you have election reminders enabled in your settings.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Election Reminder\n\nYour election "${data.electionName}" will ${data.reminderType === 'starting' ? 'start' : 'end'} on ${data.date}.\n\nView Election: ${data.electionUrl}`,
      }

    case 'payment_alert':
      return {
        subject: `Payment Alert: ${data.invoiceNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .amount { font-size: 24px; font-weight: bold; color: #4F46E5; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Payment Alert</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>${data.message}</p>
                <p><strong>Invoice:</strong> ${data.invoiceNumber}</p>
                <p><strong>Amount:</strong> <span class="amount">${data.amount}</span></p>
                ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
                <a href="${data.invoiceUrl}" class="button">View Invoice</a>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  You're receiving this because you have payment alerts enabled in your settings.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Payment Alert\n\n${data.message}\n\nInvoice: ${data.invoiceNumber}\nAmount: ${data.amount}\n${data.dueDate ? `Due Date: ${data.dueDate}\n` : ''}\nView Invoice: ${data.invoiceUrl}`,
      }

    case 'vote_update':
      return {
        subject: `Vote Update: ${data.electionName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Vote Update</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>${data.message}</p>
                <p><strong>Election:</strong> ${data.electionName}</p>
                ${data.voteCount ? `<p><strong>Total Votes:</strong> ${data.voteCount}</p>` : ''}
                <a href="${data.electionUrl}" class="button">View Results</a>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  You're receiving this because you have vote updates enabled in your settings.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Vote Update\n\n${data.message}\n\nElection: ${data.electionName}\n${data.voteCount ? `Total Votes: ${data.voteCount}\n` : ''}\nView Results: ${data.electionUrl}`,
      }

    default:
      return {
        subject: data.subject || 'Notification from Prelyct',
        html: `<p>${data.message || 'You have a new notification.'}</p>`,
        text: data.message || 'You have a new notification.',
      }
  }
}

/**
 * Send email notification
 * Uses Next.js API route to send emails (to avoid exposing email service credentials)
 */
async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<boolean> {
  try {
    // Call our API route to send email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    const response = await fetch(`${baseUrl}/api/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to send email' }))
      console.error('Email API error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending email:', error)
    // Fallback: log email for development
    if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
      console.log('📧 Email would be sent:', {
        to,
        subject: template.subject,
        html: template.html.substring(0, 100) + '...',
      })
      return true // Simulate success in development
    }
    return false
  }
}

/**
 * Create and send a notification
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  data: {
    electionId?: string
    invoiceId?: string
    title: string
    message: string
    [key: string]: any
  }
): Promise<void> {
  try {
    // ALWAYS create in-app notification regardless of email preferences
    // Email is optional, but in-app notifications should always be shown
    
    // Check if user wants to receive EMAIL notifications
    const shouldSendEmail = await shouldSendNotification(userId, type)
    
    // Get user email
    const userEmail = await getUserEmail(userId)

    // Send email only if user has email notifications enabled
    let emailSent = false
    if (shouldSendEmail && userEmail) {
      try {
        const template = getEmailTemplate(type, data)
        emailSent = await sendEmail(userEmail, template)
      } catch (error) {
        console.error('Failed to send email notification:', error)
        // Continue to create in-app notification even if email fails
      }
    }

    // ALWAYS create notification record in database (in-app notification)
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        election_id: data.electionId,
        invoice_id: data.invoiceId,
        type,
        title: data.title,
        message: data.message,
        email_sent: emailSent,
        email_sent_at: emailSent ? new Date().toISOString() : null,
        metadata: {
          ...data,
          // Ensure electionUrl is in metadata for navigation
          electionUrl: data.electionUrl || (data.electionId ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/votes/${data.electionId}` : undefined),
        },
      })

    if (error) {
      console.error('Error creating notification record:', error)
    } else {
      console.log(`✅ In-app notification created for user ${userId}: ${type} - ${data.title}`)
    }
  } catch (error) {
    console.error('Error sending notification:', error)
    // Even if there's an error, try to create the notification record
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          election_id: data.electionId,
          invoice_id: data.invoiceId,
          type,
          title: data.title,
          message: data.message,
          email_sent: false,
          metadata: data,
        })
    } catch (fallbackError) {
      console.error('Failed to create notification record as fallback:', fallbackError)
    }
  }
}

/**
 * Send election reminder
 */
export async function sendElectionReminder(
  userId: string,
  electionId: string,
  reminderType: 'starting' | 'ending',
  electionName: string,
  date: string,
  description?: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  await sendNotification(userId, 'election_reminder', {
    electionId,
    title: `Election ${reminderType === 'starting' ? 'Starting' : 'Ending'} Soon`,
    message: `Your election "${electionName}" will ${reminderType === 'starting' ? 'start' : 'end'} on ${date}.`,
    reminderType,
    electionName,
    date,
    description,
    electionUrl: `${baseUrl}/dashboard/votes/${electionId}`,
  })
}

/**
 * Send payment alert
 */
export async function sendPaymentAlert(
  userId: string,
  invoiceId: string,
  invoiceNumber: string,
  amount: string,
  message: string,
  dueDate?: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  await sendNotification(userId, 'payment_alert', {
    invoiceId,
    title: 'Payment Alert',
    message,
    invoiceNumber,
    amount,
    dueDate,
    invoiceUrl: `${baseUrl}/dashboard/invoices/${invoiceId}`,
  })
}

/**
 * Send vote update notification when a vote is cast
 */
export async function sendVoteUpdate(
  userId: string,
  electionId: string,
  electionName: string,
  message: string,
  voteCount?: number
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Create a more descriptive title and message
  const title = voteCount && voteCount > 1 
    ? `🎉 ${voteCount} New Votes Cast`
    : '🗳️ New Vote Cast'
  
  const enhancedMessage = voteCount && voteCount > 1
    ? `${voteCount} new votes have been cast in "${electionName}". Total votes: ${voteCount}.`
    : `A new vote has been cast in "${electionName}". Total votes: ${voteCount || 'updated'}.`
  
  await sendNotification(userId, 'vote_update', {
    electionId,
    title,
    message: enhancedMessage,
    electionName,
    voteCount,
    electionUrl: `${baseUrl}/dashboard/votes/${electionId}`,
  })
}

