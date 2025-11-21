# BulkClix Integration Setup

## API Key Configuration

The BulkClix API key has been integrated into the application. For security, you should move it to environment variables.

### Current Setup

The API key is currently hardcoded in `lib/bulkclix.ts` as a fallback. This is acceptable for development but should be moved to environment variables for production.

### Recommended Setup

1. **Create `.env.local` file** in the project root:
```env
NEXT_PUBLIC_BULKCLIX_API_KEY=wYijXEZBNaYMOBWP3aSiZb7TFsMZDR5HoxQ15uTn
NEXT_PUBLIC_BULKCLIX_API_URL=https://api.bulkclix.com
```

2. **Add to `.gitignore`** (if not already there):
```
.env.local
.env*.local
```

3. **For Production Deployment** (Vercel, Netlify, etc.):
   - Add the environment variables in your hosting platform's dashboard
   - Never commit `.env.local` to version control

## Integration Status

✅ **Payment Page** (`app/dashboard/payments/[electionId]/page.tsx`)
- Mobile money payments integrated with BulkClix
- Automatic network detection from phone number
- Payment status polling
- Transaction tracking

⏳ **Public Voting Page** (`app/public-vote/[electionId]/page.tsx`)
- Per-vote payments (to be updated)

## Features Implemented

1. **Payment Initiation**
   - Initiates mobile money payment via BulkClix API
   - Supports MTN, Vodafone, and AirtelTigo
   - Auto-detects network from phone number

2. **Payment Status Polling**
   - Automatically checks payment status every 10 seconds
   - Polls for up to 5 minutes
   - Updates invoice and election status on success

3. **Transaction Tracking**
   - Creates payment transaction records in database
   - Stores BulkClix transaction ID
   - Tracks payment metadata (network, phone, etc.)

## Testing

1. **Test Payment Flow**:
   - Go to an election's payment page
   - Select "Mobile Money" payment method
   - Enter a valid Ghana phone number
   - Select network (or let it auto-detect)
   - Click "Pay"
   - Approve payment on your phone
   - Wait for automatic verification

2. **Check Transaction Status**:
   - Payment status will be displayed in real-time
   - Transaction ID will be shown
   - Invoice will be marked as paid automatically

## API Endpoints Used

- `POST /v1/payments/initiate` - Initiate payment
- `GET /v1/payments/{transaction_id}` - Check transaction status
- `GET /v1/payments/verify/{reference}` - Verify payment by reference

## Error Handling

- Network errors are caught and displayed to user
- Payment failures are logged and user is notified
- Timeout after 5 minutes of polling

## Next Steps

1. Move API key to environment variables
2. Set up webhook endpoint for payment callbacks (optional but recommended)
3. Update public voting page to use BulkClix for per-vote payments
4. Add payment retry mechanism
5. Implement payment history/analytics

