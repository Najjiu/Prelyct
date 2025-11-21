'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { mockAuth } from '@/lib/mockAuth'
import ProtectedRoute from '@/components/ProtectedRoute'
import Button from '@/components/Button'
import NotificationBell from '@/components/NotificationBell'
import { ConfirmDialog } from '@/components/AlertDialog'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (hasSupabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          setUserEmail(session.user.email)
        }
      } else {
        const user = mockAuth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
        }
      }
      setLoading(false)
    }

    getUser()
  }, [])

  const handleSignOut = async () => {
    const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (hasSupabase) {
      await supabase.auth.signOut()
    } else {
      await mockAuth.signOut()
    }
    router.push('/auth/sign-in')
  }

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m-4 0h8" />
        </svg>
      ),
    },
    {
      href: '/dashboard/votes',
      label: 'Votes',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/invoices',
      label: 'Invoices',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L18.707 9a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/monitoring',
      label: 'Monitoring',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      href: '/dashboard/alerts',
      label: 'Alerts',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18h.01" />
        </svg>
      ),
    },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1.724 1.724 0 002.591.99c.845-.49 1.932.274 1.658 1.21a1.724 1.724 0 00.5 1.79c.68.68.26 1.845-.673 2.033a1.724 1.724 0 00-1.287 1.287c-.188.933-1.353 1.353-2.033.673a1.724 1.724 0 00-1.79-.5c-.936.274-1.7-.813-1.21-1.658a1.724 1.724 0 00-.99-2.591c-.921-.3-.921-1.603 0-1.902a1.724 1.724 0 00.99-2.591z" />
        </svg>
      ),
    },
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar overlay */}
        <div
          className={`fixed inset-0 z-40 flex md:hidden transition-opacity ${
            sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <button
            className="flex-1 bg-black/40"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={`relative w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ${
              sidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <SidebarContent
              navItems={navItems}
              pathname={pathname}
              userEmail={userEmail}
              onSignOut={() => setConfirmSignOutOpen(true)}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r md:border-gray-200 md:bg-white">
          <SidebarContent
            navItems={navItems}
            pathname={pathname}
            userEmail={userEmail}
            onSignOut={() => setConfirmSignOutOpen(true)}
            onNavigate={() => setSidebarOpen(false)}
          />
        </aside>

        {/* Main content */}
        <div className="md:ml-64">
          {/* Topbar */}
          <header className="bg-white border-b border-gray-200">
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:text-gray-900"
                  aria-label="Open menu"
                  onClick={() => setSidebarOpen(true)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                  {pathname?.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <span className="hidden sm:inline text-sm text-gray-600">{userEmail}</span>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSignOutOpen}
        title="Sign out?"
        message="You'll need to sign in again to manage your elections."
        confirmText="Sign out"
        cancelText="Stay logged in"
        type="danger"
        onClose={() => setConfirmSignOutOpen(false)}
        onConfirm={handleSignOut}
      />
    </ProtectedRoute>
  )
}

interface SidebarContentProps {
  navItems: {
    href: string
    label: string
    icon: React.ReactNode
  }[]
  pathname: string | null
  userEmail: string
  onSignOut: () => void
  onNavigate?: () => void
}

function SidebarContent({ navItems, pathname, userEmail, onSignOut, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 py-5">
        <p className="text-xs uppercase tracking-wide text-gray-500">Prelyct</p>
        <h1 className="text-xl font-bold text-gray-900">Votes Console</h1>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-200 px-4 py-6">
        <p className="text-xs uppercase tracking-wide text-gray-500">Signed in</p>
        <p className="text-sm font-medium text-gray-900 truncate">{userEmail}</p>
        <Button variant="outline" className="mt-3 w-full" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}


