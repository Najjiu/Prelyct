'use client'

import Link from 'next/link'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 6a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Prelyct Votes is getting an upgrade</h1>
        <p className="mt-4 text-lg text-white/80">
          We&apos;re currently performing essential maintenance to deliver an even better experience.
          Please check back soon. Thank you for your patience!
        </p>
        <div className="mt-8">
          <p className="text-sm text-white/60">Need assistance?</p>
          <Link href="mailto:info@prelyct.com" className="text-primary-200 font-medium hover:text-white">
            info@prelyct.com
          </Link>
        </div>
      </div>
    </div>
  )
}


