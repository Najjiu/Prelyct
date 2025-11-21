'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import InvoiceCard from '@/components/InvoiceCard'
import { db, type Invoice, type Election } from '@/lib/supabaseClient'
import Table, { TableRow, TableCell } from '@/components/Table'
import { useCurrency } from '@/lib/useCurrency'

export default function InvoicesPage() {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [elections, setElections] = useState<Record<string, Election>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [invoicesData, electionsData] = await Promise.all([
          db.getInvoices(),
          db.getElections(),
        ])
        
        setInvoices(invoicesData)
        
        // Create a map of election IDs to elections for quick lookup
        const electionsMap: Record<string, Election> = {}
        electionsData.forEach((election) => {
          electionsMap[election.id] = election
        })
        setElections(electionsMap)
      } catch (error) {
        console.error('Failed to load invoices:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success'
      case 'pending':
        return 'warning'
      case 'overdue':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesFilter = filter === 'all' || invoice.status === filter
    const election = elections[invoice.election_id]
    const searchTarget = `${invoice.invoice_number} ${election?.name || ''}`.toLowerCase()
    const matchesSearch =
      searchTerm.trim().length === 0 ||
      searchTarget.includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handlePayInvoice = async (invoice: Invoice) => {
    // Get the election ID from the invoice
    const electionId = invoice.election_id
    router.push(`/dashboard/payments/${electionId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    )
  }

  const stats = {
    total: invoices.length,
    pending: invoices.filter((inv) => inv.status === 'pending').length,
    paid: invoices.filter((inv) => inv.status === 'paid').length,
    overdue: invoices.filter((inv) => inv.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    paidAmount: invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0),
    pendingAmount: invoices
      .filter((inv) => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.amount, 0),
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.pendingAmount)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.paidAmount)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'pending', 'paid', 'overdue'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                filter === option
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs font-semibold uppercase tracking-wide text-primary"
            >
              Clear
            </button>
          )}
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice or election…"
            className="w-full md:w-64 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {filter === 'all' ? 'No invoices yet' : `No ${filter} invoices`}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                View all invoices
              </Button>
            )}
          </div>
        ) : (
          <Table
            headers={['Invoice #', 'Election', 'Amount', 'Status', 'Due Date', 'Paid Date', 'Actions']}
          >
            {filteredInvoices.map((invoice) => {
              const election = elections[invoice.election_id]
              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <span className="font-mono text-sm">{invoice.invoice_number}</span>
                  </TableCell>
                  <TableCell>
                    {election ? (
                      <Link
                        href={`/dashboard/votes/${election.id}`}
                        className="text-primary hover:underline"
                      >
                        {election.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{formatDate(invoice.due_date)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {invoice.paid_date ? formatDate(invoice.paid_date) : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {invoice.status === 'pending' && (
                        <Button size="sm" onClick={() => handlePayInvoice(invoice)}>
                          Pay Now
                        </Button>
                      )}
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}

