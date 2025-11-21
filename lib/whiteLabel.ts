/**
 * White-label branding service
 * Allows custom branding for different institutions
 */

import { db } from './supabaseClient'

export interface WhiteLabelSettings {
  organizationName: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  customCss?: string
  customDomain?: string
  emailFromName?: string
  emailFromAddress?: string
  footerText?: string
}

/**
 * Get white-label settings for a user
 */
export async function getWhiteLabelSettings(userId: string): Promise<WhiteLabelSettings | null> {
  try {
    const { data, error } = await db.supabase
      .from('white_label_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return {
      organizationName: data.organization_name,
      logoUrl: data.logo_url || undefined,
      faviconUrl: data.favicon_url || undefined,
      primaryColor: data.primary_color || '#2563eb',
      secondaryColor: data.secondary_color || '#60a5fa',
      accentColor: data.accent_color || '#2563eb',
      customCss: data.custom_css || undefined,
      customDomain: data.custom_domain || undefined,
      emailFromName: data.email_from_name || 'Prelyct Votes',
      emailFromAddress: data.email_from_address || undefined,
      footerText: data.footer_text || undefined,
    }
  } catch (error) {
    console.error('Error getting white-label settings:', error)
    return null
  }
}

/**
 * Get white-label settings by custom domain
 */
export async function getWhiteLabelByDomain(domain: string): Promise<WhiteLabelSettings | null> {
  try {
    const { data, error } = await db.supabase
      .from('white_label_settings')
      .select('*')
      .eq('custom_domain', domain)
      .eq('is_active', true)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return {
      organizationName: data.organization_name,
      logoUrl: data.logo_url || undefined,
      faviconUrl: data.favicon_url || undefined,
      primaryColor: data.primary_color || '#2563eb',
      secondaryColor: data.secondary_color || '#60a5fa',
      accentColor: data.accent_color || '#2563eb',
      customCss: data.custom_css || undefined,
      customDomain: data.custom_domain || undefined,
      emailFromName: data.email_from_name || 'Prelyct Votes',
      emailFromAddress: data.email_from_address || undefined,
      footerText: data.footer_text || undefined,
    }
  } catch (error) {
    console.error('Error getting white-label by domain:', error)
    return null
  }
}

/**
 * Update white-label settings
 */
export async function updateWhiteLabelSettings(
  userId: string,
  settings: WhiteLabelSettings
): Promise<void> {
  try {
    const { error } = await db.supabase
      .from('white_label_settings')
      .upsert({
        user_id: userId,
        organization_name: settings.organizationName,
        logo_url: settings.logoUrl || null,
        favicon_url: settings.faviconUrl || null,
        primary_color: settings.primaryColor || '#2563eb',
        secondary_color: settings.secondaryColor || '#60a5fa',
        accent_color: settings.accentColor || '#2563eb',
        custom_css: settings.customCss || null,
        custom_domain: settings.customDomain || null,
        email_from_name: settings.emailFromName || 'Prelyct Votes',
        email_from_address: settings.emailFromAddress || null,
        footer_text: settings.footerText || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
    
    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error updating white-label settings:', error)
    throw error
  }
}

/**
 * Generate custom CSS from white-label settings
 */
export function generateCustomCSS(settings: WhiteLabelSettings): string {
  let css = `
    :root {
      --primary-color: ${settings.primaryColor || '#2563eb'};
      --secondary-color: ${settings.secondaryColor || '#60a5fa'};
      --accent-color: ${settings.accentColor || '#2563eb'};
    }
    
    .bg-primary {
      background-color: var(--primary-color) !important;
    }
    
    .text-primary {
      color: var(--primary-color) !important;
    }
    
    .border-primary {
      border-color: var(--primary-color) !important;
    }
    
    .bg-accent {
      background-color: var(--accent-color) !important;
    }
    
    .text-accent {
      color: var(--accent-color) !important;
    }
  `
  
  if (settings.customCss) {
    css += '\n' + settings.customCss
  }
  
  return css
}

/**
 * Apply white-label settings to HTML
 */
export function applyWhiteLabelToHTML(html: string, settings: WhiteLabelSettings): string {
  // Replace logo
  if (settings.logoUrl) {
    html = html.replace(/<img[^>]*logo[^>]*>/gi, `<img src="${settings.logoUrl}" alt="${settings.organizationName} Logo">`)
  }
  
  // Replace favicon
  if (settings.faviconUrl) {
    html = html.replace(/<link[^>]*favicon[^>]*>/gi, `<link rel="icon" href="${settings.faviconUrl}">`)
  }
  
  // Add custom CSS
  const customCSS = generateCustomCSS(settings)
  html = html.replace('</head>', `<style>${customCSS}</style></head>`)
  
  // Replace footer text
  if (settings.footerText) {
    html = html.replace(/©\s*<span[^>]*>.*?<\/span>\s*Prelyct/g, `© ${new Date().getFullYear()} ${settings.organizationName}`)
  }
  
  // Replace organization name
  html = html.replace(/Prelyct/g, settings.organizationName)
  
  return html
}


