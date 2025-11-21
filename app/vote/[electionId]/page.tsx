'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '@/components/Card'
import Button from '@/components/Button'

interface ElectionData {
  election: any
  positions: any[]
  candidates: any[]
}

export default function VotePage() {
  const params = useParams()
  const router = useRouter()
  const electionId = params.electionId as string
  const [electionData, setElectionData] = useState<ElectionData | null>(null)
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [voterId, setVoterId] = useState('')
  const [error, setError] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    async function verifyAccess() {
      try {
        setLoading(true)
        setError('')
        
        // Check if voter session exists
        const storedVoterId = sessionStorage.getItem('voterId')
        const storedVoterIdentifier = sessionStorage.getItem('voterIdentifier')
        const storedElectionId = sessionStorage.getItem('electionId')
        
        if (!storedVoterId || !storedVoterIdentifier || storedElectionId !== electionId) {
          router.push(`/vote?electionId=${electionId}`)
          return
        }

        // Verify access with the database
        const { db } = await import('@/lib/supabaseClient')
        const result = await db.verifyVoterAccess(electionId, storedVoterIdentifier)
        
        if (!result) {
          sessionStorage.clear()
          router.push(`/vote?electionId=${electionId}`)
          return
        }

        // Check if access token has been used
        if (result.voter.access_token_used || result.voter.has_voted) {
          sessionStorage.clear()
          router.push(`/vote?electionId=${electionId}&error=already_voted`)
          return
        }

        setVoterId(storedVoterIdentifier)
        
        // Load election data
        const data = await db.getElectionForVoting(electionId)
        if (data) {
          setElectionData(data)
        } else {
          setError('Election data not found')
        }
      } catch (error: any) {
        console.error('Access verification error:', error)
        setError(error.message || 'Failed to verify access. Please try again.')
        sessionStorage.clear()
        setTimeout(() => {
          router.push(`/vote?electionId=${electionId}&error=verification_failed`)
        }, 2000)
      } finally {
        setLoading(false)
      }
    }

    verifyAccess()
  }, [router, electionId])

  const handleVoteChange = useCallback((positionId: string, candidateId: string) => {
    setVotes((prev) => ({ ...prev, [positionId]: candidateId }))
    if (error) {
      setError('')
    }
  }, [error])

  const handleSubmit = useCallback(async () => {
    if (!electionData) return

    setSubmitting(true)
    setError('')

    try {
      const storedVoterId = sessionStorage.getItem('voterId')
      if (!storedVoterId) {
        setError('Voter session expired. Please start over.')
        setSubmitting(false)
        router.push(`/vote?electionId=${electionId}`)
        return
      }

      // Import db functions
      const { db } = await import('@/lib/supabaseClient')
      
      // Convert votes object to array format
      const voteArray = Object.entries(votes).map(([positionId, candidateId]) => ({
        positionId,
        candidateId,
      }))
      
      // Submit votes to database
      await db.submitVote(electionId, storedVoterId, voteArray)
      
      // Clear session storage
      sessionStorage.clear()
      
      // Mark as submitted
      setSubmitting(false)
      setShowConfirmDialog(false)
      setSubmitted(true)
    } catch (error: any) {
      console.error('Vote submission error:', error)
      setError(error.message || 'Failed to submit your vote. Please try again.')
      setSubmitting(false)
      setShowConfirmDialog(false)
      
      // If voter has already voted, redirect to access page
      if (error.message?.includes('already voted')) {
        sessionStorage.clear()
        setTimeout(() => {
          router.push(`/vote?electionId=${electionId}&error=already_voted`)
        }, 2000)
      }
    }
  }, [electionData, votes, electionId, router])

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    if (!electionData) return

    // Validate that all positions have votes
    if (Object.keys(votes).length !== electionData.positions.length) {
      setError('Please make a selection for every position before submitting your ballot.')
      return
    }

    setShowConfirmDialog(true)
  }, [electionData, votes])

  const completedCount = useMemo(() => Object.keys(votes).length, [votes])
  const completionPercent = useMemo(() => {
    if (!electionData?.positions.length) return 0
    return Math.round((completedCount / electionData.positions.length) * 100)
  }, [completedCount, electionData])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showConfirmDialog) {
        setShowConfirmDialog(false)
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showConfirmDialog])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100/60 flex items-center justify-center px-4 py-16">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-700">Loading your ballot...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we verify your access</p>
        </div>
      </div>
    )
  }

  if (error && !electionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100/60 flex items-center justify-center px-4 py-16">
        <Card className="max-w-md w-full text-center">
          <div className="p-6">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push(`/vote?electionId=${electionId}`)} variant="outline">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100/60 flex items-center justify-center px-4 py-16">
        <Card className="max-w-2xl w-full mx-auto text-center space-y-6 p-10 shadow-2xl border-0 bg-white/95 backdrop-blur">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary-200 blur-xl opacity-60 animate-pulse" />
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                <svg className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-gray-900">Vote Submitted Successfully!</h2>
            <p className="text-lg text-gray-600">
              Thank you, <span className="font-semibold text-primary">{voterId}</span>
            </p>
            <p className="text-gray-600">
              Your ballot for <span className="font-semibold">{electionData?.election.name}</span> has been securely recorded.
            </p>
          </div>
          <div className="rounded-2xl bg-green-50 border border-green-200 px-6 py-4 text-left text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-green-900 mb-2">What happens next?</p>
                <ul className="space-y-1.5 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span>Election administrators will verify and publish results once voting closes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span>You can close this tab—no further action is required.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span>If you need to report an issue, contact your election administrator.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <Button onClick={() => router.push('/vote')} variant="outline" size="lg">
            Return to Vote Access
          </Button>
        </Card>
      </div>
    )
  }

  if (!electionData) {
    return null
  }

  const { election, positions, candidates } = electionData

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100/50 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            {/* Header Card */}
            <Card className="rounded-3xl border-0 bg-white/95 p-6 sm:p-8 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium text-primary-600 uppercase tracking-wide">Secure Ballot</p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{election.name}</h1>
                  {election.description && (
                    <p className="mt-2 text-gray-600">{election.description}</p>
                  )}
                </div>
                <div className="rounded-2xl bg-primary-100 px-4 sm:px-5 py-3 text-primary-700">
                  <p className="text-xs uppercase tracking-wide font-medium">Voter ID</p>
                  <p className="mt-1 text-base sm:text-lg font-bold">{voterId}</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="font-medium">Ballot Progress</span>
                  <span className="font-semibold text-primary">
                    {completedCount} / {positions.length} Complete
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-500 ease-out"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                {completionPercent === 100 && (
                  <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Ready to submit!
                  </p>
                )}
              </div>
            </Card>

            {/* Error Message */}
            {error && (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm animate-shake">
                <div className="flex gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Voting Form */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {positions.map((position, index) => {
                const positionCandidates = candidates.filter(c => c.position_id === position.id)
                const selectedCandidateId = votes[position.id]
                const isComplete = !!selectedCandidateId

                return (
                  <Card
                    key={position.id}
                    className={`rounded-3xl border-2 transition-all ${
                      isComplete
                        ? 'border-green-200 bg-green-50/30 shadow-lg'
                        : 'border-gray-200 bg-white/95 shadow-md'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-primary-600 bg-primary-100 px-2.5 py-1 rounded-full">
                              Position {index + 1} of {positions.length}
                            </span>
                            {isComplete && (
                              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Selected
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{position.name}</h2>
                          {position.description && (
                            <p className="mt-2 text-sm text-gray-600">{position.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {positionCandidates.length === 0 ? (
                          <p className="text-sm text-gray-500 italic py-4 text-center">No candidates available for this position</p>
                        ) : (
                          positionCandidates.map((candidate) => {
                            const isSelected = selectedCandidateId === candidate.id
                            return (
                              <label
                                key={candidate.id}
                                className={`group relative flex cursor-pointer flex-col gap-3 rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                                  isSelected
                                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10 scale-[1.02]'
                                    : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-primary-50/40 hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                                    isSelected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                                  }`}>
                                    {isSelected && (
                                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <span className="block text-base sm:text-lg font-semibold text-gray-900">{candidate.name}</span>
                                    {candidate.bio && (
                                      <span className="block text-sm text-gray-600 mt-1">{candidate.bio}</span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div className="text-primary">
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <input
                                  type="radio"
                                  name={position.id}
                                  value={candidate.id}
                                  checked={isSelected}
                                  onChange={() => handleVoteChange(position.id, candidate.id)}
                                  className="sr-only"
                                  aria-label={`Select ${candidate.name} for ${position.name}`}
                                />
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}

              {/* Submit Section */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t-2 border-gray-200 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-gray-500 max-w-md">
                    By submitting, you confirm that the selections above represent your final vote for this election. 
                    <span className="font-semibold text-gray-700"> This action cannot be undone.</span>
                  </p>
                  <Button
                    type="submit"
                    size="lg"
                    className="sm:w-auto w-full"
                    disabled={submitting || completedCount !== positions.length}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submit Ballot
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Ballot Summary */}
            <Card className="rounded-3xl border-0 bg-white/95 p-6 shadow-lg sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ballot Summary
              </h3>
              <div className="space-y-3">
                {positions.map((position) => {
                  const selectedId = votes[position.id]
                  const selectedCandidate = candidates.find((c) => c.id === selectedId)
                  return (
                    <div
                      key={position.id}
                      className={`rounded-xl px-4 py-3 transition ${
                        selectedCandidate
                          ? 'bg-primary/5 border border-primary/20'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {position.name}
                      </p>
                      <p className={`text-sm font-semibold ${
                        selectedCandidate ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {selectedCandidate ? selectedCandidate.name : 'Not selected'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Security Info */}
            <Card className="rounded-3xl border-0 bg-white/95 p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Voting Security
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <span>Encrypted submission ensures your vote remains confidential</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <span>Only one ballot per verified voter ID is recorded</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <span>Audit trails allow election officials to validate turnout</span>
                </li>
              </ul>
              <div className="mt-4 rounded-xl bg-primary-50 border border-primary-200 px-4 py-3 text-xs text-primary-800">
                <p className="font-semibold mb-1">Need assistance?</p>
                <p>Contact your election administrator before submitting your ballot.</p>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmDialog(false)}
        >
          <Card
            className="max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Your Vote</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to submit your ballot? Once submitted, you cannot change your votes.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">Your selections:</p>
                {positions.map((position) => {
                  const selectedId = votes[position.id]
                  const selectedCandidate = candidates.find((c) => c.id === selectedId)
                  return (
                    <div key={position.id} className="text-sm">
                      <span className="text-gray-600">{position.name}:</span>{' '}
                      <span className="font-semibold text-gray-900">{selectedCandidate?.name}</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1"
                  disabled={submitting}
                >
                  Review Again
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Submitting...
                    </>
                  ) : (
                    'Confirm & Submit'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
