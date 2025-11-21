# Voter One-Time Access Setup

## Overview
This system ensures that voters can only access the voting link once. Once a voter has accessed the voting page, their access token is marked as used and they cannot access it again.

## Database Changes

### Migration: `003_add_voter_access_tokens.sql`
This migration adds:
- `access_token` - Unique token for each voter
- `access_token_used` - Boolean flag to track if token has been used
- `access_token_used_at` - Timestamp when token was used
- Function to generate unique access tokens
- Indexes for faster lookups

## How It Works

### 1. Voter Registration
When a voter is added to the system (by admin importing voters), they automatically get:
- A unique `access_token` generated
- `access_token_used` set to `false`
- `has_voted` set to `false`

### 2. Access Verification
When a voter tries to access the voting page:
1. They enter their voter ID on the access page
2. System verifies:
   - Voter exists in the database
   - Election is active
   - Voter hasn't already voted (`has_voted = false`)
   - Access token hasn't been used (`access_token_used = false`)
3. If all checks pass, voter is redirected to voting page
4. Voter session is stored in `sessionStorage`

### 3. Voting Process
When voter submits their vote:
1. System verifies access again (prevents race conditions)
2. Marks `access_token_used = true`
3. Records `access_token_used_at` timestamp
4. Saves votes to database
5. Marks `has_voted = true`
6. Clears session storage

### 4. Subsequent Access Attempts
If a voter tries to access again:
- They'll see an error: "Your voting access has already been used"
- They cannot access the voting page again
- Even if they try to vote again, the system will reject it

## Security Features

1. **Session Storage**: Uses `sessionStorage` instead of `localStorage` for better security
2. **Double Verification**: Checks access token status both on page load and before voting
3. **Database Constraints**: Database enforces one vote per voter per election
4. **Race Condition Prevention**: Checks token status immediately before marking as used

## Setup Instructions

1. **Run the Migration**:
   ```sql
   -- Run this in Supabase SQL Editor
   -- File: supabase/migrations/003_add_voter_access_tokens.sql
   ```

2. **Update Voter Import**:
   When importing voters, the system will automatically generate access tokens for new voters.

3. **Test the Flow**:
   - Create a test election
   - Add test voters
   - Try to access voting page with voter ID
   - Submit a vote
   - Try to access again - should be blocked

## API Functions

### `verifyVoterAccess(electionId, voterIdentifier, accessCode?)`
- Verifies voter can access the voting page
- Checks if voter exists, hasn't voted, and token hasn't been used
- Returns voter and election data if valid

### `getElectionForVoting(electionId)`
- Gets election data with positions and candidates
- Only returns data for active elections

### `submitVote(electionId, voterId, votes)`
- Submits votes to database
- Marks access token as used
- Marks voter as having voted
- Prevents duplicate votes

## Error Messages

- **"You have already voted in this election"** - Voter has already submitted votes
- **"Your voting access has already been used"** - Access token was already used
- **"Invalid voter ID or election not found"** - Voter doesn't exist or election is inactive
- **"Voter session expired"** - Session storage was cleared or expired

## Testing

1. **Test Single Access**:
   - Access voting page with valid voter ID
   - Submit vote
   - Try to access again - should be blocked

2. **Test Multiple Tabs**:
   - Open voting page in two tabs
   - Submit vote in one tab
   - Try to submit in second tab - should be blocked

3. **Test Invalid Access**:
   - Try to access with invalid voter ID - should be rejected
   - Try to access after voting - should be rejected

## Notes

- Access tokens are generated automatically when voters are added
- Tokens are unique and cryptographically secure
- Once a token is used, it cannot be reused
- Voters can only vote once per election
- Session storage is cleared after voting to prevent reuse




