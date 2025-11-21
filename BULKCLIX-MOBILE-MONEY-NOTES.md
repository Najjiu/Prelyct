# BulkClix Mobile Money Integration Notes

## Current Implementation

The payment system has been configured to use **Mobile Money only** via BulkClix API.

## API Configuration

- **API Key**: `wYijXEZBNaYMOBWP3aSiZb7TFsMZDR5HoxQ15uTn`
- **Base URL**: `https://api.bulkclix.com`
- **Authentication**: `x-api-key` header (not Bearer token)

## API Endpoints Used

### 1. Initiate Mobile Money Payment
- **Endpoint**: `/api/v1/payment-api/send/momo` (assumed - needs verification)
- **Method**: POST
- **Headers**: 
  - `x-api-key: {API_KEY}`
  - `Content-Type: application/json`
  - `Accept: application/json`

**Payload Format** (current implementation):
```json
{
  "amount": 100.00,
  "currency": "GHS",
  "phone": "0244123456",
  "network": "MTN",
  "description": "Payment for election: Election Name",
  "reference": "INV-12345",
  "callback_url": "https://yourdomain.com/api/payments/callback"
}
```

### 2. Check Transaction Status
- **Endpoint**: `/api/v1/payment-api/transaction/{transactionId}` (assumed - needs verification)
- **Method**: GET
- **Headers**: 
  - `x-api-key: {API_KEY}`
  - `Accept: application/json`

### 3. Verify Payment
- **Endpoint**: `/api/v1/payment-api/verify/{reference}` (assumed - needs verification)
- **Method**: GET
- **Headers**: 
  - `x-api-key: {API_KEY}`
  - `Accept: application/json`

## ⚠️ Important Notes

1. **API Endpoint Verification Needed**: The mobile money endpoints above are **assumed** based on the bank transfer documentation pattern. The actual endpoints may differ. Please verify with BulkClix documentation:
   - Actual mobile money payment endpoint
   - Actual transaction status endpoint
   - Actual verification endpoint

2. **Payload Format**: The payload format may need adjustment based on BulkClix's actual mobile money API requirements. The current format is based on common patterns but should be verified.

3. **Response Format**: The response handling assumes certain fields (`transaction_id`, `status`, `message`, etc.). These may need adjustment based on actual API responses.

4. **Network Detection**: The system auto-detects network (MTN, Vodafone, AirtelTigo) from phone number prefixes, but users can also manually select.

## Testing Checklist

- [ ] Verify mobile money payment endpoint URL
- [ ] Verify payload format matches BulkClix requirements
- [ ] Test payment initiation with real phone numbers
- [ ] Verify transaction status checking works
- [ ] Test payment verification endpoint
- [ ] Verify callback URL handling (if implemented)
- [ ] Test with all three networks (MTN, Vodafone, AirtelTigo)

## Files Modified

- `lib/bulkclix.ts` - BulkClix API integration
- `app/dashboard/payments/[electionId]/page.tsx` - Payment page (mobile money only)
- `app/public-vote/[electionId]/page.tsx` - Public voting page (mobile money only)

## Next Steps

1. Get official BulkClix mobile money API documentation
2. Verify and update endpoints if needed
3. Test with real transactions
4. Adjust payload/response handling based on actual API behavior

