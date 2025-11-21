import Card from './Card'
import Badge from './Badge'
import Button from './Button'
import { type Invoice } from '@/lib/supabaseClient'

type InvoiceCardProps = {
  invoice: Invoice
  onPay?: () => void
}

export default function InvoiceCard({ invoice, onPay }: InvoiceCardProps) {
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

  const formatCurrency = (amount: number) => {
    return `₵${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Invoice {invoice.invoice_number}</h3>
            <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Amount: <span className="font-semibold text-gray-900">{formatCurrency(invoice.amount)}</span></p>
            <p>Due date: {formatDate(invoice.due_date)}</p>
            {invoice.paid_date && (
              <p>Paid on: {formatDate(invoice.paid_date)}</p>
            )}
          </div>
        </div>
        {invoice.status === 'pending' && onPay && (
          <Button onClick={onPay} size="sm">
            Pay Now
          </Button>
        )}
      </div>
    </Card>
  )
}




