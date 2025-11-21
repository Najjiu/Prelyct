/**
 * Enhanced vote submission with security features
 * Integrates encryption, geolocation, blockchain, and monitoring
 */

import { encryptVoteData, generateVoteHash } from './encryption'
import { getGeolocationFromIP, getClientIP } from './geolocation'
import { storeVoteHashOnBlockchain } from './blockchain'
import { recordMetric, checkAlertThresholds } from './monitoring'
import { supabase } from './supabaseClient'

export interface EnhancedVoteData {
  electionId: string
  positionId: string
  candidateId: string
  voterId?: string
  userPhone?: string
  userEmail?: string
  paymentTransactionId?: string
  request: Request | { headers: Headers | { get: (key: string) => string | null } }
}

/**
 * Submit vote with enhanced security features
 */
export async function submitVoteWithSecurity(voteData: EnhancedVoteData): Promise<{
  voteId: string
  blockchainHash?: string
  blockchainTxId?: string
  riskScore: number
}> {
  const startTime = Date.now()
  
  try {
    // 1. Get IP address and geolocation
    const ipAddress = getClientIP(voteData.request)
    const geolocation = await getGeolocationFromIP(ipAddress)
    
    // 2. Encrypt vote data
    const encryptedData = encryptVoteData({
      electionId: voteData.electionId,
      positionId: voteData.positionId,
      candidateId: voteData.candidateId,
      voterId: voteData.voterId,
      userPhone: voteData.userPhone,
      userEmail: voteData.userEmail,
    })
    
    // 3. Generate vote hash for blockchain
    const timestamp = new Date().toISOString()
    const voteHash = generateVoteHash({
      electionId: voteData.electionId,
      positionId: voteData.positionId,
      candidateId: voteData.candidateId,
      voterId: voteData.voterId,
      userPhone: voteData.userPhone,
      timestamp,
      encryptedData: encryptedData.encrypted,
    })
    
    // 4. Store vote in database with security data
    const voteRecord: any = {
      election_id: voteData.electionId,
      position_id: voteData.positionId,
      candidate_id: voteData.candidateId,
      voter_id: voteData.voterId || null,
      user_phone: voteData.userPhone || null,
      user_email: voteData.userEmail || null,
      payment_transaction_id: voteData.paymentTransactionId || null,
      ip_address: ipAddress,
      geolocation_country: geolocation.country,
      geolocation_region: geolocation.region,
      geolocation_city: geolocation.city,
      geolocation_lat: geolocation.lat,
      geolocation_lng: geolocation.lng,
      encrypted_vote_data: JSON.stringify(encryptedData),
      encryption_key_id: encryptedData.keyId,
      blockchain_hash: voteHash,
      // Risk score will be calculated by database trigger
    }
    
    // Get user agent from request
    const headers = 'headers' in voteData.request ? voteData.request.headers : voteData.request
    const userAgent = headers.get('user-agent') || null
    if (userAgent) {
      voteRecord.user_agent = userAgent
    }
    
    const { data: insertedVote, error: insertError } = await supabase
      .from('votes')
      .insert(voteRecord)
      .select()
      .single()
    
    if (insertError || !insertedVote) {
      throw new Error('Failed to submit vote: ' + (insertError?.message || 'Unknown error'))
    }
    
    // 5. Store vote hash on blockchain (async, don't block vote submission)
    let blockchainTxId: string | undefined
    let blockchainNetwork: string | undefined
    
    try {
      const blockchainConfig = {
        network: (process.env.BLOCKCHAIN_NETWORK as 'ethereum' | 'polygon' | 'bsc') || 'polygon',
        rpcUrl: process.env.BLOCKCHAIN_RPC_URL,
        contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
        privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
      }
      
      if (blockchainConfig.rpcUrl) {
        const blockchainTx = await storeVoteHashOnBlockchain(
          voteHash,
          voteData.electionId,
          blockchainConfig
        )
        
        blockchainTxId = blockchainTx.transactionId
        blockchainNetwork = blockchainConfig.network
        
        // Update vote with blockchain transaction ID
        await supabase
          .from('votes')
          .update({
            blockchain_tx_id: blockchainTxId,
            blockchain_network: blockchainNetwork,
            blockchain_timestamp: new Date().toISOString(),
          })
          .eq('id', insertedVote.id)
        
        // Store in blockchain audit log
        await supabase
          .from('blockchain_audit_log')
          .insert({
            vote_id: insertedVote.id,
            election_id: voteData.electionId,
            hash: voteHash,
            transaction_id: blockchainTxId,
            network: blockchainNetwork,
            status: blockchainTx.status,
          })
      }
    } catch (blockchainError) {
      console.error('Blockchain storage failed (non-critical):', blockchainError)
      // Don't fail vote submission if blockchain storage fails
    }
    
    // 6. Record monitoring metrics
    const responseTime = Date.now() - startTime
    await recordMetric({
      electionId: voteData.electionId,
      metricType: 'vote_count',
      metricValue: 1,
      status: 'normal',
    })
    
    await recordMetric({
      electionId: voteData.electionId,
      metricType: 'response_time',
      metricValue: responseTime,
      status: responseTime > 2000 ? 'warning' : 'normal',
    })
    
    // 7. Check alert thresholds
    await checkAlertThresholds(voteData.electionId)
    
    // 8. Get final vote record with risk score
    const { data: finalVote } = await supabase
      .from('votes')
      .select('risk_score, flagged')
      .eq('id', insertedVote.id)
      .single()
    
    return {
      voteId: insertedVote.id,
      blockchainHash: voteHash,
      blockchainTxId,
      riskScore: finalVote?.risk_score || 0,
    }
  } catch (error: any) {
    // Record error metric
    await recordMetric({
      electionId: voteData.electionId,
      metricType: 'error_rate',
      metricValue: 1,
      status: 'critical',
      message: error.message,
    })
    
    throw error
  }
}

/**
 * Submit multiple votes (for institutional elections)
 */
export async function submitMultipleVotesWithSecurity(
  electionId: string,
  voterId: string,
  votes: { positionId: string; candidateId: string }[],
  request: Request | { headers: Headers | { get: (key: string) => string | null } }
): Promise<{
  voteIds: string[]
  blockchainHashes: string[]
  riskScore: number
}> {
  const voteIds: string[] = []
  const blockchainHashes: string[] = []
  let maxRiskScore = 0
  
  for (const vote of votes) {
    const result = await submitVoteWithSecurity({
      electionId,
      positionId: vote.positionId,
      candidateId: vote.candidateId,
      voterId,
      request,
    })
    
    voteIds.push(result.voteId)
    if (result.blockchainHash) {
      blockchainHashes.push(result.blockchainHash)
    }
    maxRiskScore = Math.max(maxRiskScore, result.riskScore)
  }
  
  return {
    voteIds,
    blockchainHashes,
    riskScore: maxRiskScore,
  }
}


