# Dual-Mode Voting System Implementation

## Overview
Prelyct Votes now supports two voting modes:
1. **Institutional Elections** - One-person-one-vote, secure mode (existing)
2. **Public Contests** - Pay-per-vote, multiple votes allowed (new)

## What's Been Implemented

### 1. Database Schema (`004_add_dual_mode_voting.sql`)
- Added `mode` field to elections table (`institutional` | `public_contest`)
- Added `cost_per_vote` for public contests
- Added `max_votes_per_user` (null = unlimited)
- Added `requires_voter_registration`, `payment_required`, `public_voting_enabled` flags
- Updated votes table to support public contest voting:
  - Made `voter_id` nullable (public contests don't require voter registration)
  - Added `user_phone`, `user_email`, `payment_transaction_id`, `vote_cost` fields
- Added RLS policies for public contest access
- Added trigger to enforce vote limits

### 2. Election Creation Form (`app/dashboard/votes/new/page.tsx`)
- Mode selection (Institutional vs Public Contest)
- Public contest specific fields:
  - Cost per vote (GHS)
  - Max votes per user (optional, unlimited if blank)
- Conditional pricing display (only for institutional elections)
- Automatic defaults based on mode

### 3. Public Voting Page (`app/public-vote/[electionId]/page.tsx`)
- Public access (no authentication required)
- Candidate selection
- Vote count selector (1, 5, 10, or custom)
- Phone number and email collection
- Payment method selection (Mobile Money / Card)
- Real-time vote count display
- Payment processing integration

### 4. Database Client Functions (`lib/supabaseClient.ts`)
- `createElection()` - Updated to handle both modes
- `submitPublicVote()` - Submit votes for public contests
- `getPublicElectionResults()` - Get vote counts for public contests
- `getPublicContest()` - Get public contest data

### 5. Election Detail Page (`app/dashboard/votes/[id]/page.tsx`)
- Shows election mode badge
- Displays appropriate voting link based on mode:
  - Institutional: `/vote?electionId={id}` (requires voter ID)
  - Public Contest: `/public-vote/{id}` (public access)
- Shows cost per vote for public contests

## How It Works

### Institutional Elections (Existing)
1. Admin creates election in "Institutional" mode
2. Admin imports voter list
3. Voters enter their student ID on access page
4. System verifies and grants one-time access
5. Voter casts one vote
6. Access token marked as used

### Public Contests (New)
1. Admin creates election in "Public Contest" mode
2. Admin sets cost per vote (e.g., GHS 0.50)
3. Admin sets max votes per user (optional)
4. Admin adds candidates/contestants
5. Admin shares public voting link
6. Users visit public link (no authentication)
7. Users select candidate and number of votes
8. Users enter phone number and payment details
9. Payment processed (Mobile Money or Card)
10. Votes recorded immediately
11. Users can vote again (if within limits)

## Payment Flow

### Public Contest Payment
1. User selects candidate and vote count
2. System calculates total cost (cost_per_vote × vote_count)
3. User enters phone number and payment method
4. Payment transaction created
5. Payment processed (currently simulated, ready for Stripe/Paystack)
6. On success:
   - Votes recorded in database
   - Payment transaction marked as completed
   - Vote counts updated in real-time

## Database Changes

### Elections Table
```sql
mode: 'institutional' | 'public_contest'
cost_per_vote: DECIMAL (for public contests)
max_votes_per_user: INTEGER (null = unlimited)
requires_voter_registration: BOOLEAN
payment_required: BOOLEAN
public_voting_enabled: BOOLEAN
```

### Votes Table
```sql
voter_id: UUID (nullable for public contests)
user_phone: TEXT (for public contests)
user_email: TEXT (for public contests)
payment_transaction_id: UUID
vote_cost: DECIMAL
user_ip: TEXT
user_agent: TEXT
```

## Next Steps

1. **Run Migration**: Execute `004_add_dual_mode_voting.sql` in Supabase SQL Editor

2. **Payment Integration**: 
   - Integrate Stripe or Paystack SDK
   - Update `app/public-vote/[electionId]/page.tsx` payment processing
   - Set up webhook endpoints

3. **Testing**:
   - Create a public contest election
   - Test public voting flow
   - Test payment processing
   - Verify vote limits work correctly

4. **Features to Add**:
   - Real-time vote count updates (WebSocket or polling)
   - Vote analytics dashboard
   - Revenue tracking for public contests
   - SMS/Email notifications for public contests

## Usage Examples

### Creating a Public Contest
1. Go to `/dashboard/votes/new`
2. Select "Public Contest" mode
3. Enter contest name: "Ghana's Got Talent 2025"
4. Set cost per vote: 0.50 GHS
5. Set max votes per user: 10 (or leave blank for unlimited)
6. Add candidates/contestants
7. Share public voting link: `/public-vote/{electionId}`

### Creating an Institutional Election
1. Go to `/dashboard/votes/new`
2. Select "Institutional Election" mode
3. Enter election details
4. Set expected voters
5. Choose pricing tier
6. Import voter list
7. Share voting link: `/vote?electionId={id}`

## Security Features

### Public Contests
- Payment verification prevents fake votes
- Phone number tracking (optional)
- Vote limits per user (configurable)
- IP tracking (optional)
- Rate limiting (to be implemented)

### Institutional Elections
- Voter ID verification
- Access token system
- One vote per voter
- Audit trail
- Results transparency

## Revenue Model

### Public Contests
- Platform commission: 5-10% per vote
- Payment gateway fees: 2-3% (passed to organizer)
- Example: 10,000 votes × GHS 0.50 = GHS 5,000
  - Platform: GHS 500 (10%)
  - Organizer: GHS 4,500

### Institutional Elections
- Platform subscription: Current pricing model
- Per-election fee: Based on voter count
- Add-ons: SMS, audit reports, etc.




