import { Invoice, Election } from './supabaseClient'

/**
 * Generate a PDF receipt for an invoice
 * This creates a downloadable HTML receipt that can be printed or saved as PDF
 */
export function generateReceiptHTML(invoice: Invoice, election: Election | null): string {
  const formatCurrency = (amount: number) => `₵${amount.toFixed(2)}`
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 40px 20px;
    }
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563eb;
    }
    .header h1 {
      color: #2563eb;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header p {
      color: #6b7280;
      font-size: 14px;
    }
    .receipt-title {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 30px;
      color: #111827;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 6px;
    }
    .info-box h3 {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .info-box p {
      font-size: 16px;
      color: #111827;
      font-weight: 500;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table thead {
      background: #f3f4f6;
    }
    .items-table th {
      padding: 12px;
      text-align: left;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table tbody tr:hover {
      background: #f9fafb;
    }
    .text-right {
      text-align: right;
    }
    .total-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      font-size: 18px;
    }
    .total-row.grand-total {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-top: 10px;
      padding-top: 20px;
      border-top: 2px solid #2563eb;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-paid {
      background: #d1fae5;
      color: #065f46;
    }
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    @media print {
      body {
        padding: 0;
      }
      .receipt-container {
        border: none;
        box-shadow: none;
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h1>Prelyct Votes</h1>
      <p>Secure Digital Voting Platform</p>
    </div>
    
    <div class="receipt-title">Payment Receipt</div>
    
    <div class="info-section">
      <div class="info-box">
        <h3>Receipt Number</h3>
        <p>${invoice.invoice_number}</p>
      </div>
      <div class="info-box">
        <h3>Date</h3>
        <p>${formatDate(invoice.paid_date || invoice.created_at)}</p>
      </div>
      <div class="info-box">
        <h3>Status</h3>
        <p>
          <span class="status-badge status-${invoice.status}">${invoice.status}</span>
        </p>
      </div>
      ${invoice.transaction_id ? `
      <div class="info-box">
        <h3>Transaction ID</h3>
        <p style="font-family: monospace; font-size: 14px;">${invoice.transaction_id}</p>
      </div>
      ` : ''}
    </div>

    ${election ? `
    <div class="info-box" style="margin-bottom: 30px;">
      <h3>Election</h3>
      <p>${election.name}</p>
      ${election.description ? `<p style="font-size: 14px; color: #6b7280; margin-top: 5px;">${election.description}</p>` : ''}
    </div>
    ` : ''}

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Election Platform Fee</strong>
            ${election ? `<br><span style="color: #6b7280; font-size: 14px;">${election.name}</span>` : ''}
          </td>
          <td class="text-right">${formatCurrency(election?.projected_base_cost || invoice.amount)}</td>
        </tr>
        ${election && election.add_ons_cost > 0 ? `
        <tr>
          <td>
            <strong>Add-ons</strong>
            <br><span style="color: #6b7280; font-size: 14px;">Additional services</span>
          </td>
          <td class="text-right">${formatCurrency(election.add_ons_cost)}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row grand-total">
        <span>Total Paid</span>
        <span>${formatCurrency(invoice.amount)}</span>
      </div>
    </div>

    ${invoice.payment_method ? `
    <div class="info-box" style="margin-top: 30px;">
      <h3>Payment Method</h3>
      <p>${invoice.payment_method}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for using Prelyct Votes!</p>
      <p style="margin-top: 10px;">This is an official receipt for your records.</p>
      <p style="margin-top: 5px;">Generated on ${new Date().toLocaleString('en-GB')}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Download receipt as PDF/HTML
 */
export function downloadReceipt(invoice: Invoice, election: Election | null): void {
  const html = generateReceiptHTML(invoice, election)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `receipt-${invoice.invoice_number}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Print receipt
 */
export function printReceipt(invoice: Invoice, election: Election | null): void {
  const html = generateReceiptHTML(invoice, election)
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}

