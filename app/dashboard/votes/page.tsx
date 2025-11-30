'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import Table, { TableRow, TableCell } from '@/components/Table'
import { db, type Election } from '@/lib/supabaseClient'

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

export default function VotesPage() {
  const router = useRouter()
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'closed'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const loadElections = useCallback(async () => {
    try {
      const data = await db.getElections()
      setElections(data)
    } catch (error) {
      console.error('Failed to load elections:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadElections()
  }, [loadElections])

  const getVotingLink = useCallback((election: Election) => {
    if (typeof window === 'undefined') return ''
    const origin = window.location.origin
    
    // Public contests use the public voting page
    if (election.mode === 'public_contest') {
      if (election.public_voting_link) {
        return `${origin}/public-vote/${election.public_voting_link}`
      }
      return `${origin}/public-vote/${election.id}`
    }
    
    // Institutional elections use the regular vote page
    return `${origin}/vote?electionId=${election.id}`
  }, [])

  const handleCopyLink = (election: Election) => {
    const link = getVotingLink(election)
    navigator.clipboard.writeText(link)
    setCopiedLink(election.id)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const stats = useMemo(() => {
    return {
      total: elections.length,
      active: elections.filter((e) => e.status === 'active').length,
      draft: elections.filter((e) => e.status === 'draft').length,
      closed: elections.filter((e) => e.status === 'closed').length,
    }
  }, [elections])

  const filteredElections = useMemo(() => {
    return elections.filter((election) => {
      const matchesStatus = statusFilter === 'all' || election.status === statusFilter
      const matchesSearch =
        !searchTerm.trim() ||
        election.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        election.description?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [elections, statusFilter, searchTerm])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading elections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Elections</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your elections</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search elections…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-64"
          />
          <Button onClick={() => router.push('/dashboard/votes/new')} className="w-full sm:w-auto">
            Create election
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, accent: 'text-gray-900' },
          { label: 'Active', value: stats.active, accent: 'text-green-600' },
          { label: 'Draft', value: stats.draft, accent: 'text-amber-600' },
          { label: 'Closed', value: stats.closed, accent: 'text-gray-500' },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.accent}`}>{item.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'active', 'draft', 'closed'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
              statusFilter === filter ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <Card>
        {filteredElections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {elections.length === 0
                ? 'No elections yet'
                : 'No elections match your filters'}
            </p>
            {elections.length === 0 ? (
              <Button onClick={() => router.push('/dashboard/votes/new')}>
                Create your first election
              </Button>
            ) : (
              <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all') }}>
                Reset filters
              </Button>
            )}
          </div>
        ) : (
          <Table headers={['Name', 'Mode', 'Status', 'Payment', 'Voting Link', 'Actions']}>
            {filteredElections.map((election) => (
              <TableRow key={election.id}>
                <TableCell>{election.name}</TableCell>
                <TableCell>
                  <Badge variant={election.mode === 'public_contest' ? 'info' : 'default'}>
                    {election.mode === 'public_contest' ? 'Public' : 'Institutional'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(election.status)}>
                    {election.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={election.payment_status === 'paid' ? 'success' : 'warning'}>
                    {election.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {election.status === 'active' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(election)}
                        className="text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-1"
                      >
                        {copiedLink === election.id ? (
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
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Not available</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/votes/${election.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

