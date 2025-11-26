# How Voters Pay for Votes via Mobile Money in Ghana

## Overview

Prelyct Votes supports per-vote payments through mobile money integration with **BulkClix**, allowing voters to pay using MTN, Vodafone, or AirtelTigo mobile money directly during the voting process.

## How It Works

### 1. **Voter Experience Flow**

When a public election has `cost_per_vote` enabled:

1. **Voter visits the public vote page** (`/public-vote/[electionId]`)
2. **Selects candidate(s) and number of votes** they want to cast
3. **System calculates total cost** = `cost_per_vote × number_of_votes`
4. **Voter enters mobile money details**:
   - Phone number (MTN, Vodafone, or AirtelTigo)
   - Mobile money network (MTN/VODAFONE/AIRTELTIGO)
5. **Clicks "Vote" button** → Payment process initiates

### 2. **Payment Processing**

**Step 1: Transaction Creation**
- System creates a `payment_transaction` record in the database
- Transaction ID is generated for tracking

**Step 2: BulkClix API Call**
- System calls `/api/payments/initiate` (internal API route)
- API route formats phone number for BulkClix (ensures proper format)
- Sends payment request to BulkClix API with:
  - Amount (total cost)
  - Phone number (formatted)
  - Network channel (MTN/Vodafone/Airtel)
  - Client reference (unique transaction ID)
  - Account name

**Step 3: Payment Request Sent to Voter**
- BulkClix sends a mobile money request to the voter's phone
- Voter receives a prompt on their mobile money app
- Voter approves the payment on their phone

**Step 4: Payment Verification**
- System polls BulkClix API or receives webhook callback
- Payment status is checked: `pending`, `completed`, or `failed`
- Transaction status updated in database

**Step 5: Vote Recording**
- Once payment is confirmed as `completed`:
  - Vote(s) are recorded in the database
  - Voter sees success message
  - Vote count is updated in real-time

### 3. **Technical Implementation**

#### BulkClix Integration
- **API Key**: Stored in environment variables (`NEXT_PUBLIC_BULKCLIX_API_KEY`)
- **API Endpoint**: `https://api.bulkclix.com/api/v1/payment-api/send/mobilemoney`
- **Authentication**: API key sent in `x-api-key` header
- **Payment Channels**: MTN, Vodafone, Airtel (AirtelTigo)

#### Phone Number Formatting
- Phone numbers are automatically formatted for BulkClix
- Example: `0244123456` → BulkClix accepts without leading `0` or with country code
- Format: `233XXXXXXXXX` (Ghana country code + number)

#### Transaction Tracking
- Each payment has a unique `client_reference` format: `PRELYCT-{transaction_id}-{timestamp}`
- Allows BulkClix to send webhooks back to our system
- Webhook endpoint: `/api/payments/bulkclix-webhook`

#### Payment States
1. **initiating**: Payment request being sent to BulkClix
2. **pending**: Voter has received payment prompt, awaiting approval
3. **completed**: Payment successful, vote recorded
4. **failed**: Payment declined or error occurred

### 4. **User Interface Elements**

**Payment Form Fields:**
- Mobile Money Network dropdown (MTN/Vodafone/AirtelTigo)
- Phone Number input (validated for Ghana numbers)
- Vote count selector
- Total cost display (updates dynamically)

**Payment Status Indicators:**
- "Initiating payment..." → Request being sent
- "Sending payment request..." → Waiting for BulkClix
- "Please approve payment on your phone" → Voter action needed
- "Payment successful! Vote recorded." → Completion
- Error messages for failed payments

### 5. **Security & Validation**

- **Phone Number Validation**: Must be valid Ghana mobile number (10 digits)
- **Network Matching**: Phone number prefix validated against selected network
- **Transaction Deduplication**: Unique transaction IDs prevent double payments
- **Payment Verification**: System verifies payment before recording vote
- **Error Handling**: Clear error messages for payment failures

### 6. **Payment Failure Scenarios**

Common reasons for payment failures:
- Voter declines payment on their phone
- Insufficient mobile money balance
- Network issues or timeout
- Invalid phone number format
- BulkClix API issues

**Error Handling:**
- User-friendly error messages displayed
- Transaction marked as `failed` in database
- Voter can retry payment
- Admin dashboard shows failed transactions

### 7. **Admin Monitoring**

Election administrators can:
- View all payment transactions for an election
- See payment status (pending/completed/failed)
- Track revenue from per-vote payments
- Export payment reports
- Manually verify disputed payments

### 8. **Revenue Model**

- **Per-Vote Pricing**: Set by election admin (e.g., GHS 2 per vote)
- **BulkClix Fees**: Transaction fees deducted by BulkClix (typically 1-3%)
- **Net Revenue**: Total payments minus BulkClix fees
- **Settlement**: Payments settled to BulkClix merchant account

## Benefits

1. **Accessibility**: Most Ghanaians have mobile money accounts
2. **Convenience**: No need for bank accounts or cards
3. **Real-time Processing**: Instant payment and vote recording
4. **Transparency**: All transactions tracked and verifiable
5. **Security**: BulkClix handles secure payment processing
6. **Scalability**: Can handle thousands of concurrent payments

## Current Status

✅ **Fully Implemented**: The mobile money payment system is integrated and functional
✅ **BulkClix API Connected**: API key configured and tested
✅ **Multi-Network Support**: MTN, Vodafone, and AirtelTigo supported
✅ **Webhook Integration**: Payment callbacks handled automatically
✅ **Error Handling**: Comprehensive error messages and retry logic

## Future Enhancements

- **USSD Payment Option**: Allow payments via USSD codes
- **Payment Plans**: Installment payments for expensive votes
- **Promo Codes**: Discount codes for voters
- **Payment Analytics**: Advanced reporting and insights
- **Refund System**: Handle refunds for disputed votes

