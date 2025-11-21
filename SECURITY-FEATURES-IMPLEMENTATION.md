# Security & Advanced Features Implementation Guide

This document outlines the implementation of security and advanced features for the Prelyct Vote platform.

## Features Implemented

### 1. ✅ Database Schema (Migration 009)
- **Blockchain audit trail table** - Stores vote hashes on blockchain
- **Encryption keys table** - Manages encryption key versions
- **IP tracking table** - Tracks IP addresses and geolocation
- **White-label settings table** - Custom branding per institution
- **System monitoring table** - Tracks system health metrics
- **Alert rules & alerts tables** - Configurable alert system
- **Custom reports tables** - Report builder functionality
- **WhatsApp integration tables** - WhatsApp Business API integration

### 2. ✅ End-to-End Encryption (`lib/encryption.ts`)
- AES-256-GCM encryption for vote data
- Key derivation using PBKDF2
- Vote hash generation for blockchain
- Vote integrity verification

**Usage:**
```typescript
import { encryptVoteData, decryptVoteData } from '@/lib/encryption'

// Encrypt vote before storing
const encrypted = encryptVoteData({
  electionId: '...',
  positionId: '...',
  candidateId: '...',
})

// Decrypt when needed for counting
const decrypted = decryptVoteData(encrypted)
```

**Environment Variables:**
- `ENCRYPTION_MASTER_KEY` - Master encryption key (REQUIRED in production)

### 3. ✅ IP Tracking & Geolocation (`lib/geolocation.ts`)
- Automatic IP address extraction from requests
- Geolocation lookup (country, region, city, coordinates)
- VPN/Proxy/Tor detection
- Suspicious IP pattern detection

**Usage:**
```typescript
import { getGeolocationFromIP, getClientIP } from '@/lib/geolocation'

const ip = getClientIP(request)
const geo = await getGeolocationFromIP(ip)
```

**Services Used:**
- ipapi.co (free tier: 1000 requests/day)
- For production, consider: ipqualityscore.com, ip2location.com, MaxMind GeoIP2

### 4. ✅ Blockchain Integration (`lib/blockchain.ts`)
- Vote hash generation
- Blockchain transaction storage
- Transaction verification
- Batch hash storage (gas efficient)

**Usage:**
```typescript
import { generateVoteHash, storeVoteHashOnBlockchain } from '@/lib/blockchain'

const hash = generateVoteHash(voteData)
const tx = await storeVoteHashOnBlockchain(hash, electionId, {
  network: 'polygon',
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL,
  contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
})
```

**Environment Variables:**
- `BLOCKCHAIN_RPC_URL` - Blockchain RPC endpoint
- `BLOCKCHAIN_CONTRACT_ADDRESS` - Smart contract address
- `BLOCKCHAIN_PRIVATE_KEY` - Private key for signing transactions

**Supported Networks:**
- Ethereum
- Polygon (recommended - lower gas fees)
- BSC (Binance Smart Chain)
- Local (for testing)

### 5. ✅ WhatsApp Business API (`lib/whatsapp.ts`)
- Send voting links
- Send election reminders
- Send results notifications
- Webhook handling

**Usage:**
```typescript
import { sendVotingLink, sendElectionReminder } from '@/lib/whatsapp'

await sendVotingLink(
  '+233241234567',
  'Election Name',
  'https://...',
  {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  }
)
```

**Environment Variables:**
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp Business API phone number ID
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp Business API access token
- `WHATSAPP_BUSINESS_ACCOUNT_ID` - Business account ID (optional)

**Setup:**
1. Create Facebook Business Account
2. Create WhatsApp Business Account
3. Get API credentials from Meta for Developers
4. Configure webhook URL for message status updates

### 6. ✅ System Monitoring (`lib/monitoring.ts`)
- System health metrics
- Election-specific metrics
- Alert threshold checking
- Performance tracking

**Usage:**
```typescript
import { getSystemHealth, recordMetric, checkAlertThresholds } from '@/lib/monitoring'

// Get overall system health
const health = await getSystemHealth()

// Record a metric
await recordMetric({
  metricType: 'vote_count',
  metricValue: 100,
  status: 'normal',
})

// Check alert thresholds
await checkAlertThresholds(electionId)
```

### 7. ✅ Custom Report Builder (`lib/reportBuilder.ts`)
- Multiple report types (results, analytics, security, financial)
- Custom filters
- Multiple export formats (PDF, Excel, CSV, JSON)
- Column selection
- Sorting and grouping

**Usage:**
```typescript
import { generateReport } from '@/lib/reportBuilder'

const result = await generateReport({
  name: 'Election Results',
  reportType: 'election_results',
  electionId: '...',
  filters: [
    { field: 'status', operator: 'equals', value: 'active' },
  ],
  columns: ['position', 'candidate', 'votes'],
  format: 'pdf',
})
```

**Report Types:**
- `election_results` - Vote counts by position and candidate
- `voter_analytics` - Voter participation analytics
- `security_audit` - Security and fraud detection data
- `financial` - Payment transactions and invoices

### 8. ✅ White-Label Branding (`lib/whiteLabel.ts`)
- Custom organization name
- Custom logo and favicon
- Custom colors (primary, secondary, accent)
- Custom CSS
- Custom domain support
- Custom email branding

**Usage:**
```typescript
import { getWhiteLabelSettings, updateWhiteLabelSettings } from '@/lib/whiteLabel'

// Get settings
const settings = await getWhiteLabelSettings(userId)

// Update settings
await updateWhiteLabelSettings(userId, {
  organizationName: 'My Organization',
  logoUrl: 'https://...',
  primaryColor: '#FF5733',
})
```

## Next Steps

### 1. Update Vote Submission
Update the vote submission endpoints to:
- Encrypt vote data before storing
- Track IP address and geolocation
- Store vote hash on blockchain
- Calculate risk scores

### 2. Create UI Components
- Monitoring dashboard page
- Alert management page
- Report builder UI
- White-label settings page
- WhatsApp integration settings

### 3. API Routes
- `/api/votes/submit` - Enhanced with encryption, geolocation, blockchain
- `/api/monitoring/health` - System health endpoint
- `/api/alerts` - Alert management
- `/api/reports/generate` - Report generation (✅ Created)
- `/api/white-label` - White-label settings
- `/api/whatsapp/webhook` - WhatsApp webhook handler

### 4. Environment Variables
Add to `.env.local`:
```env
# Encryption
ENCRYPTION_MASTER_KEY=your-secure-master-key-here

# Blockchain
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
BLOCKCHAIN_PRIVATE_KEY=0x...

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789

# Geolocation (optional - uses ipapi.co by default)
GEOLOCATION_API_KEY=your-api-key
```

### 5. Run Migration
```sql
-- Run the migration in Supabase SQL Editor
-- File: supabase/migrations/009_security_and_monitoring_features.sql
```

### 6. Install Dependencies
```bash
npm install jspdf jspdf-autotable xlsx
npm install --save-dev @types/xlsx
```

## Security Considerations

1. **Encryption Key Management**
   - Never commit encryption keys to version control
   - Use environment variables or secure key management service (AWS KMS, HashiCorp Vault)
   - Rotate keys periodically

2. **Blockchain Integration**
   - Use testnet for development
   - Consider gas costs (Polygon recommended for lower fees)
   - Implement batch processing for multiple votes

3. **IP Tracking**
   - Respect user privacy
   - Comply with GDPR/data protection regulations
   - Anonymize IP addresses after retention period

4. **WhatsApp Integration**
   - Secure webhook endpoints
   - Verify webhook signatures
   - Handle rate limits

5. **White-Label**
   - Validate custom CSS to prevent XSS
   - Sanitize user inputs
   - Validate custom domains

## Testing

1. **Encryption**: Test encrypt/decrypt with various vote data
2. **Geolocation**: Test with different IP addresses
3. **Blockchain**: Use testnet for testing
4. **WhatsApp**: Use WhatsApp Business API test credentials
5. **Monitoring**: Generate test metrics and alerts
6. **Reports**: Test all report types and formats

## Production Checklist

- [ ] Set `ENCRYPTION_MASTER_KEY` in production environment
- [ ] Configure blockchain RPC URL and contract
- [ ] Set up WhatsApp Business API credentials
- [ ] Configure geolocation API (if using paid service)
- [ ] Set up monitoring alerts
- [ ] Test all features in staging environment
- [ ] Review and update RLS policies
- [ ] Set up backup and disaster recovery
- [ ] Document API endpoints
- [ ] Set up logging and error tracking


