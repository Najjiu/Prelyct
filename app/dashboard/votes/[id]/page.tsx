'use client'

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import AlertDialog, { ConfirmDialog } from '@/components/AlertDialog'
import { useAlert, useConfirm } from '@/lib/useAlert'
import { db, type Election } from '@/lib/supabaseClient'
import { useCurrency } from '@/lib/useCurrency'

// Lazy load tabs for code splitting
const VotersTab = lazy(() => import('./VotersTab'))
const PositionsTab = lazy(() => import('./PositionsTab'))
const ResultsTab = lazy(() => import('./ResultsTab'))

type Tab = 'overview' | 'positions' | 'voters' | 'results'

export default function ElectionDetailPage() {
  const params = useParams()
  const electionId = params.id as string
  const { formatCurrency } = useCurrency()
  const [election, setElection] = useState<Election | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showShareModal, setShowShareModal] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [shareMethod, setShareMethod] = useState<'link' | 'email' | 'sms' | 'qr' | 'social'>('qr')
  const [error, setError] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const { alert: alertState, showAlert, closeAlert } = useAlert()
  const { confirm: confirmState, showConfirm, closeConfirm } = useConfirm()

  useEffect(() => {
    console.log('Confirm state changed:', confirmState)
  }, [confirmState])

  const loadElection = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await db.getElection(electionId)
      if (!data) {
        setError('Election not found')
        return
      }
      setElection(data)
    } catch (err: any) {
      console.error('Failed to load election:', err)
      setError(err.message || 'Failed to load election')
    } finally {
      setLoading(false)
    }
  }, [electionId])

  useEffect(() => {
    loadElection()
  }, [loadElection])

  // Hooks must be called before any early returns
  const votingLink = useMemo(() => {
    if (typeof window === 'undefined' || !election) return '/vote'
    if (election.mode === 'public_contest' && election.public_voting_link) {
      return `${window.location.origin}/public-vote/${election.public_voting_link}`
    }
    if (election.mode === 'public_contest') {
      return `${window.location.origin}/public-vote/${electionId}`
    }
    return `${window.location.origin}/vote?electionId=${electionId}`
  }, [election, electionId])

  async function updateElectionStatus(status: 'draft' | 'active' | 'closed') {
    if (!election || updatingStatus) {
      return
    }

    setUpdatingStatus(true)
    try {
      const updated = await db.updateElection(electionId, { status })
      setElection(updated)
      
      // Send election reminder notification when activated
      if (status === 'active') {
        try {
          const { sendElectionReminder } = await import('@/lib/email')
          const startDate = new Date(updated.start_date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          
          await sendElectionReminder(
            updated.user_id,
            updated.id,
            'starting',
            updated.name,
            startDate,
            updated.description || undefined
          )
        } catch (error) {
          console.error('Failed to send election reminder:', error)
          // Don't fail status update if notification fails
        }
      }
    } catch (err: any) {
      console.error('Error updating election status:', err)
      showAlert(err.message || 'Failed to update election status', {
        title: 'Error',
        type: 'error',
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading election...</p>
        </div>
      </div>
    )
  }

  if (error || !election) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600">{error || 'Election not found'}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </Card>
    )
  }

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'positions' as Tab, label: 'Positions & Candidates' },
    { id: 'voters' as Tab, label: 'Voters' },
    { id: 'results' as Tab, label: 'Results' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{election.name}</h1>
          <Badge variant={election.status === 'active' ? 'success' : election.status === 'closed' ? 'default' : 'warning'}>
            {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
          </Badge>
          <Badge variant={election.mode === 'public_contest' ? 'info' : 'default'}>
            {election.mode === 'public_contest' ? 'Public Contest' : 'Institutional'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-gray-600">{election.description || 'No description provided'}</p>
        
        {/* Status Management */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {election.status === 'draft' && (
            <Button
              type="button"
              size="sm"
              disabled={updatingStatus}
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (updatingStatus) return
                
                const confirmed = window.confirm(
                  'Are you sure you want to activate this election? Once activated, voters can start voting.'
                )
                
                if (confirmed) {
                  await updateElectionStatus('active')
                }
              }}
            >
              {updatingStatus ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Activating...
                </>
              ) : (
                'Activate Election'
              )}
            </Button>
          )}
          {election.status === 'active' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={updatingStatus}
              onClick={() => {
                const confirmed = window.confirm(
                  'Are you sure you want to close this election? This will stop all voting.'
                )
                if (confirmed) {
                  updateElectionStatus('closed')
                }
              }}
            >
              {updatingStatus ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2 inline-block"></div>
                  Closing...
                </>
              ) : (
                'Close Election'
              )}
            </Button>
          )}
          {election.status === 'closed' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={updatingStatus}
              onClick={() => {
                const confirmed = window.confirm(
                  'Are you sure you want to reopen this election? Voters will be able to vote again while it is active.'
                )
                if (confirmed) {
                  updateElectionStatus('active')
                }
              }}
            >
              {updatingStatus ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2 inline-block"></div>
                  Reopening...
                </>
              ) : (
                'Reopen Election'
              )}
            </Button>
          )}
        </div>

        {/* Voting Link */}
        {election.status === 'active' && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-900">
                    {election.mode === 'public_contest' ? 'Public Voting Link' : 'Share Voting Link'}
                  </p>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {election.mode === 'public_contest' 
                    ? 'Share this link publicly for users to vote (pay-per-vote)'
                    : 'Share this link with voters to access the voting platform'}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    readOnly
                    value={votingLink}
                    className="flex-1 px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  />
                  <Button
                    size="sm"
                    onClick={() => window.open(votingLink, '_blank')}
                    className="flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open {election.mode === 'public_contest' ? 'Public Voting' : 'Voting'} Page
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(votingLink)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                  >
                    {copiedLink ? (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShareModal(true)}
                  >
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                      Share
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab election={election} />
      )}

      {activeTab === 'positions' && (
        <Suspense fallback={<div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>}>
          <PositionsTab electionId={electionId} election={election} onUpdate={loadElection} />
        </Suspense>
      )}

      {activeTab === 'voters' && (
        <Suspense fallback={<div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>}>
          <VotersTab electionId={electionId} election={election} />
        </Suspense>
      )}

      {activeTab === 'results' && (
        <Suspense fallback={<div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>}>
          <ResultsTab electionId={electionId} election={election} />
        </Suspense>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          election={election}
          votingLink={votingLink}
          onClose={() => setShowShareModal(false)}
          shareMethod={shareMethod}
          setShareMethod={setShareMethod}
          copiedLink={copiedLink}
          setCopiedLink={setCopiedLink}
        />
      )}
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ election }: { election: Election }) {
  const { formatCurrency } = useCurrency()
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Election Name</h3>
          <p className="mt-1 text-lg text-gray-900">{election.name}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500">Mode</h3>
          <p className="mt-1">
            <Badge variant={election.mode === 'public_contest' ? 'info' : 'default'}>
              {election.mode === 'public_contest' ? 'Public Contest (Pay-per-vote)' : 'Institutional (One-person-one-vote)'}
            </Badge>
          </p>
        </div>

        {election.mode === 'public_contest' && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Cost per Vote</h3>
              <p className="mt-1 text-lg text-gray-900">{formatCurrency(election.cost_per_vote || 0)}</p>
            </div>
            {election.max_votes_per_user && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Max Votes per User</h3>
                <p className="mt-1 text-lg text-gray-900">{election.max_votes_per_user}</p>
              </div>
            )}
          </>
        )}

        {election.mode === 'institutional' && (
          <>
            {election.expected_voters > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Expected Voters</h3>
                <p className="mt-1 text-lg text-gray-900">{election.expected_voters.toLocaleString()}</p>
              </div>
            )}
            {election.projected_base_cost > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Projected Base Cost</h3>
                <p className="mt-1 text-lg text-gray-900">{formatCurrency(election.projected_base_cost)}</p>
              </div>
            )}
            {election.due_now > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Amount Due</h3>
                <p className="mt-1 text-lg text-gray-900">{formatCurrency(election.due_now)}</p>
              </div>
            )}
          </>
        )}

        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <p className="mt-1">
            <Badge variant={election.status === 'active' ? 'success' : election.status === 'closed' ? 'default' : 'warning'}>
              {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
            </Badge>
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500">Start Date & Time</h3>
          <p className="mt-1 text-gray-900">{formatDate(election.start_date)}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500">End Date & Time</h3>
          <p className="mt-1 text-gray-900">{formatDate(election.end_date)}</p>
        </div>

        {election.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">{election.description}</p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-gray-500">Created</h3>
          <p className="mt-1 text-gray-900">{formatDate(election.created_at)}</p>
        </div>
      </div>
    </Card>
  )
}

// Share Modal Component
function ShareModal({
  election,
  votingLink,
  onClose,
  shareMethod,
  setShareMethod,
  copiedLink,
  setCopiedLink,
}: {
  election: Election
  votingLink: string
  onClose: () => void
  shareMethod: 'link' | 'email' | 'sms' | 'qr' | 'social'
  setShareMethod: (method: 'link' | 'email' | 'sms' | 'qr' | 'social') => void
  copiedLink: boolean
  setCopiedLink: (copied: boolean) => void
}) {
  const shareText = `🗳️ Vote in ${election.name}!\n\n${votingLink}`
  const shareUrl = encodeURIComponent(votingLink)
  const shareTitle = encodeURIComponent(`Vote in ${election.name}`)

  const handleSocialShare = (platform: string) => {
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${shareUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      email: `mailto:?subject=${shareTitle}&body=${encodeURIComponent(shareText)}`,
      telegram: `https://t.me/share/url?url=${shareUrl}&text=${encodeURIComponent(shareText)}`,
    }
    const url = urls[platform]
    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
    }
  }

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return
    
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `vote-qr-${election.name.replace(/\s+/g, '-').toLowerCase()}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      })
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Share Voting Link</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Share Method Tabs */}
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'qr', label: 'QR Code', icon: '📱' },
              { id: 'social', label: 'Social', icon: '🔗' },
              { id: 'link', label: 'Link', icon: '🔗' },
              { id: 'email', label: 'Email', icon: '📧' },
              { id: 'sms', label: 'SMS', icon: '💬' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setShareMethod(tab.id as any)}
                className={`px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  shareMethod === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* QR Code Sharing */}
          {shareMethod === 'qr' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-4">
                  Scan this QR code to access the voting page
                </p>
                <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
                  <QRCode
                    id="qr-code-svg"
                    value={votingLink}
                    size={200}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    viewBox="0 0 200 200"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-3 mb-4">
                  Perfect for posters, flyers, and in-person sharing
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadQRCode}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download QR Code
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(votingLink)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                    className="flex items-center gap-2"
                  >
                    {copiedLink ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Social Media Sharing */}
          {shareMethod === 'social' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Share on social media platforms
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'whatsapp', label: 'WhatsApp', color: 'bg-green-500 hover:bg-green-600', icon: '💬' },
                  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600 hover:bg-blue-700', icon: '📘' },
                  { id: 'twitter', label: 'Twitter', color: 'bg-sky-500 hover:bg-sky-600', icon: '🐦' },
                  { id: 'telegram', label: 'Telegram', color: 'bg-blue-500 hover:bg-blue-600', icon: '✈️' },
                  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-700 hover:bg-blue-800', icon: '💼' },
                  { id: 'email', label: 'Email', color: 'bg-gray-600 hover:bg-gray-700', icon: '📧' },
                ].map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleSocialShare(platform.id)}
                    className={`${platform.color} text-white rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors`}
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="text-xs font-medium">{platform.label}</span>
                  </button>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Click any platform to open the share dialog. The voting link will be automatically included.
                </p>
              </div>
            </div>
          )}

          {/* Link Sharing */}
          {shareMethod === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voting Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={votingLink}
                    className="flex-1 px-3 py-2 text-sm font-mono bg-gray-50 border border-gray-300 rounded-md"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(votingLink)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Share this link via WhatsApp, email, or any messaging platform.
                  {election.mode === 'institutional' && ' Voters will need to enter their Voter ID to access the voting platform.'}
                </p>
              </div>
            </div>
          )}

          {/* Email Sharing */}
          {shareMethod === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Voting Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={votingLink}
                    className="flex-1 px-3 py-2 text-sm font-mono bg-gray-50 border border-gray-300 rounded-md"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      handleSocialShare('email')
                    }}
                  >
                    Open Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(votingLink)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Click "Open Email" to create a new email with the voting link, or copy the link to paste into your email client.
                </p>
              </div>
            </div>
          )}

          {/* SMS Sharing */}
          {shareMethod === 'sms' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMS Voting Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={votingLink}
                    className="flex-1 px-3 py-2 text-sm font-mono bg-gray-50 border border-gray-300 rounded-md"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`
                      window.location.href = smsUrl
                    }}
                  >
                    Open SMS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(votingLink)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Click "Open SMS" to create a new SMS with the voting link, or copy the link to paste into your messaging app.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
