/**
 * End-to-end encryption service for votes
 * Encrypts vote data before storing in database
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 16 bytes for AES
const SALT_LENGTH = 64 // 64 bytes for salt
const TAG_LENGTH = 16 // 16 bytes for GCM tag
const KEY_LENGTH = 32 // 32 bytes for AES-256

/**
 * Derive encryption key from master key and salt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512')
}

/**
 * Get encryption key from environment or use default (for development)
 * In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault)
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-dev-key-change-in-production'
  
  if (key === 'default-dev-key-change-in-production') {
    console.warn('⚠️  Using default encryption key. Set ENCRYPTION_MASTER_KEY in production!')
  }
  
  return key
}

/**
 * Encrypt vote data
 * Returns: { encrypted: string, iv: string, salt: string, tag: string, keyId: string }
 */
export function encryptVoteData(voteData: {
  electionId: string
  positionId: string
  candidateId: string
  voterId?: string
  userPhone?: string
  userEmail?: string
}): {
  encrypted: string
  iv: string
  salt: string
  tag: string
  keyId: string
} {
  try {
    const masterKey = getEncryptionKey()
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)
    const key = deriveKey(masterKey, salt)
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    const plaintext = JSON.stringify(voteData)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex'),
      keyId: 'v1', // Version of encryption key
    }
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt vote data')
  }
}

/**
 * Decrypt vote data
 */
export function decryptVoteData(encryptedData: {
  encrypted: string
  iv: string
  salt: string
  tag: string
  keyId: string
}): {
  electionId: string
  positionId: string
  candidateId: string
  voterId?: string
  userPhone?: string
  userEmail?: string
} {
  try {
    const masterKey = getEncryptionKey()
    const salt = Buffer.from(encryptedData.salt, 'hex')
    const iv = Buffer.from(encryptedData.iv, 'hex')
    const tag = Buffer.from(encryptedData.tag, 'hex')
    const key = deriveKey(masterKey, salt)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt vote data')
  }
}

/**
 * Generate hash for blockchain storage
 */
export function generateVoteHash(voteData: {
  electionId: string
  positionId: string
  candidateId: string
  voterId?: string
  userPhone?: string
  timestamp: string
}): string {
  const dataString = JSON.stringify(voteData)
  return crypto.createHash('sha256').update(dataString).digest('hex')
}

/**
 * Verify vote integrity using hash
 */
export function verifyVoteHash(
  voteData: {
    electionId: string
    positionId: string
    candidateId: string
    voterId?: string
    userPhone?: string
    timestamp: string
  },
  expectedHash: string
): boolean {
  const calculatedHash = generateVoteHash(voteData)
  return calculatedHash === expectedHash
}


