'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { db } from '@/lib/supabaseClient'
import { formatPhoneForBulkClix, generateVoterReference } from '@/lib/bulkclix'
import { useCurrency } from '@/lib/useCurrency'

const MOBILE_NETWORKS = ['MTN', 'VODAFONE', 'AIRTELTIGO'] as const

export default function PublicVotePage() {
  // Allow payments by default; can be disabled via NEXT_PUBLIC_BULKCLIX_DISABLED
  const BULKCLIX_DISABLED = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BULKCLIX_DISABLED === 'true' && process.env?.NEXT_PUBLIC_BULKCLIX_DISABLED === 'true'
  const params = useParams()
  const electionId = params.electionId as string
  const [election, setElection] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [voteCount, setVoteCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [mobileMoneyNetwork, setMobileMoneyNetwork] = useState<'MTN' | 'VODAFONE' | 'AIRTELTIGO'>('MTN')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'initiating' | 'pending' | 'completed' | 'failed'>('idle')
  const [paymentMessage, setPaymentMessage] = useState('')
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})

  const loadElection = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      let contestData: any = await db.getPublicElection(electionId)
      if (!contestData) {
        contestData = await db.getPublicContest(electionId)
      }
      if (!contestData) {
        setError('Election not found or not available for public voting')
        setLoading(false)
        return
      }
      setElection(contestData.election)
      setPositions(contestData.positions)
      setCandidates(contestData.candidates)
      if (contestData.voteCounts) {
        setVoteCounts(contestData.voteCounts)
      } else {
        // Initialize empty voteCounts if not provided
        setVoteCounts({})
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load election')
    } finally {
      setLoading(false)
    }
  }, [electionId])

  useEffect(() => {
    loadElection()
  }, [loadElection])

  const loadVoteCounts = useCallback(async () => {
    if (!election) return
    try {
      const results = await db.getPublicElectionResults(election.id)
      setVoteCounts(results)
    } catch (error) {
      console.error('Failed to load vote counts:', error)
    }
  }, [election])

  useEffect(() => {
    if (!election) return
    loadVoteCounts()
    const interval = setInterval(loadVoteCounts, 10000) // Poll every 10 seconds
    return () => clearInterval(interval)
  }, [election, loadVoteCounts])

  const selectedCandidateDetails = useMemo(() => {
    if (!selectedCandidate) return null
    return candidates.find(c => c.id === selectedCandidate)
  }, [selectedCandidate, candidates])

  const totalCost = useMemo(() => {
    if (!election) return 0
    return election.cost_per_vote * voteCount
  }, [election, voteCount])

  const candidatesByPosition = useMemo(() => {
    return positions.map((position: any) => ({
      position,
      candidates: candidates.filter((c: any) => c.position_id === position.id),
    }))
  }, [positions, candidates])

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {}
    if (!selectedCandidate) errors.candidate = 'Please select a candidate'
    if (!userPhone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!/^(\+233|0)[0-9]{9}$/.test(userPhone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid Ghana phone number'
    }
    if (!mobileMoneyNetwork) errors.network = 'Please select your mobile money network'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [selectedCandidate, userPhone, mobileMoneyNetwork])

  const handleVote = useCallback(async () => {
    if (!validateForm() || !election) return

    setProcessing(true)
    setError('')
    setPaymentStatus('initiating')
    setPaymentMessage('Initiating payment...')

    try {
      if (BULKCLIX_DISABLED) {
        // Create a dummy transaction and record vote immediately
        const transaction = await db.createPaymentTransaction({
          election_id: election.id,
          amount: (election.cost_per_vote || 0) * voteCount,
          currency: 'GHS',
          payment_provider: 'disabled',
        })
        await db.updatePaymentTransaction(transaction.id, { status: 'completed' })
        await db.submitPublicVote(
          election.id,
          selectedCandidate!,
          voteCount,
          userPhone.trim(),
          null,
          transaction.id
        )
        setPaymentStatus('completed')
        setProcessing(false)
        setSubmitted(true)
        await loadVoteCounts()
        return
      }

      const totalCost = election.cost_per_vote * voteCount
      const transaction = await db.createPaymentTransaction({
        election_id: election.id,
        amount: totalCost,
        currency: 'GHS',
        payment_provider: 'bulkclix',
      })

      const formattedPhone = formatPhoneForBulkClix(userPhone.trim())
      
      const channelMap: Record<string, 'MTN' | 'Airtel' | 'Vodafone'> = {
        'MTN': 'MTN',
        'VODAFONE': 'Vodafone',
        'AIRTELTIGO': 'Airtel',
      }

      setPaymentStatus('initiating')
      setPaymentMessage('Sending payment request...')
      
      // Generate unique voter reference (max 20 characters) based on election, phone, and transaction
      const voterRef = generateVoterReference(election.id, formattedPhone, transaction.id)
      
      // Call our API route instead of directly calling BulkClix (avoids CORS issues)
      const paymentResponse = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalCost.toFixed(2),
          account_number: formattedPhone,
          channel: channelMap[mobileMoneyNetwork] || 'MTN',
          account_name: 'Voter',
          client_reference: transaction.id, // UUID is exactly 36 characters - matches BulkClix requirement
          reference: voterRef, // Unique 20-character reference based on voter
          election_id: election.id, // Pass election ID for reference generation
        }),
      })

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text()
        let errorData: any = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText || 'Failed to initiate payment' }
        }
        
        const errorMessage = errorData.message || errorData.error || errorData.msg || 'Failed to initiate payment'
        
        console.error('❌ Payment API Error:', {
          status: paymentResponse.status,
          statusText: paymentResponse.statusText,
          errorData,
          errorMessage,
        })
        
        // Provide helpful message for common issues
        if (errorMessage.toLowerCase().includes('not allowed') || 
            errorMessage.toLowerCase().includes('momo collection') ||
            errorMessage.toLowerCase().includes('ip address') ||
            errorMessage.toLowerCase().includes('not whitelisted') ||
            errorMessage.toLowerCase().includes('access denied')) {
          throw new Error(`BulkClix Error: ${errorMessage}. Please ensure your server IP is whitelisted and mobile money collection is enabled in your BulkClix dashboard.`)
        }
        
        throw new Error(`Payment Error: ${errorMessage}`)
      }

      const responseText = await paymentResponse.text()
      let paymentData: any = {}
      try {
        paymentData = JSON.parse(responseText)
      } catch {
        throw new Error(`Invalid response from payment API: ${responseText.substring(0, 200)}`)
      }

      console.log('📥 Payment Response:', paymentData)

      if (!paymentData.success || !paymentData.transaction_id) {
        const errorMessage = paymentData.message || paymentData.error || 'Failed to initiate payment'
        
        console.error('❌ Payment Failed:', {
          paymentData,
          errorMessage,
        })
        
        // Provide helpful message for common issues
        if (errorMessage.toLowerCase().includes('not allowed') || 
            errorMessage.toLowerCase().includes('momo collection') ||
            errorMessage.toLowerCase().includes('ip address') ||
            errorMessage.toLowerCase().includes('not whitelisted') ||
            errorMessage.toLowerCase().includes('access denied')) {
          throw new Error(`BulkClix Error: ${errorMessage}. Please check your BulkClix dashboard settings.`)
        }
        
        throw new Error(errorMessage)
      }

      await db.updatePaymentTransaction(transaction.id, {
        provider_transaction_id: paymentData.transaction_id,
        status: 'pending',
      })

      setPaymentStatus('pending')
      setPaymentMessage('Waiting for payment confirmation...')

      // Poll payment status using the status check API
      // Initial delay: 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000))

      const maxPollAttempts = 120 // 10 minutes total (120 * 5 seconds average)
      let pollAttempts = 0
      let paymentCompleted = false
      const startTime = Date.now()

      const checkPaymentStatus = async (isManualCheck = false): Promise<boolean> => {
        try {
          // Use our transaction ID (the database transaction ID, not the BulkClix one)
          const statusResponse = await fetch(`/api/payments/status?transaction_id=${transaction.id}`)
          
          if (!statusResponse.ok) {
            if (statusResponse.status === 404 && !isManualCheck) {
              // Transaction not found yet (normal for first few seconds)
              return false
            }
            throw new Error(`Status check failed: ${statusResponse.statusText}`)
          }

          const statusData = await statusResponse.json()
          console.log('📊 Payment Status Check:', statusData)

          if (statusData.status === 'success') {
            // Payment successful - submit vote
            await db.submitPublicVote(
              election.id,
              selectedCandidate!,
              voteCount,
              userPhone.trim(),
              null,
              transaction.id
            )
            setPaymentStatus('completed')
            setPaymentMessage('Payment successful! Your vote has been recorded.')
            setProcessing(false)
            setSubmitted(true)
            await loadVoteCounts()
            return true
          } else if (statusData.status === 'failed') {
            setPaymentStatus('failed')
            setPaymentMessage(statusData.message || 'Payment failed. Please try again.')
            setError('Payment failed')
            setProcessing(false)
            return true
          }

          // Still pending
          return false
        } catch (error) {
          console.error('Error checking payment status:', error)
          if (isManualCheck) {
            setPaymentMessage(`Error checking status: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
          return false
        }
      }

      // Polling loop with variable intervals (matching documentation)
      while (pollAttempts < maxPollAttempts && !paymentCompleted) {
        const elapsed = Date.now() - startTime
        
        // Determine polling interval (from documentation):
        // - First 10 checks (30 seconds): Every 3 seconds
        // - After 30 seconds: Every 2 seconds (faster polling)
        const pollInterval = elapsed < 30000 ? 3000 : 2000
        
        await new Promise(resolve => setTimeout(resolve, pollInterval))

        paymentCompleted = await checkPaymentStatus(false)
        pollAttempts++

        // Update message based on elapsed time
        if (!paymentCompleted) {
          const minutes = Math.floor(elapsed / 60000)
          const seconds = Math.floor((elapsed % 60000) / 1000)
          const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
          setPaymentMessage(`Waiting for payment confirmation... (${timeStr})`)
          
          // Show timeout warning after 2 minutes
          if (elapsed > 120000) {
            setPaymentMessage(`Waiting for payment confirmation... (${timeStr}) - Please check your phone`)
          }
        }
      }

      if (!paymentCompleted) {
        setPaymentStatus('failed')
        setPaymentMessage('Payment timeout. If you completed payment, your vote will be processed shortly.')
        setError('Payment timeout')
        setProcessing(false)
      }
    } catch (err: any) {
      console.error('Payment error:', err)
      const errorMessage = err.message || 'Failed to process payment'
      setError(errorMessage)
      setPaymentStatus('failed')
      setPaymentMessage(errorMessage)
      setProcessing(false)
    }
  }, [selectedCandidate, userPhone, mobileMoneyNetwork, voteCount, election, validateForm, loadVoteCounts])

  const { formatCurrency } = useCurrency()

  const resetForm = () => {
    setSelectedCandidate(null)
    setVoteCount(1)
    setUserPhone('')
    setMobileMoneyNetwork('MTN')
    setError('')
    setFormErrors({})
    setPaymentStatus('idle')
    setPaymentMessage('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Loading contest...</p>
        </div>
      </div>
    )
  }

  if (error && !election) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contest Not Available</h2>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vote Submitted!</h2>
          <p className="text-gray-600 mb-6">
            You've cast {voteCount} vote{voteCount > 1 ? 's' : ''} for {selectedCandidateDetails?.name}
          </p>
          <div className="bg-primary-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">Total Paid</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalCost)}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setSubmitted(false); resetForm() }} className="flex-1">
              Vote Again
            </Button>
            <Button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setSubmitted(false); resetForm() }} className="flex-1">
              View Results
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!election) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Prelyct Logo Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-3">
            <img 
              src="/images/logo.png" 
              alt="Prelyct" 
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
            />
            <span className="text-lg sm:text-xl font-bold text-gray-900">Prelyct Votes</span>
          </div>
        </div>
      </div>

      <div className="flex-1 py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10">
          {/* Header */}
          <Card className="text-center p-4 sm:p-6 border border-gray-100 shadow-sm bg-white">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{election.name}</h1>
          {election.description && <p className="text-gray-600 mb-4">{election.description}</p>}
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="bg-primary-50 px-3 py-1 rounded-full">
              <span className="text-gray-700">Cost: </span>
              <span className="font-bold text-primary">{formatCurrency(election.cost_per_vote || 0)}</span>
            </span>
            {election.max_votes_per_user && (
              <span className="bg-gray-50 px-3 py-1 rounded-full text-gray-700">
                Max {election.max_votes_per_user} votes
              </span>
            )}
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Voting Form */}
        <Card className="p-6 border border-gray-100 shadow-sm bg-white">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Cast Your Vote</h2>

          {/* Select Candidate */}
          <div className="space-y-6 mb-8">
            {candidatesByPosition.map(({ position, candidates: positionCandidates }) => (
              <div key={position.id} className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Position</p>
                    <h3 className="font-semibold text-gray-900 text-lg">{position.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500">Select one candidate</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {positionCandidates.map((candidate: any) => {
                    const isSelected = selectedCandidate === candidate.id
                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          setSelectedCandidate(candidate.id)
                          setFormErrors(prev => ({ ...prev, candidate: '' }))
                        }}
                        className={`rounded-xl border px-3 sm:px-4 py-3 text-left flex items-center gap-3 sm:gap-4 transition touch-manipulation ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-gray-200 bg-white hover:border-primary/40 active:bg-gray-50'
                        }`}
                      >
                        {candidate.photo_url ? (
                          <img
                            src={candidate.photo_url}
                            alt={candidate.name}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-gray-200 flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = '<div class="w-16 h-16 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>'
                              }
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
                            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{candidate.name}</p>
                          {candidate.bio && (
                            <p className="text-xs text-gray-600 line-clamp-2 mt-1">{candidate.bio}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {voteCounts[candidate.id] || 0} votes recorded
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-primary text-sm font-semibold">Selected</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {formErrors.candidate && (
                  <p className="text-sm text-red-600">{formErrors.candidate}</p>
                )}
              </div>
            ))}
          </div>

          {/* Vote Count & Cost */}
          {selectedCandidate && (
            <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 mb-2">Number of Votes</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVoteCount(Math.max(1, voteCount - 1))}
                      className="w-10 h-10 sm:w-8 sm:h-8 rounded border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 touch-manipulation flex items-center justify-center"
                      disabled={voteCount <= 1}
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={election.max_votes_per_user || 1000}
                      value={voteCount}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1)
                        const max = election.max_votes_per_user || 1000
                        setVoteCount(Math.min(val, max))
                      }}
                      className="w-16 text-center font-bold border border-gray-300 rounded px-2 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const max = election.max_votes_per_user || 1000
                        setVoteCount(Math.min(voteCount + 1, max))
                      }}
                      className="w-10 h-10 sm:w-8 sm:h-8 rounded border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 touch-manipulation flex items-center justify-center"
                      disabled={election.max_votes_per_user && voteCount >= election.max_votes_per_user}
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-gray-700">Total Cost</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalCost)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Guidance */}
          <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-white p-5 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Mobile Money payment</p>
              <h3 className="text-lg font-semibold text-gray-900">Approve the prompt sent to your phone</h3>
              <p className="text-sm text-gray-600 mt-1">
                Use the same number entered below. A USSD or push prompt will arrive within a few seconds.
              </p>
            </div>
            <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
              <li>Enter the phone number that will receive the payment prompt.</li>
              <li>Tap <strong>Vote Now</strong>. Keep this page open.</li>
              <li>Approve the prompt and enter your Mobile Money PIN.</li>
              <li>You'll see confirmation here once payment completes.</li>
            </ol>
          </div>

          {/* User Info */}
          <div className="grid gap-5 sm:grid-cols-2 mb-6">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => {
                  setUserPhone(e.target.value)
                  setFormErrors(prev => ({ ...prev, phone: '' }))
                }}
                placeholder="0244 123 456"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  formErrors.phone
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-primary'
                }`}
              />
              <p className="text-xs text-gray-500 mt-2">
                This is the exact number that will receive the USSD prompt and pay for your vote.
              </p>
              {formErrors.phone && <p className="text-sm text-red-600 mt-1">{formErrors.phone}</p>}
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Money Network <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2">
                {MOBILE_NETWORKS.map((network) => (
                  <button
                    key={network}
                    type="button"
                    onClick={() => {
                      setMobileMoneyNetwork(network)
                      setFormErrors(prev => ({ ...prev, network: '' }))
                    }}
                    className={`p-4 sm:p-3 rounded-lg border-2 text-sm font-medium transition touch-manipulation ${
                      mobileMoneyNetwork === network
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 hover:border-primary/50 active:bg-gray-50 text-gray-700 bg-white'
                    }`}
                  >
                    {network === 'AIRTELTIGO' ? 'AirtelTigo' : network}
                  </button>
                ))}
              </div>
              {formErrors.network && <p className="text-sm text-red-600 mt-1">{formErrors.network}</p>}
            </div>
          </div>

          {/* Payment Status */}
          {processing && paymentStatus !== 'idle' && (
            <>
              {/* Top Status Box - Yellow/Cream for pending payments */}
              {paymentStatus === 'pending' && (
                <div className="mb-4 p-5 rounded-xl border-2 border-amber-300 bg-amber-50/50 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 border-3 border-amber-700 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-base mb-1">{paymentMessage}</p>
                      <p className="text-sm text-gray-700">Enter your Mobile Money PIN on your phone</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Success Status */}
              {paymentStatus === 'completed' && (
                <div className="mb-4 p-5 rounded-xl border-2 border-green-300 bg-green-50 shadow-sm">
                  <div className="flex items-center gap-4">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-base">{paymentMessage}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Status */}
              {paymentStatus === 'failed' && (
                <div className="mb-4 p-5 rounded-xl border-2 border-red-300 bg-red-50 shadow-sm">
                  <div className="flex items-center gap-4">
                    <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-base">{paymentMessage}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Bottom Status Bar - Blue for active payment processing */}
              {(paymentStatus === 'initiating' || paymentStatus === 'pending') && (
                <div className="mb-6 p-4 rounded-lg bg-blue-600 text-white shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    <p className="font-medium text-sm">Waiting for Payment...</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleVote}
            disabled={!selectedCandidate || !userPhone.trim() || !mobileMoneyNetwork || processing}
            className="w-full py-4 sm:py-3 text-base sm:text-sm touch-manipulation"
            size="lg"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                {paymentStatus === 'pending' ? 'Waiting for Payment...' : 'Processing...'}
              </>
            ) : (
              `Vote Now - ${formatCurrency(totalCost)}`
            )}
          </Button>
        </Card>

        {/* Live Results */}
        <Card className="p-6 border border-gray-100 shadow-sm bg-white">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Live Tracking</p>
              <h2 className="text-xl font-bold text-gray-900">Live Results</h2>
            </div>
            <button
              onClick={loadVoteCounts}
              className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5" />
              </svg>
              Refresh
            </button>
          </div>
          <div className="space-y-6">
            {candidatesByPosition.map(({ position, candidates: positionCandidates }) => {
              const totalPositionVotes = positionCandidates.reduce((sum, c) => sum + (voteCounts[c.id] || 0), 0)
              return (
                <div key={position.id} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0 space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Position</p>
                      <h3 className="font-bold text-gray-900 text-lg">{position.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500">
                      {totalPositionVotes.toLocaleString()} total votes
                    </p>
                  </div>
                  <div className="space-y-2">
                    {positionCandidates
                      .sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0))
                      .map((candidate: any, index: number) => {
                        const votes = voteCounts[candidate.id] || 0
                        const percentage = totalPositionVotes > 0 ? (votes / totalPositionVotes) * 100 : 0
                        return (
                          <div key={candidate.id} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-400 w-6">{index + 1}.</span>
                                <p className="font-semibold text-gray-900">{candidate.name}</p>
                              </div>
                              <div className="text-sm font-mono text-gray-600">
                                {votes.toLocaleString()} votes
                              </div>
                            </div>
                            {totalPositionVotes > 0 && (
                              <div className="mt-2 h-2 rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${percentage.toFixed(2)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo.png" 
                alt="Prelyct" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Prelyct</h3>
                <p className="text-sm text-gray-600 mt-1 max-w-md">
                  Building secure digital tools for campuses and organisations across Ghana—covering elections, student housing, web development, and creative services.
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-sm text-gray-500">Powered by</p>
              <a 
                href="https://www.prelyct.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors inline-block mt-1"
              >
                www.prelyct.com
              </a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Prelyct. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
