'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import Button from '@/components/Button'
import AlertDialog from '@/components/AlertDialog'
import { useAlert } from '@/lib/useAlert'
import { supabase, db } from '@/lib/supabaseClient'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    electionReminders: true,
    paymentAlerts: true,
    voteUpdates: false,
  })
  const [preferences, setPreferences] = useState({
    defaultBillingModel: 'upfront',
    defaultTier: 'starter',
    currency: 'GHS',
    timezone: 'Africa/Accra',
  })
  const { alert, showAlert, closeAlert } = useAlert()

  useEffect(() => {
    loadUserSettings()
  }, [])

  async function loadUserSettings() {
    try {
      setLoading(true)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (currentUser) {
        setUser(currentUser)
        setEmail(currentUser.email || '')
        
        // Load user settings from database
        const userSettings = await db.getUserSettings()
        
        if (userSettings) {
          setNotifications({
            emailNotifications: userSettings.email_notifications,
            electionReminders: userSettings.election_reminders,
            paymentAlerts: userSettings.payment_alerts,
            voteUpdates: userSettings.vote_updates,
          })
          
          setPreferences({
            defaultBillingModel: userSettings.default_billing_model,
            defaultTier: userSettings.default_tier,
            currency: userSettings.currency,
            timezone: userSettings.timezone,
          })
        }
      }
    } catch (error) {
      console.error('Failed to load user settings:', error)
      showAlert('Failed to load settings. Please refresh the page.', {
        title: 'Error',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSettings() {
    try {
      setSaving(true)
      
      // Update user settings in database
      await db.updateUserSettings({
        email_notifications: notifications.emailNotifications,
        election_reminders: notifications.electionReminders,
        payment_alerts: notifications.paymentAlerts,
        vote_updates: notifications.voteUpdates,
        default_billing_model: preferences.defaultBillingModel as 'upfront' | 'post_event',
        default_tier: preferences.defaultTier as 'starter' | 'growth' | 'campus' | 'enterprise',
        currency: preferences.currency as 'GHS' | 'USD' | 'EUR',
        timezone: preferences.timezone,
      })

      showAlert('Settings saved successfully!', {
        title: 'Success',
        type: 'success',
      })
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      showAlert(error.message || 'Failed to save settings', {
        title: 'Error',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-600">Loading settings...</p>
        </div>
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Account Information */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Contact support to change your email address
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={user?.id || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed font-mono text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email Notifications
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Receive email notifications for important updates
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.emailNotifications}
                onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Election Reminders
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Get reminders before elections start or end
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.electionReminders}
                onChange={(e) => setNotifications({ ...notifications, electionReminders: e.target.checked })}
                disabled={!notifications.emailNotifications}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                !notifications.emailNotifications 
                  ? 'bg-gray-200 opacity-50 cursor-not-allowed' 
                  : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 peer-checked:bg-primary'
              }`}></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Payment Alerts
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Receive notifications about invoice payments and due dates
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.paymentAlerts}
                onChange={(e) => setNotifications({ ...notifications, paymentAlerts: e.target.checked })}
                disabled={!notifications.emailNotifications}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                !notifications.emailNotifications 
                  ? 'bg-gray-200 opacity-50 cursor-not-allowed' 
                  : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 peer-checked:bg-primary'
              }`}></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Vote Updates
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Get updates when votes are cast in your elections
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.voteUpdates}
                onChange={(e) => setNotifications({ ...notifications, voteUpdates: e.target.checked })}
                disabled={!notifications.emailNotifications}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                !notifications.emailNotifications 
                  ? 'bg-gray-200 opacity-50 cursor-not-allowed' 
                  : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 peer-checked:bg-primary'
              }`}></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Election Preferences */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Election Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Billing Model
            </label>
            <select
              value={preferences.defaultBillingModel}
              onChange={(e) => setPreferences({ ...preferences, defaultBillingModel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary appearance-none bg-white"
            >
              <option value="upfront">Upfront Payment</option>
              <option value="post_event">Post-Event Payment</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Default billing model for new elections
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Pricing Tier
            </label>
            <select
              value={preferences.defaultTier}
              onChange={(e) => setPreferences({ ...preferences, defaultTier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary appearance-none bg-white"
            >
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="campus">Campus</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Default pricing tier for new elections
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={preferences.currency}
              onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary appearance-none bg-white"
            >
              <option value="GHS">GHS - Ghanaian Cedi</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary appearance-none bg-white"
            >
              <option value="Africa/Accra">Africa/Accra (GMT)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payment Integration */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Integration</h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">BulkClix Mobile Money Integration</h3>
                <p className="text-sm text-blue-700 mb-2">
                  We're preparing to integrate with BulkClix for mobile money payments. This will enable seamless payment collection via MTN, Vodafone, and AirtelTigo mobile money.
                </p>
                <a
                  href="https://developers.bulkclix.com/#4b62becd-a58d-49cb-9a46-dbf061716a06"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View BulkClix API Documentation →
                </a>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving} size="lg">
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>

      {/* Alert Dialog */}
      <AlertDialog
        open={alert.open}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        confirmText={alert.confirmText}
        onClose={closeAlert}
        onConfirm={alert.onConfirm}
      />
    </div>
  )
}
