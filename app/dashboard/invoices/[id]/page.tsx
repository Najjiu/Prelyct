'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import { db, type Invoice, type Election } from '@/lib/supabaseClient'
import { downloadReceipt, printReceipt } from '@/lib/receiptGenerator'
import { useCurrency } from '@/lib/useCurrency'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const invoiceId = params.id as string
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [election, setElection] = useState<Election | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInvoice() {
      try {
        const invoices = await db.getInvoices()
        const foundInvoice = invoices.find((inv) => inv.id === invoiceId)
        
        if (foundInvoice) {
          setInvoice(foundInvoice)
          const electionData = await db.getElection(foundInvoice.election_id)
          setElection(electionData)
        }
      } catch (error) {
        console.error('Failed to load invoice:', error)
      } finally {
        setLoading(false)
      }
    }
    loadInvoice()
  }, [invoiceId])

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
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePayInvoice = () => {
    if (invoice && election) {
      router.push(`/dashboard/payments/${election.id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Invoice not found</p>
        <Link href="/dashboard/invoices">
          <Button variant="outline">Back to Invoices</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/invoices" className="text-primary hover:underline text-sm mb-2 inline-block">
            ← Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Invoice {invoice.invoice_number}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
          {invoice.status === 'paid' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => downloadReceipt(invoice, election)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Receipt
              </Button>
              <Button
                variant="outline"
                onClick={() => printReceipt(invoice, election)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </Button>
            </div>
          )}
          {invoice.status === 'pending' && (
            <Button onClick={handlePayInvoice}>Pay Now</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Details */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
              <dd className="mt-1 text-sm font-mono text-gray-900">{invoice.invoice_number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Election</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {election ? (
                  <Link
                    href={`/dashboard/votes/${election.id}`}
                    className="text-primary hover:underline"
                  >
                    {election.name}
                  </Link>
                ) : (
                  'Unknown'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Amount</dt>
              <dd className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(invoice.amount)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Due Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.due_date)}</dd>
            </div>
            {invoice.paid_date && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Paid Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateTime(invoice.paid_date)}</dd>
              </div>
            )}
            {invoice.payment_method && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                <dd className="mt-1 text-sm text-gray-900">{invoice.payment_method}</dd>
              </div>
            )}
            {invoice.transaction_id && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Transaction ID</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{invoice.transaction_id}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Payment Information */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
          {invoice.status === 'paid' ? (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">Payment Received</p>
                <p className="text-xs text-green-600 mt-1">
                  This invoice has been paid on {formatDateTime(invoice.paid_date)}
                </p>
              </div>
              {invoice.transaction_id && (
                <div>
                  <p className="text-sm text-gray-600">Transaction ID:</p>
                  <p className="text-sm font-mono text-gray-900">{invoice.transaction_id}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">Payment Pending</p>
                <p className="text-xs text-yellow-600 mt-1">
                  This invoice is due on {formatDate(invoice.due_date)}
                </p>
              </div>
              <Button onClick={handlePayInvoice} className="w-full">
                Pay Invoice
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Invoice Items */}
      {election && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Election: {election.name}</p>
                <p className="text-sm text-gray-500">Base platform fee</p>
              </div>
              <p className="font-semibold text-gray-900">{formatCurrency(election.projected_base_cost)}</p>
            </div>
            {election.add_ons_cost > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Add-ons</p>
                  <p className="text-sm text-gray-500">Additional services</p>
                </div>
                <p className="font-semibold text-gray-900">{formatCurrency(election.add_ons_cost)}</p>
              </div>
            )}
            <div className="flex justify-between items-center py-3 pt-4 border-t-2 border-gray-300">
              <p className="text-lg font-bold text-gray-900">Total</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(invoice.amount)}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

