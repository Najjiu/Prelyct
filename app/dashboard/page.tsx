'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import { db, type Election, type Invoice } from '@/lib/supabaseClient'
import { useCurrency } from '@/lib/useCurrency'

interface DashboardStats {
  totalElections: number
  activeElections: number
  draftElections: number
  closedElections: number
  totalVotes: number
  totalInvoices: number
  pendingInvoices: number
  totalRevenue: number
  pendingRevenue: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalElections: 0,
    activeElections: 0,
    draftElections: 0,
    closedElections: 0,
    totalVotes: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
  })
  const [recentElections, setRecentElections] = useState<Election[]>([])
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      setError('')

      // Load elections and invoices in parallel
      const [elections, invoices] = await Promise.all([
        db.getElections(),
        db.getInvoices(),
      ])

      // Calculate statistics
      const activeElections = elections.filter(e => e.status === 'active').length
      const draftElections = elections.filter(e => e.status === 'draft').length
      const closedElections = elections.filter(e => e.status === 'closed').length

      // Calculate total votes efficiently
      let totalVotes = 0
      try {
        if (elections.length > 0) {
          // Use a single query to count all votes for user's elections
          const { supabase } = await import('@/lib/supabaseClient')
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const electionIds = elections.map(e => e.id)
            // Count votes for all elections in batches if needed (Supabase has a limit)
            const batchSize = 100
            for (let i = 0; i < electionIds.length; i += batchSize) {
              const batch = electionIds.slice(i, i + batchSize)
              const { count } = await supabase
                .from('votes')
                .select('*', { count: 'exact', head: true })
                .in('election_id', batch)
              
              totalVotes += count || 0
            }
          }
        }
      } catch (err) {
        console.error('Error calculating votes:', err)
        // If direct count fails, we'll show 0 rather than blocking the page
      }

      // Calculate revenue
      // Include: paid invoices + completed payment transactions for user's elections
      // Pending: pending/overdue invoices + pending payment transactions
      let totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0)
      let pendingRevenue = invoices
        .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.amount, 0)

      try {
        if (elections.length > 0) {
          const { supabase } = await import('@/lib/supabaseClient')
          const electionIds = elections.map(e => e.id)
          const batchSize = 100
          let completedSum = 0
          let pendingSum = 0
          for (let i = 0; i < electionIds.length; i += batchSize) {
            const batch = electionIds.slice(i, i + batchSize)
            const { data: txns } = await supabase
              .from('payment_transactions')
              .select('amount, status, election_id')
              .in('election_id', batch)
            if (txns) {
              txns.forEach((t: { status: string | null; amount: number | string | null }) => {
                if (t.status === 'completed') completedSum += Number(t.amount) || 0
                if (t.status === 'pending') pendingSum += Number(t.amount) || 0
              })
            }
          }
          totalRevenue += completedSum
          pendingRevenue += pendingSum
        }
      } catch (err) {
        console.error('Error aggregating payment transactions:', err)
      }

      setStats({
        totalElections: elections.length,
        activeElections,
        draftElections,
        closedElections,
        totalVotes,
        totalInvoices: invoices.length,
        pendingInvoices: invoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue').length,
        totalRevenue,
        pendingRevenue,
      })

      // Get recent elections (last 5)
      setRecentElections(elections.slice(0, 5))

      // Get recent invoices (last 5)
      setRecentInvoices(invoices.slice(0, 5))
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'draft':
        return 'warning'
      case 'closed':
        return 'default'
      default:
        return 'default'
    }
  }

  const getInvoiceStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success'
      case 'pending':
        return 'warning'
      case 'overdue':
        return 'error'
      case 'cancelled':
        return 'default'
      default:
        return 'default'
    }
  }

  const statCards = useMemo(() => [
    {
      id: 'total-elections',
      title: 'Total Elections',
      value: stats.totalElections.toLocaleString(),
      helper: `${stats.activeElections} active · ${stats.draftElections} draft`,
      iconBg: 'bg-primary/10 text-primary',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'active-elections',
      title: 'Active Elections',
      value: stats.activeElections.toLocaleString(),
      helper: stats.activeElections > 0 ? 'Running right now' : 'No active elections',
      iconBg: 'bg-green-100 text-green-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'total-votes',
      title: 'Total Votes',
      value: stats.totalVotes.toLocaleString(),
      helper: 'Across all elections',
      iconBg: 'bg-blue-100 text-blue-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      helper: stats.pendingRevenue > 0 ? `${formatCurrency(stats.pendingRevenue)} pending` : 'All payments settled',
      iconBg: 'bg-emerald-100 text-emerald-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ], [stats, formatCurrency])

  const quickActions = useMemo(() => [
    {
      id: 'create',
      title: 'Create Election',
      description: 'Spin up a new contest and invite voters.',
      href: '/dashboard/votes/new',
      iconBg: 'bg-primary/10 text-primary',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      id: 'invoices',
      title: 'Review Invoices',
      description: stats.pendingInvoices > 0 ? `${stats.pendingInvoices} invoice${stats.pendingInvoices === 1 ? '' : 's'} pending` : 'All invoices paid',
      href: '/dashboard/invoices',
      iconBg: 'bg-blue-50 text-blue-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'manage',
      title: 'Manage Elections',
      description: `${stats.totalElections} total election${stats.totalElections === 1 ? '' : 's'}`,
      href: '/dashboard/votes',
      iconBg: 'bg-green-50 text-green-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ], [stats.pendingInvoices, stats.totalElections])

  const insights = useMemo(() => {
    const items: Array<{ id: string; title: string; description: string; href?: string; dotColor: string; cta?: string }> = []

    if (stats.pendingInvoices > 0) {
      items.push({
        id: 'pending-invoices',
        title: 'Invoices awaiting payment',
        description: `${stats.pendingInvoices} invoice${stats.pendingInvoices === 1 ? '' : 's'} are still pending. Send reminders or confirm payments.`,
        href: '/dashboard/invoices',
        dotColor: 'bg-amber-500',
        cta: 'Review invoices',
      })
    }

    if (stats.totalElections === 0) {
      items.push({
        id: 'first-election',
        title: 'Launch your first election',
        description: 'You have not created any elections yet. Start a guided setup in minutes.',
        href: '/dashboard/votes/new',
        dotColor: 'bg-primary',
        cta: 'Create election',
      })
    } else if (stats.activeElections === 0) {
      items.push({
        id: 'no-active',
        title: 'No active elections',
        description: 'Activate a draft or create a new election to start collecting votes.',
        href: '/dashboard/votes',
        dotColor: 'bg-gray-400',
        cta: 'Manage drafts',
      })
    }

    if (stats.pendingRevenue > 0 && stats.pendingInvoices === 0) {
      items.push({
        id: 'pending-revenue',
        title: 'Payments processing',
        description: `${formatCurrency(stats.pendingRevenue)} is awaiting confirmation from mobile money transactions.`,
        href: '/dashboard/invoices',
        dotColor: 'bg-blue-500',
        cta: 'Track payments',
      })
    }

    return items
  }, [stats, formatCurrency])

  const statusBreakdown = useMemo(() => {
    const total = stats.totalElections || 1
    return [
      {
        id: 'draft',
        label: 'Draft',
        count: stats.draftElections,
        color: 'bg-amber-400',
        textColor: 'text-amber-700',
      },
      {
        id: 'active',
        label: 'Active',
        count: stats.activeElections,
        color: 'bg-emerald-500',
        textColor: 'text-emerald-700',
      },
      {
        id: 'closed',
        label: 'Closed',
        count: stats.closedElections,
        color: 'bg-gray-400',
        textColor: 'text-gray-600',
      },
    ].map((item) => ({
      ...item,
      percent: stats.totalElections ? Math.round((item.count / total) * 100) : 0,
    }))
  }, [stats])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Loading your dashboard...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadDashboardData}>Try Again</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Welcome back! Here's an overview of your elections.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/votes/new')}
          size="md"
          aria-label="Create a new election"
          className="group w-full sm:w-auto gap-2 border border-primary text-primary bg-white hover:bg-primary/10 shadow-sm px-4 py-2"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Launch election</p>
              <p className="text-sm font-semibold text-primary">Create New Election</p>
            </div>
          </div>
          <span className="ml-1 rounded-full border border-primary/30 bg-primary/5 p-1 text-primary transition-transform group-hover:translate-x-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card) => (
          <Card key={card.id} className="hover:shadow-lg transition-shadow border border-gray-100 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                {card.helper && (
                  <p className="mt-1 text-xs text-gray-500">{card.helper}</p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.id}
            role="button"
            tabIndex={0}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 bg-white group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => router.push(action.href)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                router.push(action.href)
              }
            }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.iconBg}`}>
                {action.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition">{action.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                <span className="text-xs text-primary font-semibold inline-flex items-center gap-1 mt-2">
                  Go
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Actionable Insights */}
      {insights.length > 0 && (
        <Card className="p-5 border border-amber-100 bg-amber-50/40">
          <div className="flex flex-col gap-3">
            {insights.map((insight) => (
              <div key={insight.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-white/80 px-4 py-3 border border-amber-100">
                <div className="flex items-start gap-3">
                  <span className={`mt-2 h-2.5 w-2.5 rounded-full ${insight.dotColor}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                  </div>
                </div>
                {insight.href && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(insight.href!)}
                    className="sm:ml-4"
                  >
                    {insight.cta || 'Review'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Elections */}
        <Card className="border border-gray-100 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Elections</h2>
            <Link href="/dashboard/votes" className="text-sm text-primary hover:text-primary-dark font-medium">
              View all →
            </Link>
          </div>
          
          {recentElections.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">No elections yet</p>
              <Button onClick={() => router.push('/dashboard/votes/new')} size="sm">
                Create Your First Election
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentElections.map((election) => (
                <Link
                  key={election.id}
                  href={`/dashboard/votes/${election.id}`}
                  className="block p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition">
                          {election.name}
                        </h3>
                        <Badge variant={getStatusVariant(election.status)}>
                          {election.status}
                        </Badge>
                        {election.mode === 'public_contest' && (
                          <Badge variant="info">Public</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {election.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(election.start_date).toLocaleDateString()}
                        </span>
                        {election.mode === 'institutional' && election.expected_voters > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {election.expected_voters.toLocaleString()} voters
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Invoices */}
        <Card className="border border-gray-100 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Invoices</h2>
            <Link href="/dashboard/invoices" className="text-sm text-primary hover:text-primary-dark font-medium">
              View all →
            </Link>
          </div>
          
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/dashboard/invoices/${invoice.id}`}
                  className="block p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition">
                          {invoice.invoice_number}
                        </h3>
                        <Badge variant={getInvoiceStatusVariant(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(invoice.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
                      {invoice.due_date && invoice.status !== 'paid' && (
                        <p className="text-xs text-gray-500">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Election Status Overview */}
      {stats.totalElections > 0 && (
        <Card className="border border-gray-100 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Election Status Overview</h2>
              <p className="text-sm text-gray-500">{stats.totalElections} total elections</p>
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status split</span>
          </div>
          <div className="space-y-4">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
              {statusBreakdown.map((item) => (
                <div
                  key={item.id}
                  className={`${item.color} h-full`}
                  style={{ width: `${stats.totalElections ? item.percent : 0}%` }}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {statusBreakdown.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{item.count}</p>
                    </div>
                    <span className={`text-xs font-semibold ${item.textColor}`}>
                      {stats.totalElections ? `${item.percent}%` : '0%'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
