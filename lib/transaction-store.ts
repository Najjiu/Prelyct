/**
 * Transaction Store
 * In-memory storage for payment transaction status tracking
 * Essential for serverless environments where API instances are ephemeral
 * 
 * SERVER-ONLY: This module should only be imported in API routes, not in client components
 */

// Server-only module check - only run in actual runtime, not during build/static analysis
// We use a lazy check in the functions themselves to avoid build-time issues

export interface TransactionStatus {
  transaction_id: string
  status: 'pending' | 'success' | 'failed'
  amount?: number              // GHS amount
  amount_usd?: number          // USD amount
  phone_number?: string
  network?: string
  ext_transaction_id?: string
  status_message?: string
  customer_name?: string
  customer_email?: string
  election_id?: string
  updated_at: Date
  webhook_received?: boolean
  bulkclix_transaction_id?: string
}

// In-memory transaction store
const transactionStore = new Map<string, TransactionStatus>()

/**
 * Initialize a transaction in the store
 */
export function initializeTransaction(data: Omit<TransactionStatus, 'updated_at'>): void {
  // Server-only check
  if (typeof window !== 'undefined') {
    throw new Error('initializeTransaction can only be called server-side')
  }
  
  // Ensure cleanup is initialized when first transaction is created
  ensureCleanupInitialized()
  
  const transaction: TransactionStatus = {
    ...data,
    updated_at: new Date(),
  }
  transactionStore.set(data.transaction_id, transaction)
  console.log('💾 Transaction initialized in store:', data.transaction_id)
}

/**
 * Get transaction status from store
 */
export function getTransactionStatus(transactionId: string): TransactionStatus | null {
  // Server-only check
  if (typeof window !== 'undefined') {
    throw new Error('getTransactionStatus can only be called server-side')
  }
  
  return transactionStore.get(transactionId) || null
}

/**
 * Update transaction status
 */
export function updateTransactionStatus(
  transactionId: string,
  updates: Partial<TransactionStatus>
): void {
  // Server-only check
  if (typeof window !== 'undefined') {
    throw new Error('updateTransactionStatus can only be called server-side')
  }
  
  const existing = transactionStore.get(transactionId)
  if (!existing) {
    console.warn('⚠️ Transaction not found in store:', transactionId)
    return
  }

  const updated: TransactionStatus = {
    ...existing,
    ...updates,
    updated_at: new Date(),
  }
  transactionStore.set(transactionId, updated)
  console.log('💾 Transaction store updated:', transactionId, '→', updates.status)
}

/**
 * Clean up old transactions (older than 24 hours)
 */
export function cleanupOldTransactions(): void {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  let cleaned = 0
  const entries = Array.from(transactionStore.entries())
  for (const [id, transaction] of entries) {
    if (transaction.updated_at < oneDayAgo) {
      transactionStore.delete(id)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} old transactions from store`)
  }
}

// Lazy initialization of cleanup interval (server-side only)
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function initializeCleanup(): void {
  // Only initialize in Node.js environment (not in browser or edge runtime)
  // Check for Node.js environment indicators
  const isNodeEnv = typeof window === 'undefined' && 
                    typeof process !== 'undefined' && 
                    process.versions?.node &&
                    typeof setInterval !== 'undefined'
  
  if (isNodeEnv && !cleanupInterval) {
    try {
      cleanupInterval = setInterval(cleanupOldTransactions, 60 * 60 * 1000)
    } catch (error) {
      // Silently fail if setInterval is not available
      console.warn('Could not initialize cleanup interval:', error)
    }
  }
}

// Initialize cleanup when first transaction is created (lazy initialization)
// This avoids module-level execution issues in Next.js
let isInitialized = false
export function ensureCleanupInitialized(): void {
  if (!isInitialized) {
    initializeCleanup()
    isInitialized = true
  }
}

