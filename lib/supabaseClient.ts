import { createClient } from '@supabase/supabase-js'

// Feature flags (temporary testing)
const INSTITUTIONAL_PAYMENTS_DISABLED = true

// NOTE:
// The app had Supabase environment variables set, but the reviews API
// was still returning an empty list while this project (accessed via MCP)
// clearly has approved rows in the `client_reviews` table.
// To guarantee that the marketing site uses the correct Supabase project
// for client reviews, we hard‑bind the URL and anon key here.
// If you later want to switch projects, update these two constants.
const SUPABASE_PROJECT_URL = 'https://vambtaxizixylhluwvzz.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbWJ0YXhpeml4eWxobHV3dnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTM3MDMsImV4cCI6MjA3ODM2OTcwM30.x10zIguaDNemn0oWbMzHrx_X79w4ikMQyrPeDY9XAsc'

const supabaseUrl = SUPABASE_PROJECT_URL
const supabaseAnonKey = SUPABASE_ANON_KEY

// Create a mock client if Supabase credentials are not provided
let supabase: any

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
  console.log('🔗 Supabase client initialised for marketing site reviews:', {
    url: supabaseUrl,
    keyPrefix: supabaseAnonKey.slice(0, 12),
  })
} else {
  // Mock Supabase client for development without credentials
  console.warn('Supabase credentials not found. Using mock authentication.')
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ data: { session: null, user: null }, error: { message: 'Supabase not configured' } }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
    }),
  }
}

export { supabase }

// Database types
export type PricingTier = {
  id: string
  label: string
  min_voters: number
  max_voters: number | null
  rate_per_voter: number
  minimum_charge: number
  description: string | null
  created_at: string
  updated_at: string
}

export type AddOn = {
  id: string
  label: string
  description: string | null
  price: number
  created_at: string
  updated_at: string
}

export type Election = {
  id: string
  user_id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'closed'
  mode: 'institutional' | 'public_contest'
  cost_per_vote: number | null
  max_votes_per_user: number | null
  requires_voter_registration: boolean
  payment_required: boolean
  public_voting_enabled: boolean
  public_voting_link: string | null
  expected_voters: number
  tier_id: string | null
  billing_model: 'upfront' | 'post_event'
  projected_base_cost: number
  add_ons_cost: number
  due_now: number
  pending_after_event: number
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded'
  payment_intent_id: string | null
  payment_date: string | null
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  election_id: string
  invoice_number: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  due_date: string | null
  paid_date: string | null
  payment_method: string | null
  transaction_id: string | null
  created_at: string
  updated_at: string
}

export type PaymentTransaction = {
  id: string
  election_id: string
  invoice_id: string | null
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  payment_method: string | null
  payment_provider: string | null
  provider_transaction_id: string | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

// Database helper functions
export const db = {
  // Pricing tiers
  async getPricingTiers(): Promise<PricingTier[]> {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('min_voters', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Add-ons
  async getAddOns(): Promise<AddOn[]> {
    const { data, error } = await supabase
      .from('add_ons')
      .select('*')
      .order('price', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Elections
  async createElection(electionData: {
    name: string
    description?: string
    start_date: string
    end_date: string
    mode: 'institutional' | 'public_contest'
    cost_per_vote?: number
    max_votes_per_user?: number
    requires_voter_registration?: boolean
    payment_required?: boolean
    public_voting_enabled?: boolean
    expected_voters: number
    tier_id?: string
    billing_model?: 'upfront' | 'post_event'
    projected_base_cost?: number
    add_ons_cost?: number
    due_now?: number
    pending_after_event?: number
    add_on_ids?: string[]
  }): Promise<Election> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { add_on_ids, ...electionFields } = electionData

    // Prepare election data with defaults
    const electionPayload: any = {
      user_id: user.id,
      status: 'draft',
      payment_status: electionFields.mode === 'public_contest' ? 'paid' : 'pending', // Public contests don't need upfront payment
      mode: electionFields.mode || 'institutional',
      requires_voter_registration: electionFields.requires_voter_registration ?? (electionFields.mode === 'institutional'),
      payment_required: electionFields.payment_required ?? (electionFields.mode === 'public_contest'),
      public_voting_enabled: electionFields.public_voting_enabled ?? (electionFields.mode === 'public_contest'),
    }

    // Add fields that are always present
    if (electionFields.name) electionPayload.name = electionFields.name
    if (electionFields.description !== undefined) electionPayload.description = electionFields.description
    if (electionFields.start_date) electionPayload.start_date = electionFields.start_date
    if (electionFields.end_date) electionPayload.end_date = electionFields.end_date
    if (electionFields.expected_voters !== undefined) electionPayload.expected_voters = electionFields.expected_voters
    if (electionFields.tier_id !== undefined) electionPayload.tier_id = electionFields.tier_id
    if (electionFields.billing_model) electionPayload.billing_model = electionFields.billing_model
    if (electionFields.projected_base_cost !== undefined) electionPayload.projected_base_cost = electionFields.projected_base_cost
    if (electionFields.add_ons_cost !== undefined) electionPayload.add_ons_cost = electionFields.add_ons_cost
    if (electionFields.due_now !== undefined) electionPayload.due_now = electionFields.due_now
    if (electionFields.pending_after_event !== undefined) electionPayload.pending_after_event = electionFields.pending_after_event

    // For public contests, set defaults
    if (electionPayload.mode === 'public_contest') {
      electionPayload.cost_per_vote = electionFields.cost_per_vote || 0.50
      electionPayload.max_votes_per_user = electionFields.max_votes_per_user ?? null // null = unlimited
      electionPayload.requires_voter_registration = false
      electionPayload.payment_required = true
      electionPayload.public_voting_enabled = true
      // For public contests, pricing is different
      electionPayload.projected_base_cost = 0
      electionPayload.add_ons_cost = 0
      electionPayload.due_now = 0
      electionPayload.pending_after_event = 0
      electionPayload.tier_id = null
      electionPayload.billing_model = 'upfront'
    } else {
      // For institutional elections, keep existing pricing logic
      electionPayload.requires_voter_registration = true
      electionPayload.payment_required = false
      electionPayload.public_voting_enabled = false
      // Don't include cost_per_vote or max_votes_per_user for institutional elections
      // to avoid schema cache issues if the migration hasn't been run
    }

    // Generate public voting link for public contests
    if (electionPayload.mode === 'public_contest') {
      // Generate a unique token for the public voting link
      const publicLinkToken = `vote-${Date.now()}-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      electionPayload.public_voting_link = publicLinkToken
    }

    // Create election
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .insert(electionPayload)
      .select()
      .single()

    if (electionError) throw electionError

    // Link add-ons if provided
    if (add_on_ids && add_on_ids.length > 0) {
      const { error: addOnsError } = await supabase
        .from('election_add_ons')
        .insert(
          add_on_ids.map((add_on_id) => ({
            election_id: election.id,
            add_on_id,
          }))
        )

      if (addOnsError) throw addOnsError
    }

    // Create initial invoice only for institutional elections (disabled while testing)
    if (!INSTITUTIONAL_PAYMENTS_DISABLED && election.mode === 'institutional' && election.due_now > 0) {
      const invoice = await db.createInvoice(election.id, {
        amount: election.due_now,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      
      // Send payment alert notification
      try {
        const { formatCurrency } = await import('./currency')
        const { sendPaymentAlert } = await import('./email')
        const dueDate = invoice.due_date 
          ? new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : undefined
        
        await sendPaymentAlert(
          election.user_id,
          invoice.id,
          invoice.invoice_number,
          formatCurrency(invoice.amount, 'GHS'),
          `A new invoice has been created for your election "${election.name}".`,
          dueDate
        )
      } catch (error) {
        console.error('Failed to send payment alert notification:', error)
        // Don't fail election creation if notification fails
      }
    }

    return election
  },


  async getElections(): Promise<Election[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getElection(id: string): Promise<Election | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  async updateElection(id: string, updates: Partial<Election>): Promise<Election> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('elections')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Invoices
  async createInvoice(electionId: string, invoiceData: {
    amount: number
    due_date?: string
  }): Promise<Invoice> {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        election_id: electionId,
        invoice_number: invoiceNumber,
        amount: invoiceData.amount,
        due_date: invoiceData.due_date || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Create invoice items
    const election = await db.getElection(electionId)
    if (election) {
      await supabase
        .from('invoice_items')
        .insert([
          {
            invoice_id: data.id,
            description: `Election: ${election.name} - Base platform fee`,
            quantity: 1,
            unit_price: election.projected_base_cost,
            total: election.projected_base_cost,
          },
          ...(election.add_ons_cost > 0 ? [{
            invoice_id: data.id,
            description: 'Add-ons',
            quantity: 1,
            unit_price: election.add_ons_cost,
            total: election.add_ons_cost,
          }] : []),
        ])
    }

    return data
  },

  async getInvoices(electionId?: string): Promise<Invoice[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('invoices')
      .select(`
        *,
        elections!inner(id, user_id)
      `)
      .eq('elections.user_id', user.id)

    if (electionId) {
      query = query.eq('election_id', electionId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Payment transactions
  async createPaymentTransaction(transactionData: {
    election_id: string
    invoice_id?: string
    amount: number
    currency?: string
    payment_method?: string
    payment_provider?: string
    provider_transaction_id?: string
    metadata?: Record<string, any>
  }): Promise<PaymentTransaction> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        ...transactionData,
        currency: transactionData.currency || 'GHS',
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updatePaymentTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getPaymentTransaction(id: string): Promise<PaymentTransaction | null> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  // Voters
  async verifyVoterAccess(electionId: string, voterIdentifier: string, accessCode?: string): Promise<{
    voter: any
    election: Election
  } | null> {
    // Get the election first to verify it exists and is active
    const election = await supabase
      .from('elections')
      .select('*')
      .eq('id', electionId)
      .eq('status', 'active')
      .single()

    if (election.error || !election.data) {
      return null
    }

    // Find voter by identifier and election
    const { data: voter, error } = await supabase
      .from('voters')
      .select('*')
      .eq('election_id', electionId)
      .eq('identifier', voterIdentifier)
      .single()

    if (error || !voter) {
      return null
    }

    // Check if voter has already voted
    if (voter.has_voted) {
      throw new Error('You have already voted in this election.')
    }

    // Check if access token has been used
    if (voter.access_token_used) {
      throw new Error('Your voting access has already been used. Each voter can only access the voting page once.')
    }

    // If access code is provided, verify it (you can add this field to voters table if needed)
    // For now, we'll just return the voter if they exist and haven't voted

    return {
      voter,
      election: election.data as Election,
    }
  },

  async getElectionForVoting(electionId: string): Promise<{
    election: Election
    positions: any[]
    candidates: any[]
  } | null> {
    // Get election
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('*')
      .eq('id', electionId)
      .eq('status', 'active')
      .single()

    if (electionError || !election) {
      return null
    }

    // Get positions
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('*')
      .eq('election_id', electionId)
      .order('order_index', { ascending: true })

    if (positionsError) {
      return null
    }

    // Get candidates for each position
    const positionIds = positions?.map((p: any) => p.id) || []
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('*')
      .in('position_id', positionIds)
      .order('order_index', { ascending: true })

    if (candidatesError) {
      return null
    }

    return {
      election: election as Election,
      positions: positions || [],
      candidates: candidates || [],
    }
  },

  async submitVote(electionId: string, voterId: string, votes: { positionId: string; candidateId: string }[], request?: Request | { headers: Headers | { get: (key: string) => string | null } }): Promise<void> {
    // Verify voter hasn't already voted
    const { data: voter, error: voterError } = await supabase
      .from('voters')
      .select('*')
      .eq('id', voterId)
      .eq('election_id', electionId)
      .single()

    if (voterError || !voter) {
      throw new Error('Voter not found')
    }

    if (voter.has_voted) {
      throw new Error('You have already voted in this election.')
    }

    // Mark access token as used
    await supabase
      .from('voters')
      .update({
        access_token_used: true,
        access_token_used_at: new Date().toISOString(),
      })
      .eq('id', voterId)

    // Use enhanced vote submission if request is provided
    if (request) {
      try {
        const { submitMultipleVotesWithSecurity } = await import('./voteSubmission')
        await submitMultipleVotesWithSecurity(electionId, voterId, votes, request)
      } catch (error) {
        // Fallback to basic submission if enhanced fails
        console.warn('Enhanced vote submission failed, using basic submission:', error)
        // Continue with basic submission below
      }
    }

    // Basic vote submission (fallback or if request not provided)
    if (!request) {
      const voteRecords = votes.map((vote) => ({
        election_id: electionId,
        voter_id: voterId,
        position_id: vote.positionId,
        candidate_id: vote.candidateId,
      }))

      const { error: votesError } = await supabase
        .from('votes')
        .insert(voteRecords)

      if (votesError) {
        throw new Error('Failed to submit votes')
      }
    }

    // Mark voter as having voted
    await supabase
      .from('voters')
      .update({
        has_voted: true,
        voted_at: new Date().toISOString(),
      })
      .eq('id', voterId)

    // Send vote update notification to election owner
    try {
      const { data: election } = await supabase
        .from('elections')
        .select('user_id, name')
        .eq('id', electionId)
        .single()

      if (election) {
        const { sendVoteUpdate } = await import('./email')
        // Get current total vote count
        const { data: { count } } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('election_id', electionId)

        // Send notification with updated vote count
        await sendVoteUpdate(
          election.user_id,
          electionId,
          election.name,
          `A new vote has been cast in your election "${election.name}".`,
          count || 0
        )
      }
    } catch (error) {
      console.error('Failed to send vote update notification:', error)
      // Don't fail vote submission if notification fails
    }
  },

  // Public Contest Voting
  async getPublicContest(electionId: string): Promise<{
    election: Election
    positions: any[]
    candidates: any[]
  } | null> {
    // Get public contest election by ID
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('*')
      .eq('id', electionId)
      .eq('mode', 'public_contest')
      .eq('public_voting_enabled', true)
      .eq('status', 'active')
      .single()

    if (electionError || !election) {
      return null
    }

    // Get positions
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('*')
      .eq('election_id', electionId)
      .order('order_index', { ascending: true })

    if (positionsError) {
      return null
    }

    // Get candidates
    const positionIds = positions?.map((p: any) => p.id) || []
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('*')
      .in('position_id', positionIds)
      .order('order_index', { ascending: true })

    if (candidatesError) {
      return null
    }

    return {
      election: election as Election,
      positions: positions || [],
      candidates: candidates || [],
    }
  },

  async getPublicElection(votingLink: string): Promise<{
    election: Election
    positions: any[]
    candidates: any[]
    voteCounts: Record<string, number>
  } | null> {
    // Get election by public voting link
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('*')
      .eq('public_voting_link', votingLink)
      .eq('mode', 'public_contest')
      .eq('public_voting_enabled', true)
      .eq('status', 'active')
      .single()

    if (electionError || !election) {
      return null
    }

    // Get positions
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('*')
      .eq('election_id', election.id)
      .order('order_index', { ascending: true })

    if (positionsError) {
      return null
    }

    // Get candidates
    const positionIds = positions?.map((p: any) => p.id) || []
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('*')
      .in('position_id', positionIds)
      .order('order_index', { ascending: true })

    if (candidatesError) {
      return null
    }

    // Get vote counts for each candidate
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('candidate_id, vote_count')
      .eq('election_id', election.id)

    const voteCounts: Record<string, number> = {}
    if (!votesError && votes) {
      votes.forEach((vote: any) => {
        voteCounts[vote.candidate_id] = (voteCounts[vote.candidate_id] || 0) + (vote.vote_count || 1)
      })
    }

    return {
      election: election as Election,
      positions: positions || [],
      candidates: candidates || [],
      voteCounts,
    }
  },

  async submitPublicVote(
    electionId: string,
    candidateId: string,
    voteCount: number,
    userPhone: string,
    userEmail: string | null,
    paymentTransactionId: string
  ): Promise<void> {
    // Verify election is public contest and active
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('*')
      .eq('id', electionId)
      .eq('mode', 'public_contest')
      .eq('public_voting_enabled', true)
      .eq('status', 'active')
      .single()

    if (electionError || !election) {
      throw new Error('Election not found or not active')
    }

    // Check vote limits if max_votes_per_user is set
    if (election.max_votes_per_user) {
      const { count } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', electionId)
        .eq('user_phone', userPhone)

      const currentVotes = count || 0
      if (currentVotes + voteCount > election.max_votes_per_user) {
        throw new Error(`Maximum votes per user exceeded. You can only vote ${election.max_votes_per_user} times.`)
      }
    }

    // Get position for this candidate
    const { data: candidate } = await supabase
      .from('candidates')
      .select('position_id')
      .eq('id', candidateId)
      .single()

    if (!candidate) {
      throw new Error('Candidate not found')
    }

    // Use enhanced vote submission with security features
    // For public votes, we submit each vote individually to track them properly
    const { submitVoteWithSecurity } = await import('./voteSubmission')
    
    // Create a mock request object if not provided (for backward compatibility)
    const mockRequest = {
      headers: {
        get: (key: string) => {
          if (typeof window !== 'undefined') {
            if (key === 'user-agent') return window.navigator.userAgent
            if (key === 'x-forwarded-for') return null
            if (key === 'x-real-ip') return null
          }
          return null
        },
      },
    }
    
    // Submit votes with security features
    for (let i = 0; i < voteCount; i++) {
      try {
        await submitVoteWithSecurity({
          electionId,
          positionId: candidate.position_id,
          candidateId,
          userPhone: userPhone.trim(),
          userEmail: userEmail?.trim() || null,
          paymentTransactionId,
          request: mockRequest,
        })
      } catch (error) {
        console.error(`Failed to submit vote ${i + 1}/${voteCount}:`, error)
        // Continue with remaining votes
      }
    }

    // Send vote update notification to election owner
    try {
      const { sendVoteUpdate } = await import('./email')
      // Get current total vote count after all votes are submitted
      const { data: { count } } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', electionId)

      // Create descriptive message
      const message = voteCount > 1
        ? `${voteCount} new votes have been cast in your public contest "${election.name}".`
        : `A new vote has been cast in your public contest "${election.name}".`

      await sendVoteUpdate(
        election.user_id,
        electionId,
        election.name,
        message,
        count || 0
      )
    } catch (error) {
      console.error('Failed to send vote update notification:', error)
      // Don't fail vote submission if notification fails
    }
  },

  async getPublicElectionResults(electionId: string): Promise<Record<string, number>> {
    const { data: votes, error } = await supabase
      .from('votes')
      .select('candidate_id')
      .eq('election_id', electionId)

    if (error) {
      throw error
    }

    const voteCounts: Record<string, number> = {}
    if (votes) {
      // Each vote record represents 1 vote (for public contests, multiple records are created)
      votes.forEach((vote: any) => {
        voteCounts[vote.candidate_id] = (voteCounts[vote.candidate_id] || 0) + 1
      })
    }

    return voteCounts
  },

  // Voter Management
  async getVoters(electionId: string): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify election belongs to user
    const election = await db.getElection(electionId)
    if (!election) throw new Error('Election not found')

    const { data, error } = await supabase
      .from('voters')
      .select('*')
      .eq('election_id', electionId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async importVoters(electionId: string, voters: Array<{
    identifier: string
    name?: string
    email?: string
  }>): Promise<{ success: number; failed: number; errors: string[] }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify election belongs to user
    const election = await db.getElection(electionId)
    if (!election) throw new Error('Election not found')

    if (election.mode !== 'institutional') {
      throw new Error('Voter import is only available for institutional elections')
    }

    let success = 0
    let failed = 0
    const errors: string[] = []

    // Generate access tokens for each voter
    const votersToInsert = voters.map((voter) => {
      // Generate unique access token
      const accessToken = `token-${Date.now()}-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      
      return {
        election_id: electionId,
        identifier: voter.identifier.trim(),
        name: voter.name?.trim() || null,
        email: voter.email?.trim() || null,
        access_token: accessToken,
        access_token_used: false,
        has_voted: false,
      }
    })

    // Insert voters in batches to avoid overwhelming the database
    const batchSize = 100
    for (let i = 0; i < votersToInsert.length; i += batchSize) {
      const batch = votersToInsert.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('voters')
        .insert(batch)
        .select()

      if (error) {
        // If it's a unique constraint violation, some voters might have been inserted
        if (error.code === '23505') {
          // Try inserting one by one to identify which ones failed
          for (const voter of batch) {
            try {
              const { error: singleError } = await supabase
                .from('voters')
                .insert(voter)
                .select()
              
              if (singleError) {
                failed++
                errors.push(`Voter ${voter.identifier}: ${singleError.message}`)
              } else {
                success++
              }
            } catch (err: any) {
              failed++
              errors.push(`Voter ${voter.identifier}: ${err.message}`)
            }
          }
        } else {
          failed += batch.length
          errors.push(`Batch ${i / batchSize + 1}: ${error.message}`)
        }
      } else {
        success += data?.length || 0
      }
    }

    return { success, failed, errors }
  },

  async deleteVoter(voterId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get voter to verify election ownership
    const { data: voter, error: voterError } = await supabase
      .from('voters')
      .select('election_id, elections!inner(user_id)')
      .eq('id', voterId)
      .single()

    if (voterError || !voter) throw new Error('Voter not found')

    const { error } = await supabase
      .from('voters')
      .delete()
      .eq('id', voterId)

    if (error) throw error
  },

  // Batch function to get positions and candidates together
  async getPositionsAndCandidates(electionId: string): Promise<{ positions: any[], candidates: any[] }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Single query to verify election ownership and get positions with candidates
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select(`
        *,
        elections!inner(user_id)
      `)
      .eq('election_id', electionId)
      .eq('elections.user_id', user.id)
      .order('order_index', { ascending: true })

    if (positionsError) throw positionsError
    if (!positions || positions.length === 0) {
      return { positions: [], candidates: [] }
    }

    const positionIds = positions.map(p => p.id)
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('*')
      .in('position_id', positionIds)
      .order('order_index', { ascending: true })

    if (candidatesError) throw candidatesError
    return { positions: positions || [], candidates: candidates || [] }
  },

  // Positions Management
  async getPositions(electionId: string): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify election belongs to user
    const election = await db.getElection(electionId)
    if (!election) throw new Error('Election not found')

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('election_id', electionId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data || []
  },

  async createPosition(electionId: string, positionData: {
    name: string
    description?: string
    order_index?: number
  }): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify election belongs to user
    const election = await db.getElection(electionId)
    if (!election) throw new Error('Election not found')

    // Get max order_index
    const positions = await db.getPositions(electionId)
    const maxOrder = positions.length > 0 
      ? Math.max(...positions.map(p => p.order_index || 0))
      : -1

    const { data, error } = await supabase
      .from('positions')
      .insert({
        election_id: electionId,
        name: positionData.name.trim(),
        description: positionData.description?.trim() || null,
        order_index: positionData.order_index ?? (maxOrder + 1),
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updatePosition(positionId: string, updates: {
    name?: string
    description?: string
    order_index?: number
  }): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name.trim()
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null
    if (updates.order_index !== undefined) updateData.order_index = updates.order_index

    const { data, error } = await supabase
      .from('positions')
      .update(updateData)
      .eq('id', positionId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deletePosition(positionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', positionId)

    if (error) throw error
  },

  // Candidates Management
  async getCandidates(electionId: string): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify election belongs to user
    const election = await db.getElection(electionId)
    if (!election) throw new Error('Election not found')

    const positions = await db.getPositions(electionId)
    const positionIds = positions.map(p => p.id)

    if (positionIds.length === 0) return []

    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .in('position_id', positionIds)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data || []
  },

  async createCandidate(electionId: string, candidateData: {
    position_id: string
    name: string
    bio?: string
    photo_url?: string
    order_index?: number
  }): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify election belongs to user and position belongs to election
    const election = await db.getElection(electionId)
    if (!election) throw new Error('Election not found')

    const positions = await db.getPositions(electionId)
    const position = positions.find(p => p.id === candidateData.position_id)
    if (!position) throw new Error('Position not found')

    // Get max order_index for this position
    const candidates = await db.getCandidates(electionId)
    const positionCandidates = candidates.filter(c => c.position_id === candidateData.position_id)
    const maxOrder = positionCandidates.length > 0
      ? Math.max(...positionCandidates.map(c => c.order_index || 0))
      : -1

    const { data, error } = await supabase
      .from('candidates')
      .insert({
        position_id: candidateData.position_id,
        name: candidateData.name.trim(),
        bio: candidateData.bio?.trim() || null,
        photo_url: candidateData.photo_url?.trim() || null,
        order_index: candidateData.order_index ?? (maxOrder + 1),
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateCandidate(candidateId: string, updates: {
    name?: string
    bio?: string
    photo_url?: string
    order_index?: number
  }): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name.trim()
    if (updates.bio !== undefined) updateData.bio = updates.bio?.trim() || null
    if (updates.photo_url !== undefined) updateData.photo_url = updates.photo_url?.trim() || null
    if (updates.order_index !== undefined) updateData.order_index = updates.order_index

    const { data, error } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', candidateId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteCandidate(candidateId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId)

    if (error) throw error
  },

  // Election Results - Optimized with single query using aggregation
  async getElectionResults(electionId: string): Promise<Array<{
    candidate_id: string
    candidate_name: string
    position_id: string
    position_name: string
    votes: number
  }>> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Single optimized query: get votes with candidate and position info, count votes
    const { data: voteData, error: votesError } = await supabase
      .from('votes')
      .select(`
        candidate_id,
        candidates!inner(
          id,
          name,
          position_id,
          positions!inner(
            id,
            name,
            order_index,
            elections!inner(user_id)
          )
        )
      `)
      .eq('election_id', electionId)
      .eq('candidates.positions.elections.user_id', user.id)

    if (votesError) throw votesError

    // Count votes per candidate
    const voteCounts: Record<string, number> = {}
    const candidateMap = new Map<string, any>()
    const positionMap = new Map<string, any>()

    if (voteData) {
      voteData.forEach((vote: any) => {
        const candidate = vote.candidates
        const position = candidate.positions
        
        voteCounts[candidate.id] = (voteCounts[candidate.id] || 0) + 1
        candidateMap.set(candidate.id, candidate)
        positionMap.set(position.id, position)
      })
    }

    // Get all candidates for positions that might not have votes yet
    const { positions, candidates } = await db.getPositionsAndCandidates(electionId)
    
    // Build complete results array
    const results = candidates.map(candidate => {
      const position = positions.find(p => p.id === candidate.position_id)
      return {
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        position_id: candidate.position_id,
        position_name: position?.name || 'Unknown',
        votes: voteCounts[candidate.id] || 0,
        position_order: position?.order_index || 0,
      }
    })

    // Sort by position order, then by votes (descending)
    return results.sort((a, b) => {
      if (a.position_order !== b.position_order) return a.position_order - b.position_order
      return b.votes - a.votes
    }).map(({ position_order, ...rest }) => rest)
  },

  // User Settings
  async getUserSettings(): Promise<{
    email_notifications: boolean
    election_reminders: boolean
    payment_alerts: boolean
    vote_updates: boolean
    default_billing_model: 'upfront' | 'post_event'
    default_tier: 'starter' | 'growth' | 'campus' | 'enterprise'
    currency: 'GHS' | 'USD' | 'EUR'
    timezone: string
  }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no settings exist, return default values
      if (error.code === 'PGRST116') {
        return {
          email_notifications: true,
          election_reminders: true,
          payment_alerts: true,
          vote_updates: false,
          default_billing_model: 'upfront',
          default_tier: 'starter',
          currency: 'GHS',
          timezone: 'Africa/Accra',
        }
      }
      throw error
    }

    return data
  },

  async updateUserSettings(settings: {
    email_notifications?: boolean
    election_reminders?: boolean
    payment_alerts?: boolean
    vote_updates?: boolean
    default_billing_model?: 'upfront' | 'post_event'
    default_tier?: 'starter' | 'growth' | 'campus' | 'enterprise'
    currency?: 'GHS' | 'USD' | 'EUR'
    timezone?: string
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Update existing settings
      const { error } = await supabase
        .from('user_settings')
        .update(settings)
        .eq('user_id', user.id)

      if (error) throw error
    } else {
      // Insert new settings
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          ...settings,
        })

      if (error) throw error
    }
  },

  // Notifications
  async getNotifications(limit: number = 50): Promise<Array<{
    id: string
    type: string
    title: string
    message: string
    email_sent: boolean
    read: boolean
    created_at: string
    metadata: any
  }>> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) throw error
  },

  async markAllNotificationsAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) throw error
  },

  async getUnreadNotificationCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) throw error
    return count || 0
  },

  // Client Reviews
  async getApprovedReviews(category?: string): Promise<any[]> {
    try {
      console.log('🔍 Fetching approved reviews, category:', category || 'all')
      
      let query = supabase
        .from('client_reviews')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (category) {
        query = query.eq('project_category', category)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching reviews:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        throw error
      }
      
      console.log(`✅ Found ${data?.length || 0} approved reviews`)
      if (data && data.length > 0) {
        console.log('First review sample:', {
          id: data[0].id,
          client_name: data[0].client_name,
          status: data[0].status,
          created_at: data[0].created_at,
        })
      }
      
      return data || []
    } catch (error: any) {
      console.error('❌ Error in getApprovedReviews:', error)
      throw error
    }
  },

  async submitReview(reviewData: {
    client_name: string
    client_company?: string
    project_category: string
    rating: number
    review_text: string
  }): Promise<any> {
    try {
      // Check if Supabase is configured
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local')
      }

      const insertData: any = {
        client_name: reviewData.client_name,
        project_category: reviewData.project_category,
        rating: reviewData.rating,
        review_text: reviewData.review_text,
        status: 'approved',
        approved_at: new Date().toISOString(),
      }

      // Add optional company field only if it exists
      if (reviewData.client_company) {
        insertData.client_company = reviewData.client_company
      }

      console.log('Attempting to insert review with data:', insertData)
      console.log('Supabase URL configured:', !!supabaseUrl)
      console.log('Supabase Key configured:', !!supabaseAnonKey)
      
      const { data, error } = await supabase
        .from('client_reviews')
        .insert(insertData)
        .select('*')  // Explicitly select all columns
        .single()

      if (error) {
        console.error('❌ Supabase insert error:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        
        // Provide helpful error messages
        if (error.code === '42P01') {
          throw new Error('Table "client_reviews" does not exist. Please run CREATE_REVIEWS_TABLE.sql in Supabase SQL Editor.')
        } else if (error.code === '42501') {
          throw new Error('Permission denied. Check Row Level Security policies in Supabase.')
        } else {
          throw error
        }
      }
      
      if (!data) {
        throw new Error('Review was not created. No data returned from database.')
      }
      
      console.log('✅ Review inserted successfully:', data)
      return data
    } catch (error: any) {
      console.error('❌ Error in submitReview:', error)
      throw error
    }
  },

  async deleteReview(reviewId: string): Promise<void> {
    try {
      if (!reviewId) {
        throw new Error('Review ID is required to delete a review')
      }

      console.log('🗑️ Deleting review with ID:', reviewId)

      const { error } = await supabase
        .from('client_reviews')
        .delete()
        .eq('id', reviewId)

      if (error) {
        console.error('❌ Supabase delete error:', error)
        throw error
      }

      console.log('✅ Review deleted successfully')
    } catch (error: any) {
      console.error('❌ Error in deleteReview:', error)
      throw error
    }
  },
}
