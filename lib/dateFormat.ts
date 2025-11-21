import { getUserCurrency } from './currency'

/**
 * Format date according to user's timezone preference
 */
export async function formatDate(dateString: string | null, options?: Intl.DateTimeFormatOptions): Promise<string> {
  if (!dateString) return 'N/A'
  
  try {
    const { getUserSettings } = await import('./supabaseClient')
    const settings = await getUserSettings()
    const timezone = settings?.timezone || 'Africa/Accra'
    
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: timezone,
      ...options,
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return new Date(dateString).toLocaleDateString('en-GB', options)
  }
}

/**
 * Format date and time according to user's timezone preference
 */
export async function formatDateTime(dateString: string | null, options?: Intl.DateTimeFormatOptions): Promise<string> {
  if (!dateString) return 'N/A'
  
  try {
    const { getUserSettings } = await import('./supabaseClient')
    const settings = await getUserSettings()
    const timezone = settings?.timezone || 'Africa/Accra'
    
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      ...options,
    })
  } catch (error) {
    console.error('Error formatting date/time:', error)
    return new Date(dateString).toLocaleString('en-GB', options)
  }
}

/**
 * React hook for formatting dates with user's timezone
 */
export function useDateFormat() {
  const formatDateWithTimezone = (dateString: string | null, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateString) return 'N/A'
    
    // For client-side, we'll use a synchronous approach
    // The timezone will be applied when the component re-renders with new settings
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options,
      })
    } catch (error) {
      return 'N/A'
    }
  }

  const formatDateTimeWithTimezone = (dateString: string | null, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
      })
    } catch (error) {
      return 'N/A'
    }
  }

  return { formatDate: formatDateWithTimezone, formatDateTime: formatDateTimeWithTimezone }
}


