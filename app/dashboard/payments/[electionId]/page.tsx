'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import AlertDialog from '@/components/AlertDialog'
import { useAlert } from '@/lib/useAlert'
import { db, type Election, type Invoice } from '@/lib/supabaseClient'
import { initiateBulkClixPayment, checkBulkClixTransactionStatus, formatPhoneForBulkClix } from '@/lib/bulkclix'
import { useCurrency } from '@/lib/useCurrency'

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const electionId = params.electionId as string
  const [election, setElection] = useState<Election | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod] = useState<'mobile_money'>('mobile_money')
  const [mobileMoneyDetails, setMobileMoneyDetails] = useState({
    network: 'MTN' as 'MTN' | 'VODAFONE' | 'AIRTELTIGO',
    number: '',
  })
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'initiating' | 'pending' | 'checking' | 'success' | 'failed'>('idle')
  const [bulkClixTransactionId, setBulkClixTransactionId] = useState<string | null>(null)
  const { alert, showAlert, closeAlert } = useAlert()

  useEffect(() => {
    async function loadData() {
      try {
        const [electionData, invoices] = await Promise.all([
          db.getElection(electionId),
          db.getInvoices(electionId),
        ])
        
        setElection(electionData)
        const pendingInvoice = invoices.find((inv) => inv.status === 'pending')
        setInvoice(pendingInvoice || invoices[0] || null)
      } catch (error) {
        console.error('Failed to load payment data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [electionId])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const handlePayment = async () => {
    if (!invoice || !election) return

    setProcessing(true)
    setPaymentStatus('initiating')

    try {
      // Handle mobile money payments via BulkClix
      if (paymentMethod === 'mobile_money') {
        if (!mobileMoneyDetails.number || mobileMoneyDetails.number.length < 10) {
          showAlert('Please enter a valid phone number', {
            title: 'Validation Error',
            type: 'warning',
          })
          setProcessing(false)
          setPaymentStatus('idle')
          return
        }

        const formattedPhone = formatPhoneForBulkClix(mobileMoneyDetails.number)
        const channelMap: Record<'MTN' | 'VODAFONE' | 'AIRTELTIGO', 'MTN' | 'Vodafone' | 'Airtel'> = {
          MTN: 'MTN',
          VODAFONE: 'Vodafone',
          AIRTELTIGO: 'Airtel',
        }

        // Initiate BulkClix payment
        const paymentResponse = await initiateBulkClixPayment({
          amount: invoice.amount,
          account_number: formattedPhone,
          channel: channelMap[mobileMoneyDetails.network],
          account_name: election.name || 'Election Admin',
          client_reference: `INV-${invoice.invoice_number}-${Date.now()}`,
        })

        if (!paymentResponse.success || !paymentResponse.transaction_id) {
          throw new Error(paymentResponse.message || 'Failed to initiate payment')
        }

        setBulkClixTransactionId(paymentResponse.transaction_id)
        setPaymentStatus('pending')

        // Create payment transaction record
        const { supabase } = await import('@/lib/supabaseClient')
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .insert({
            election_id: electionId,
            invoice_id: invoice.id,
            amount: invoice.amount,
            currency: 'GHS',
            status: 'pending',
            payment_method: 'mobile_money',
            payment_provider: 'bulkclix',
            provider_transaction_id: paymentResponse.transaction_id,
            metadata: {
              network: mobileMoneyDetails.network,
              phone: formatPhoneForBulkClix(mobileMoneyDetails.number),
            },
          })
          .select()
          .single()

        // Poll for payment status
        await pollPaymentStatus(paymentResponse.transaction_id, invoice.id, transaction?.id)
      }
    } catch (error: any) {
      console.error('Payment processing error:', error)
      showAlert(error.message || 'Payment failed. Please try again.', {
        title: 'Payment Failed',
        type: 'error',
      })
      setProcessing(false)
      setPaymentStatus('failed')
    }
  }

  const pollPaymentStatus = async (transactionId: string, invoiceId: string, paymentTransactionId?: string) => {
    setPaymentStatus('checking')
    let attempts = 0
    const maxAttempts = 30 // Poll for up to 5 minutes (10 seconds * 30)

    const checkStatus = async () => {
      attempts++
      const status = await checkBulkClixTransactionStatus(transactionId)

      if (!status) {
        if (attempts >= maxAttempts) {
          setPaymentStatus('failed')
          setProcessing(false)
          showAlert('Payment verification timeout. Please check your mobile money and refresh the page.', {
            title: 'Timeout',
            type: 'warning',
          })
          return
        }
        setTimeout(checkStatus, 10000) // Check every 10 seconds
        return
      }

      if (status.status === 'successful') {
        setPaymentStatus('success')
        
        // Update payment transaction
        if (paymentTransactionId) {
          const { supabase } = await import('@/lib/supabaseClient')
          await supabase
            .from('payment_transactions')
            .update({
              status: 'completed',
              metadata: {
                ...status,
              },
            })
            .eq('id', paymentTransactionId)
        }

        // Update invoice status
        const { supabase } = await import('@/lib/supabaseClient')
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            payment_method: 'mobile_money',
            transaction_id: transactionId,
          })
          .eq('id', invoiceId)

        // Update election payment status
        await db.updateElection(electionId, {
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
        })

        // Show success message
        showAlert('Payment successful! Redirecting...', {
          title: 'Success',
          type: 'success',
          onConfirm: () => {
            router.push(`/dashboard/votes/${electionId}`)
          },
        })
      } else if (status.status === 'failed' || status.status === 'cancelled') {
        setPaymentStatus('failed')
        setProcessing(false)
        showAlert(status.message || 'Payment failed. Please try again.', {
          title: 'Payment Failed',
          type: 'error',
        })
      } else {
        // Still pending, check again
        if (attempts >= maxAttempts) {
          setPaymentStatus('failed')
          setProcessing(false)
          showAlert('Payment verification timeout. Please check your mobile money and refresh the page.', {
            title: 'Timeout',
            type: 'warning',
          })
          return
        }
        setTimeout(checkStatus, 10000) // Check every 10 seconds
      }
    }

    // Start checking after a short delay
    setTimeout(checkStatus, 5000) // First check after 5 seconds
  }

  const isPaymentValid = () => {
    return mobileMoneyDetails.number.length >= 10
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (!election || !invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Election or invoice not found</p>
        <Link href="/dashboard/votes">
          <Button variant="outline">Back to Elections</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href={`/dashboard/votes/${electionId}`} className="text-primary hover:underline text-sm mb-2 inline-block">
          ← Back to Election
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
        <p className="mt-1 text-sm text-gray-600">Pay for your election: {election.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Payment Method Selection */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
            <div className="p-4 bg-primary/5 border-2 border-primary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Mobile Money</p>
                  <p className="text-sm text-gray-600">Pay securely via MTN, Vodafone, or AirtelTigo Mobile Money</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary border-2 border-primary"></div>
              </div>
            </div>
          </Card>

          {/* Payment Details Form */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mobile Money Details</h2>
            
            {paymentMethod === 'mobile_money' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Network
                  </label>
                  <select
                    value={mobileMoneyDetails.network}
                    onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, network: e.target.value as 'MTN' | 'VODAFONE' | 'AIRTELTIGO' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="VODAFONE">Vodafone Cash</option>
                    <option value="AIRTELTIGO">AirtelTigo Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="0244 123 456"
                    value={mobileMoneyDetails.number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setMobileMoneyDetails({ ...mobileMoneyDetails, number: value })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Payment Status */}
          {paymentStatus === 'pending' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mt-0.5"></div>
                <div>
                  <p className="text-sm font-medium text-yellow-900">Payment Initiated</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please check your phone and approve the mobile money payment. We're waiting for confirmation...
                  </p>
                  {bulkClixTransactionId && (
                    <p className="text-xs text-yellow-600 mt-1 font-mono">
                      Transaction ID: {bulkClixTransactionId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {paymentStatus === 'checking' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Verifying Payment</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Checking payment status...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">Secure Payment</p>
                <p className="text-xs text-blue-700 mt-1">
                  Mobile money payments are processed securely via BulkClix. You will receive a prompt on your phone to approve the payment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Election</span>
                <span className="font-medium text-gray-900">{election.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Invoice</span>
                <span className="font-mono text-gray-900">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Platform Fee</span>
                <span className="text-gray-900">{formatCurrency(election.projected_base_cost)}</span>
              </div>
              {election.add_ons_cost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Add-ons</span>
                  <span className="text-gray-900">{formatCurrency(election.add_ons_cost)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total Amount</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(invoice.amount)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Due Date</dt>
                <dd className="text-gray-900">{formatDate(invoice.due_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Billing Model</dt>
                <dd className="text-gray-900 capitalize">{election.billing_model.replace('_', ' ')}</dd>
              </div>
              {election.billing_model === 'post_event' && election.pending_after_event > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Estimated Balance</dt>
                    <dd className="text-gray-900">{formatCurrency(election.pending_after_event)}</dd>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Due after election completion</p>
                </div>
              )}
            </dl>
          </Card>

          <Button
            onClick={handlePayment}
            disabled={!isPaymentValid() || processing}
            className="w-full"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Processing Payment...
              </>
            ) : (
              `Pay ${formatCurrency(invoice.amount)}`
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            By clicking "Pay", you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Alert Dialog */}
      <AlertDialog
        open={alert.open}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        confirmText={alert.confirmText}
        onClose={closeAlert}
        onConfirm={alert.onConfirm}
      />
    </div>
  )
}




