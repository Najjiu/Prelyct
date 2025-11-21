'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Card from '@/components/Card'
import Button from '@/components/Button'

export default function VoteAccessPage() {
  const router = useRouter()
  const [voterId, setVoterId] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check for error in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    const electionId = urlParams.get('electionId')
    
    if (errorParam === 'already_voted') {
      setError('You have already voted in this election. Each voter can only vote once.')
    } else if (errorParam === 'verification_failed') {
      setError('Failed to verify your access. Please check your credentials and try again.')
    } else if (errorParam === 'access_used') {
      setError('Your voting access has already been used. Each voter can only access the voting page once.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!voterId.trim()) {
      setError('Please enter your voter ID')
      setLoading(false)
      return
    }

    try {
      // Get election ID from URL params or use a default
      // In production, you might want to allow voters to select which election they're voting in
      const urlParams = new URLSearchParams(window.location.search)
      const electionId = urlParams.get('electionId') || '1' // Default for now

      // Import db functions
      const { db } = await import('@/lib/supabaseClient')
      
      // Verify voter access
      const result = await db.verifyVoterAccess(electionId, voterId.trim(), accessCode || undefined)
      
      if (!result) {
        setError('Invalid voter ID or election not found. Please check your credentials and try again.')
        setLoading(false)
        return
      }

      // Store voter session in sessionStorage (more secure than localStorage for sensitive data)
      sessionStorage.setItem('voterId', result.voter.id)
      sessionStorage.setItem('voterIdentifier', result.voter.identifier)
      sessionStorage.setItem('electionId', electionId)
      sessionStorage.setItem('voterAccessToken', result.voter.access_token || '')
      
      // Redirect to voting page
      router.push(`/vote/${electionId}`)
    } catch (error: any) {
      setError(error.message || 'Failed to verify voter access. Please try again.')
      setLoading(false)
    }
  }

  const containerClasses = useMemo(
    () =>
      [
        'mx-auto grid w-full max-w-6xl gap-12',
        'lg:grid-cols-2 lg:items-center',
        'transition-all duration-700',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      ].join(' '),
    [mounted]
  )

  const steps = [
    {
      title: '1. Verify your ID',
      description: 'Use the voter or student ID supplied by your institution. Keep it confidential.',
    },
    {
      title: '2. Enter access code',
      description: 'Only required for elections with extra security. Leave blank if you were not given one.',
    },
    {
      title: '3. Cast your ballot',
      description: 'Review candidate info carefully. You can still change selections before submitting.',
    },
    {
      title: '4. Confirmation',
      description: 'Receive an on-screen receipt and optional email (where enabled).',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100/40 px-4 py-16">
      <div className={containerClasses}>
        <div className="space-y-10">
          <div className="space-y-6">
            <div
              className={`inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-4 py-1 text-sm font-medium text-primary-700 shadow-sm transition-all duration-500 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              }`}
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              Trusted Voting Access
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Welcome to <span className="text-primary">Prelyct Votes</span>
            </h1>
            <p className="text-lg leading-relaxed text-gray-600 max-w-2xl">
              Enter your credentials to access the secure voting portal. Every ballot is encrypted, auditable, and tied to
              your verified voter ID. Need help? The support options below can connect you with an administrator in seconds.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {steps.map((item, index) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-md backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-xs font-semibold uppercase text-primary-600">Step {index + 1}</p>
                <p className="mt-2 text-base font-semibold text-gray-900">{item.title}</p>
                <p className="mt-2 text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">System status</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary-600">
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                All systems operational
              </div>
              <p className="mt-2 text-xs text-gray-500">Last updated just now</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Support</p>
              <p className="mt-2 text-sm text-gray-600">
                Reach out via{' '}
                <a href="mailto:onboarding@prelyct.com" className="font-semibold text-primary hover:text-primary-dark">
                  onboarding@prelyct.com
                </a>
              </p>
              <p className="mt-1 text-xs text-gray-500">Available 8am – 8pm GMT</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Need accessibility?</p>
              <p className="mt-2 text-sm text-gray-600">
                Enable audio guidance during the ballot from the settings icon inside the voting screen.
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 translate-y-6 translate-x-4 rounded-3xl bg-primary-200/30 blur-3xl" />
          <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur-xl">
            <div className="absolute -right-24 top-12 h-48 w-48 rounded-full bg-primary-100 blur-3xl opacity-60" />
            <div className="relative z-10 space-y-6 p-8 sm:p-10">
              <div className="text-center space-y-2">
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary transition-all duration-500 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">Secure voter entry</h2>
                <p className="text-sm text-gray-600">
                  Only verified IDs can proceed to the ballot. Your credentials are encrypted in transit.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded animate-slide-in">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="voterId" className="block text-sm font-medium text-gray-700 mb-2">
                    Voter ID / Student ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      id="voterId"
                      name="voterId"
                      type="text"
                      required
                      value={voterId}
                      onChange={(e) => setVoterId(e.target.value)}
                      placeholder="Enter your voter ID or student ID"
                      className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:border-gray-300"
                    />
                  </div>
                  <p className="text-xs text-gray-500 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    This is the ID provided by your organization
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Access Code <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-centered pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="accessCode"
                      name="accessCode"
                      type="text"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="Enter your access code if provided"
                      className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:border-gray-300"
                    />
                  </div>
                  <p className="text-xs text-gray-500 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Some elections require an access code for additional security
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Access Voting Platform
                      </span>
                    )}
                  </Button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200 animate-fade-in">
                <p className="text-sm text-gray-600 text-center">
                  Don't have your voter ID?{' '}
                  <Link
                    href="/contact.html"
                    className="text-primary hover:text-primary-dark font-medium transition-colors duration-200 inline-flex items-center group"
                  >
                    Contact your administrator
                    <svg className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

