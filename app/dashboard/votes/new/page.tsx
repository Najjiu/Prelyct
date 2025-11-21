'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/Card'
import Button from '@/components/Button'
import AlertDialog from '@/components/AlertDialog'
import { useAlert } from '@/lib/useAlert'
import { db, type PricingTier, type AddOn } from '@/lib/supabaseClient'
import { useCurrency } from '@/lib/useCurrency'
import { useUserSettings } from '@/lib/useUserSettings'

const BILLING_MODELS = [
  {
    id: 'upfront',
    label: 'Upfront (best rate)',
    description: 'Pay the projected amount now. Includes a buffer for turnout within the tier.'
  },
  {
    id: 'post_event',
    label: 'Post-event true-up',
    description: 'Pay 40% deposit now. Remaining balance billed automatically after actual turnout is confirmed.'
  }
]

function recommendTier(voters: number, tiers: PricingTier[]): PricingTier | null {
  if (!voters || voters <= 0 || tiers.length === 0) {
    return tiers[0] || null
  }
  const found = tiers.find((tier) => {
    const withinLower = voters >= tier.min_voters
    const withinUpper = tier.max_voters === null || voters <= tier.max_voters
    return withinLower && withinUpper
  })
  return found ?? tiers[tiers.length - 1] ?? null
}

export default function NewElectionPage() {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const { settings } = useUserSettings()
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    mode: 'institutional' as 'institutional' | 'public_contest',
    costPerVote: 0.50,
    maxVotesPerUser: null as number | null,
    expectedVoters: 0,
    tierId: '',
    billingModel: 'upfront' as 'upfront' | 'post_event',
    addOns: [] as string[],
  })
  const [tierLocked, setTierLocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { alert, showAlert, closeAlert } = useAlert()

  useEffect(() => {
    async function loadData() {
      try {
        const [tiers, addOnsData] = await Promise.all([
          db.getPricingTiers(),
          db.getAddOns(),
        ])
        setPricingTiers(tiers)
        setAddOns(addOnsData)
        
        // Apply user's default settings
        if (tiers.length > 0) {
          let defaultTierId = tiers[0].id
          
          // Find tier by user's default tier preference
          if (settings?.default_tier) {
            const tierByLabel = tiers.find(t => t.label.toLowerCase() === settings.default_tier.toLowerCase())
            if (tierByLabel) {
              defaultTierId = tierByLabel.id
            }
          }
          
          setFormData((prev) => ({
            ...prev,
            tierId: defaultTierId,
            billingModel: settings?.default_billing_model || 'upfront',
          }))
        }
      } catch (error) {
        console.error('Failed to load pricing data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [settings])

  const selectedTier = useMemo((): PricingTier | null => {
    if (pricingTiers.length === 0) return null
    return pricingTiers.find((tier) => tier.id === formData.tierId) ?? pricingTiers[0] ?? null
  }, [formData.tierId, pricingTiers])

  const addOnItems = useMemo(() => addOns.filter((addOn) => formData.addOns.includes(addOn.id)), [formData.addOns, addOns])

  const baseCost = useMemo(() => {
    if (!selectedTier) return 0
    const voters = Math.max(formData.expectedVoters, selectedTier.min_voters || 0)
    const projected = voters * (selectedTier.rate_per_voter || 0)
    return Math.max(projected, selectedTier.minimum_charge || 0)
  }, [formData.expectedVoters, selectedTier])

  const addOnCost = useMemo(() => addOnItems.reduce((sum, addOn) => sum + addOn.price, 0), [addOnItems])

  const totals = useMemo(() => {
    const nowDue = formData.billingModel === 'upfront' ? baseCost + addOnCost : baseCost * 0.4 + addOnCost
    const pending = formData.billingModel === 'upfront' ? 0 : Math.max(baseCost * 0.6, 0)
    return {
      nowDue,
      pending,
      currencyNow: formatCurrency(nowDue),
      currencyPending: formatCurrency(pending),
    }
  }, [addOnCost, baseCost, formData.billingModel, formatCurrency])

  const handleExpectedVotersChange = (value: string) => {
    const parsed = Number(value.replace(/[^0-9]/g, ''))
    const safeValue = Number.isFinite(parsed) ? parsed : 0
    setFormData((prev) => {
      const next = { ...prev, expectedVoters: safeValue }
      if (!tierLocked && pricingTiers.length > 0) {
        const recommended = recommendTier(safeValue, pricingTiers)
        if (recommended) {
          next.tierId = recommended.id
        }
      }
      return next
    })
  }

  const toggleAddOn = (id: string) => {
    setFormData((prev) => {
      const exists = prev.addOns.includes(id)
      return {
        ...prev,
        addOns: exists ? prev.addOns.filter((item) => item !== id) : [...prev.addOns, id],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const startDateTime = `${formData.startDate}T${formData.startTime}:00`
      const endDateTime = `${formData.endDate}T${formData.endTime}:00`

      const election = await db.createElection({
        name: formData.name,
        description: formData.description || undefined,
        start_date: startDateTime,
        end_date: endDateTime,
        mode: formData.mode,
        cost_per_vote: formData.mode === 'public_contest' ? formData.costPerVote : undefined,
        max_votes_per_user: formData.mode === 'public_contest' ? (formData.maxVotesPerUser ?? undefined) : undefined,
        expected_voters: formData.expectedVoters,
        tier_id: formData.mode === 'institutional' ? formData.tierId : undefined,
        billing_model: formData.mode === 'institutional' ? formData.billingModel : undefined,
        projected_base_cost: formData.mode === 'institutional' ? baseCost : undefined,
        add_ons_cost: formData.mode === 'institutional' ? addOnCost : undefined,
        due_now: formData.mode === 'institutional' ? totals.nowDue : undefined,
        pending_after_event: formData.mode === 'institutional' ? totals.pending : undefined,
        add_on_ids: formData.mode === 'institutional' && formData.addOns.length > 0 ? formData.addOns : undefined,
      })

      // Payments are disabled for testing – go straight to election detail
      router.push(`/dashboard/votes/${election.id}`)
    } catch (error: any) {
      console.error('Failed to create election:', error)
      showAlert(error.message || 'Failed to create election. Please try again.', {
        title: 'Error',
        type: 'error',
      })
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Election</h1>
        <p className="mt-1 text-sm text-gray-600">Fill in the details to create a new election</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Mode Selection */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Election Mode</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'institutional' })}
                className={`p-4 rounded-xl border-2 transition ${
                  formData.mode === 'institutional'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 hover:border-primary/50'
                }`}
              >
                <p className="text-sm font-semibold">Institutional Election</p>
                <p className="text-xs text-slate-500 mt-1">One-person-one-vote, secure mode</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'public_contest' })}
                className={`p-4 rounded-xl border-2 transition ${
                  formData.mode === 'public_contest'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 hover:border-primary/50'
                }`}
              >
                <p className="text-sm font-semibold">Public Contest</p>
                <p className="text-xs text-slate-500 mt-1">Pay-per-vote, multiple votes allowed</p>
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Election name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Start date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                    Start time
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    End date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                    End time
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Public Contest Settings */}
              {formData.mode === 'public_contest' && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cost per Vote</p>
                    <label className="mt-2 block text-sm font-medium text-slate-700" htmlFor="costPerVote">
                      Amount ({settings?.currency || 'GHS'})
                    </label>
                    <input
                      id="costPerVote"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={formData.costPerVote}
                      onChange={(e) => setFormData({ ...formData, costPerVote: parseFloat(e.target.value) || 0.50 })}
                      className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Each vote will cost this amount. Users can vote multiple times.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Max Votes per User</p>
                    <label className="mt-2 block text-sm font-medium text-slate-700" htmlFor="maxVotesPerUser">
                      Maximum votes (leave empty for unlimited)
                    </label>
                    <input
                      id="maxVotesPerUser"
                      type="number"
                      min={1}
                      value={formData.maxVotesPerUser || ''}
                      onChange={(e) => setFormData({ ...formData, maxVotesPerUser: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Unlimited"
                      className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Limit how many times a user can vote. Leave empty for unlimited votes.
                    </p>
                  </div>
                </>
              )}

              {/* Institutional Election Settings */}
              {formData.mode === 'institutional' && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Voter volume</p>
                    <label className="mt-2 block text-sm font-medium text-slate-700" htmlFor="expectedVoters">
                      Expected voters
                    </label>
                    <input
                      id="expectedVoters"
                      type="number"
                      min={0}
                      value={formData.expectedVoters || ''}
                      onChange={(e) => handleExpectedVotersChange(e.target.value)}
                      placeholder="e.g. 1200"
                      className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      We use this to recommend the best per-voter rate. You can adjust the tier below if needed.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pricing tier</p>
                    <select
                      value={formData.tierId}
                      onChange={(e) => {
                        setFormData({ ...formData, tierId: e.target.value })
                        setTierLocked(true)
                      }}
                      className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                    >
                      {pricingTiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.label} • {tier.description}
                        </option>
                      ))}
                    </select>
                    {selectedTier && (
                      <p className="mt-2 text-xs text-slate-500">
                        {selectedTier.description}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billing preference</p>
                    <div className="mt-3 space-y-3">
                      {BILLING_MODELS.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, billingModel: model.id as 'upfront' | 'post_event' })}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                            formData.billingModel === model.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-200 hover:border-primary/50'
                          }`}
                        >
                          <p className="text-sm font-semibold">{model.label}</p>
                          <p className="text-xs text-slate-500">{model.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Optional add-ons</p>
                    <div className="mt-3 space-y-3">
                      {addOns.map((addOn) => {
                        const checked = formData.addOns.includes(addOn.id)
                        return (
                          <button
                            key={addOn.id}
                            type="button"
                            onClick={() => toggleAddOn(addOn.id)}
                            className={`flex w-full items-start justify-between rounded-xl border px-4 py-3 text-left transition ${
                              checked ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 hover:border-primary/50'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-semibold">{addOn.label}</p>
                              <p className="text-xs text-slate-500">{addOn.description || ''}</p>
                            </div>
                            <span className="text-xs font-semibold text-primary">+ {formatCurrency(addOn.price)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Cost summary</p>
                    <dl className="mt-3 space-y-2 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <dt>Projected platform fee</dt>
                        <dd className="font-semibold text-slate-900">{formatCurrency(baseCost)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>Add-ons</dt>
                        <dd className="font-semibold text-slate-900">{formatCurrency(addOnCost)}</dd>
                      </div>
                      <div className="flex items-center justify-between border-t border-primary/20 pt-2">
                        <dt>Due now</dt>
                        <dd className="text-lg font-bold text-primary">{totals.currencyNow}</dd>
                      </div>
                      {formData.billingModel === 'post_event' && (
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <dt>Estimated balance after event</dt>
                          <dd>{totals.currencyPending}</dd>
                        </div>
                      )}
                    </dl>
                    <p className="mt-3 text-xs text-slate-500">
                      Actual turnout let us auto-adjust final billing. We'll email invoices and keep them available in the dashboard.
                    </p>
                  </div>
                </>
              )}

              {formData.mode === 'public_contest' && (
                <div className="rounded-2xl border border-slate-200 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Public Contest Info</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p className="text-xs text-slate-500">
                      • Public contests use pay-per-vote pricing
                    </p>
                    <p className="text-xs text-slate-500">
                      • No upfront platform fee required
                    </p>
                    <p className="text-xs text-slate-500">
                      • Revenue is generated from each vote transaction
                    </p>
                    <p className="text-xs text-slate-500">
                      • A public voting link will be generated automatically
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create election'}
            </Button>
          </div>
        </form>
      </Card>

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

