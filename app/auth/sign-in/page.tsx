'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { mockAuth } from '@/lib/mockAuth'
import Button from '@/components/Button'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (hasSupabase) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        if (data.session) {
          router.push('/dashboard/votes')
        }
      } else {
        const { user, error: mockError } = await mockAuth.signIn(email, password)
        if (mockError) throw mockError
        if (user) {
          router.push('/dashboard/votes')
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const marketingUrl = process.env.NEXT_PUBLIC_PROD_SITE_URL || '/'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100/60 px-4 py-12">
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-start">
        <Link href={marketingUrl} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to website</span>
        </Link>
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 gap-16 lg:grid-cols-[1.1fr_1fr] items-center">
        <div className="hidden lg:flex flex-col gap-10">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-4 py-1 text-sm font-medium text-primary-700 shadow-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              Secure Election Platform
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Welcome back to <span className="text-primary">Prelyct Votes</span>
            </h1>
            <p className="text-lg leading-relaxed text-gray-600">
              Seamlessly manage elections, monitor live results, and keep your community informed in real time.
              Sign in to access your dashboards and continue where you left off.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { label: 'Active Elections', value: '14' },
              { label: 'Verified Voters', value: '190' },
              { label: 'Institutions', value: '17' },
              { label: 'Avg. Uptime', value: '99.3%' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-primary-100 bg-white/80 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-sm font-medium text-gray-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-primary-700">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-white/50 bg-white/70 p-5 shadow-sm backdrop-blur">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Sessions stay secure with time-based access tokens and multi-factor verification (coming soon) to keep
              every vote protected.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -translate-x-4 translate-y-4 rounded-3xl bg-primary-200/30 blur-3xl" />
          <div className="relative rounded-3xl border border-white/60 bg-white/95 p-8 shadow-xl backdrop-blur-xl sm:p-10">
            <div className="mb-8 space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8a3 3 0 11-3-3 3 3 0 013 3zm-3 7a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3zm-9-7a3 3 0 10-3-3 3 3 0 003 3zm0 7a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-semibold text-gray-900">Sign in</h2>
                <p className="mt-2 text-sm text-gray-600">Access your administrator workspace to run secure elections.</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.5m0 3.5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="peer block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pl-11 text-gray-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="you@example.com"
                    />
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 5h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 7l-10 6L2 7" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="peer block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 pl-11 text-gray-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter your password"
                    />
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.105 0 2-.672 2-1.5S13.105 8 12 8s-2 .672-2 1.5.895 1.5 2 1.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11c0 4-7 9-7 9s-7-5-7-9a7 7 0 1114 0z" />
                      </svg>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-sm font-medium text-gray-500 transition hover:text-primary"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <span className="text-gray-400">Password reset available soon</span>
              </div>

              <Button type="submit" className="w-full group" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" />
                      <path className="opacity-80" strokeLinecap="round" d="M12 2a10 10 0 019.95 9" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>Sign in</span>
                    <svg className="h-4 w-4 transition group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                    </svg>
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 space-y-4 text-center text-sm text-gray-600">
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/auth/sign-up" className="font-semibold text-primary hover:text-primary-dark">
                  Create one in minutes
                </Link>
              </p>
              <p className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Need help? Reach out to your Prelyct success manager.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

