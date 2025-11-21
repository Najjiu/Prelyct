import { useState, useEffect } from 'react'
import { db } from './supabaseClient'

export type UserSettings = {
  email_notifications: boolean
  election_reminders: boolean
  payment_alerts: boolean
  vote_updates: boolean
  default_billing_model: 'upfront' | 'post_event'
  default_tier: 'starter' | 'growth' | 'campus' | 'enterprise'
  currency: 'GHS' | 'USD' | 'EUR'
  timezone: string
}

/**
 * Hook to get and use all user settings
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.getUserSettings().then(userSettings => {
      if (userSettings) {
        setSettings(userSettings)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return { settings, loading }
}

