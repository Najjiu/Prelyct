# Payment System Documentation

## Overview

This document describes the BulkClix mobile money payment integration for Prelyct Votes. The system allows public voters to pay for votes using mobile money (MTN, Vodafone, AirtelTigo) in Ghana. This implementation follows best practices from proven payment integrations, using a database-driven approach with BulkClix API fallback.

## Architecture

The payment system uses a hybrid approach for maximum reliability:

1. **Payment Initiation** - Creates database transaction and calls BulkClix API
2. **Status Polling** - Frontend polls status endpoint which checks:
   - Database first (updated by webhook - most reliable)
   - BulkClix API as fallback
3. **Webhook Handler** - BulkClix sends real-time updates to update database
4. **Database** - Primary source of truth for transaction status

## Payment Flow

```
1. User fills payment form
   ↓
2. Frontend creates database transaction
   ↓
3. POST /api/payments/initiate
   - Validates payment details
   - Calls BulkClix API
   - Returns transaction ID
   ↓
4. User approves payment on phone
   ↓
5. Frontend polls GET /api/payments/status
   - Checks database for transaction status
   - Continues polling until payment completes
   ↓
6. BulkClix webhook → POST /api/payments/bulkclix-webhook
   - Updates database transaction status
   ↓
7. Next poll detects completed status
   - Vote is automatically submitted
   - Success message displayed
```

## API Endpoints

### 1. Initiate Payment

**Endpoint:** `POST /api/payments/initiate`

**Request Body:**
```json
{
  "amount": "1.00",
  "account_number": "0501234567",
  "channel": "MTN",
  "account_name": "Voter",
  "client_reference": "PRELYCT-{transactionId}-{timestamp}"
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "bulkclix-transaction-id",
  "client_reference": "PRELYCT-xxx-timestamp",
  "message": "Payment initiated. Please check your phone for the prompt."
}
```

### 2. Check Payment Status

**Endpoint:** `GET /api/payments/status?transaction_id={id}`

**Status Check Priority:**
1. **First:** Database (updated by webhook - most reliable)
2. **Second:** BulkClix API (fallback if database doesn't have final status)

**Response:**
```json
{
  "status": "pending" | "success" | "failed",
  "transaction_id": "xxx",
  "amount": "1.00",
  "phone_number": "0501234567",
  "network": "MTN",
  "ext_transaction_id": "bulkclix-id",
  "source": "database" | "api" | "default",
  "message": "Payment is being processed",
  "updated_at": "2024-01-01T12:00:00.000Z"
}
```

### 3. Webhook Handler

**Endpoint:** `POST /api/payments/bulkclix-webhook`

**Webhook Payload (from BulkClix):**
```json
{
  "amount": "1.00",
  "status": "success",
  "transaction_id": "bulkclix-id",
  "ext_transaction_id": "PRELYCT-xxx-timestamp",
  "phone_number": "0501234567"
}
```

## Frontend Implementation

### Public Voting Page

Location: `app/public-vote/[electionId]/page.tsx`

**Payment Flow:**
1. User selects candidate and vote count
2. User enters phone number and selects network
3. Payment transaction created in database
4. Payment initiated via API
5. Polling starts (every 3 seconds initially, then every 2 seconds)
6. On payment success, vote is automatically submitted

**Polling Configuration:**
- Initial delay: 3 seconds
- First 30 seconds: Check every 3 seconds
- After 30 seconds: Check every 2 seconds
- Maximum attempts: 120 (10 minutes total)

## Database Schema

### Payment Transactions Table

Transactions are stored in the `payment_transactions` table:

- `id` - UUID (primary key)
- `election_id` - UUID (foreign key)
- `amount` - DECIMAL (GHS)
- `currency` - VARCHAR (default: 'GHS')
- `status` - VARCHAR ('pending', 'processing', 'completed', 'failed', 'refunded')
- `payment_provider` - VARCHAR ('bulkclix')
- `provider_transaction_id` - VARCHAR (BulkClix transaction ID)
- `metadata` - JSONB (additional payment data)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

## Environment Variables

Required environment variables:

```env
# BulkClix API Configuration
NEXT_PUBLIC_BULKCLIX_API_KEY=your_bulkclix_api_key_here

# Site URL (for webhook callback)
NEXT_PUBLIC_SITE_URL=https://www.prelyct.com
# OR use VERCEL_URL if deploying on Vercel
```

## Configuration

### BulkClix Setup

1. **Get API Key** - Obtain from BulkClix dashboard
2. **Whitelist IP** - Add your server IP address in BulkClix dashboard
3. **Enable Mobile Money Collection** - Ensure MoMo collection is enabled
4. **Set Webhook URL** - Configure webhook URL in BulkClix dashboard:
   ```
   https://your-domain.com/api/payments/bulkclix-webhook
   ```

### Disable Payments (Development)

To disable payments during development:

```env
NEXT_PUBLIC_BULKCLIX_DISABLED=true
```

When disabled, votes are recorded immediately without payment.

## Error Handling

### Common Errors

1. **Missing Required Fields**
   - Error: 400 Bad Request
   - Fix: Ensure all required fields are provided

2. **BulkClix API Errors**
   - Error: 400/403
   - Common causes:
     - IP not whitelisted
     - Mobile money collection not enabled
     - Invalid API key
   - Fix: Check BulkClix dashboard configuration

3. **Payment Timeout**
   - User hasn't approved payment within 10 minutes
   - Payment may still process in background
   - Check database manually if needed

## Testing

### Test Payment Flow

1. Create a public contest election
2. Set cost per vote (e.g., 0.50 GHS)
3. Share public voting link
4. Select candidate and vote count
5. Enter test phone number
6. Approve payment prompt on phone
7. Verify vote is recorded after payment

### Test Without Payment

Set `NEXT_PUBLIC_BULKCLIX_DISABLED=true` to test voting flow without actual payment processing.

## Troubleshooting

### Payment Not Initiating

- Check API key is set correctly
- Verify server IP is whitelisted in BulkClix
- Check browser console for errors
- Verify all required fields are provided

### Payment Stuck on Pending

- Check if user approved payment on phone
- Verify webhook URL is configured in BulkClix
- Check server logs for webhook delivery
- Manually check transaction status in database

### Webhook Not Received

- Verify webhook URL is accessible
- Check BulkClix dashboard for webhook delivery status
- Ensure webhook URL matches: `{SITE_URL}/api/payments/bulkclix-webhook`
- Check server logs for incoming requests

## Files Structure

```
app/api/payments/
├── initiate/
│   └── route.ts          # Payment initiation endpoint
├── status/
│   └── route.ts          # Payment status check endpoint
└── bulkclix-webhook/
    └── route.ts          # Webhook handler

lib/
└── bulkclix.ts           # BulkClix API integration

app/public-vote/[electionId]/
└── page.tsx              # Public voting page with payment flow
```

## Security Considerations

1. **API Key Protection** - Stored in environment variables
2. **Server-Side Validation** - All payment logic on server
3. **Database Transactions** - Atomic operations for vote recording
4. **Webhook Validation** - Future: Add signature verification
5. **Rate Limiting** - Consider adding rate limits for payment endpoints

## Future Enhancements

1. Webhook signature verification
2. Payment retry mechanism
3. Refund functionality
4. Payment analytics dashboard
5. Multiple payment methods (cards, bank transfers)
6. Payment notifications via email/SMS

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify BulkClix dashboard configuration
- Test with payment disabled first to isolate issues

---

**Last Updated:** January 2025
**Maintained By:** Prelyct Development Team

