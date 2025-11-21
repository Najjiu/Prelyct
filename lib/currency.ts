import { db } from './supabaseClient'

/**
 * Currency symbols mapping
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: '₵',
  USD: '$',
  EUR: '€',
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: 'GHS' | 'USD' | 'EUR' = 'GHS'): string {
  return CURRENCY_SYMBOLS[currency] || '₵'
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currency: 'GHS' | 'USD' | 'EUR' = 'GHS'): string {
  const symbol = getCurrencySymbol(currency)
  return `${symbol}${amount.toFixed(2)}`
}

/**
 * Get user's currency preference and format amount
 * This function fetches the user's currency setting from the database
 */
export async function formatCurrencyWithUserSetting(amount: number): Promise<string> {
  try {
    const settings = await db.getUserSettings()
    const currency = settings?.currency || 'GHS'
    return formatCurrency(amount, currency)
  } catch (error) {
    console.error('Error fetching user currency setting:', error)
    // Fallback to GHS if there's an error
    return formatCurrency(amount, 'GHS')
  }
}

/**
 * Get user's currency preference
 */
export async function getUserCurrency(): Promise<'GHS' | 'USD' | 'EUR'> {
  try {
    const settings = await db.getUserSettings()
    return settings?.currency || 'GHS'
  } catch (error) {
    console.error('Error fetching user currency setting:', error)
    return 'GHS'
  }
}


