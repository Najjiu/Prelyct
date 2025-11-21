'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { mockAuth } from '@/lib/mockAuth'
import Button from '@/components/Button'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Enter a password' }
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    const labels = ['Weak', 'Fair', 'Good', 'Strong']
    return { score, label: labels[Math.max(score - 1, 0)] }
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!acceptTerms) {
      setError('Please agree to the terms to continue.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (passwordStrength.score < 3) {
      setError('Choose a stronger password before continuing.')
      return
    }

    setLoading(true)

    try {
      const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (hasSupabase) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) throw signUpError
        if (data.session) {
          router.push('/dashboard/votes')
        }
      } else {
        const { user, error: mockError } = await mockAuth.signUp(email, password)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100/50 px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="hidden lg:flex flex-col gap-12">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100/70 px-4 py-1 text-sm font-medium text-primary-700 shadow-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              5-minute onboarding
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Create your <span className="text-primary">Prelyct Votes</span> workspace
            </h1>
            <p className="text-lg leading-relaxed text-gray-600">
              Launch secure, verifiable elections with the same tools powering student unions and professional
              associations. Invite team members, configure ballots, and launch within minutes.
            </p>
          </div>

          <div className="space-y-5">
            {[
              {
                title: 'Collaborative admin roles',
                description: 'Add returning officers and observers with granular permissions.',
              },
              {
                title: 'Template library',
                description: 'Kick-start elections with curated templates for popular institutions.',
              },
              {
                title: 'Guided launch checklist',
                description: 'Step-by-step prompts keep every election compliant and on schedule.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-2xl border border-white/50 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-primary-100 bg-white/80 p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7l9-4 9 4v9a6 6 0 01-6 6h-6a6 6 0 01-6-6V7z"
                />
              </svg>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Registration is reserved for accredited administrators. Your workspace request is reviewed when onboarding
              is complete.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 translate-y-6 translate-x-4 rounded-3xl bg-primary-200/30 blur-3xl" />
          <div className="relative rounded-3xl border border-white/70 bg-white/95 p-8 shadow-xl backdrop-blur-xl sm:p-10">
            <div className="mb-8 space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.105 0 2-.672 2-1.5S13.105 8 12 8s-2 .672-2 1.5.895 1.5 2 1.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11c0 4-7 9-7 9s-7-5-7-9a7 7 0 1114 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-semibold text-gray-900">Create your account</h2>
                <p className="mt-2 text-sm text-gray-600">We’ll send a verification link to confirm your organisation.</p>
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Work email
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
                      placeholder="admin@institution.edu"
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
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <span className="text-xs font-medium text-primary-600">
                      {password ? `Strength: ${passwordStrength.label}` : ''}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="peer block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 pl-11 text-gray-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Create a secure password"
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

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="peer block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 pl-11 text-gray-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Re-enter your password"
                    />
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14" />
                      </svg>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-sm font-medium text-gray-500 transition hover:text-primary"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50/80 px-4 py-3 text-xs text-gray-500">
                  Passwords should include at least eight characters, a capital letter, a number, and a special symbol.
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-gray-200/80 bg-white/80 px-4 py-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <span>
                  I agree to the Prelyct{' '}
                  <Link href="/terms-of-service.html" className="font-medium text-primary hover:text-primary-dark">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy-policy.html" className="font-medium text-primary hover:text-primary-dark">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <Button type="submit" className="w-full group" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" />
                      <path className="opacity-80" strokeLinecap="round" d="M12 2a10 10 0 019.95 9" />
                    </svg>
                    Creating your workspace...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>Create account</span>
                    <svg className="h-4 w-4 transition group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                    </svg>
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 space-y-3 text-center text-sm text-gray-600">
              <p>
                Already verified?{' '}
                <Link href="/auth/sign-in" className="font-semibold text-primary hover:text-primary-dark">
                  Sign in to your workspace
                </Link>
              </p>
              <p className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Have questions? Email onboarding@prelyct.com for dedicated support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

