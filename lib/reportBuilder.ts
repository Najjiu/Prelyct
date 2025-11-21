/**
 * Custom report builder service
 * Allows admins to create custom reports with filters and export in multiple formats
 */

import { db } from './supabaseClient'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

export interface ReportFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between'
  value: any
}

export interface ReportConfig {
  name: string
  description?: string
  reportType: 'election_results' | 'voter_analytics' | 'security_audit' | 'financial' | 'custom'
  electionId?: string
  filters: ReportFilter[]
  columns: string[]
  format: 'pdf' | 'excel' | 'csv' | 'json'
  groupBy?: string
  sortBy?: { field: string; direction: 'asc' | 'desc' }
}

/**
 * Generate report based on configuration
 */
export async function generateReport(config: ReportConfig): Promise<{
  data: any[]
  format: string
  fileUrl?: string
  fileBuffer?: Buffer
}> {
  try {
    let data: any[] = []
    
    // Fetch data based on report type
    switch (config.reportType) {
      case 'election_results':
        data = await generateElectionResultsReport(config)
        break
      case 'voter_analytics':
        data = await generateVoterAnalyticsReport(config)
        break
      case 'security_audit':
        data = await generateSecurityAuditReport(config)
        break
      case 'financial':
        data = await generateFinancialReport(config)
        break
      default:
        data = []
    }
    
    // Apply filters
    data = applyFilters(data, config.filters)
    
    // Apply sorting
    if (config.sortBy) {
      data = sortData(data, config.sortBy)
    }
    
    // Select columns
    if (config.columns.length > 0) {
      data = data.map(row => {
        const filtered: any = {}
        config.columns.forEach(col => {
          if (row[col] !== undefined) {
            filtered[col] = row[col]
          }
        })
        return filtered
      })
    }
    
    // Generate file based on format
    let fileBuffer: Buffer | undefined
    let fileUrl: string | undefined
    
    switch (config.format) {
      case 'pdf':
        fileBuffer = await generatePDF(data, config)
        break
      case 'excel':
        fileBuffer = await generateExcel(data, config)
        break
      case 'csv':
        fileBuffer = await generateCSV(data, config)
        break
      case 'json':
        fileBuffer = Buffer.from(JSON.stringify(data, null, 2))
        break
    }
    
    // Upload to storage if buffer generated
    if (fileBuffer) {
      // TODO: Upload to Supabase Storage and get URL
      // fileUrl = await uploadReportToStorage(fileBuffer, config)
    }
    
    return {
      data,
      format: config.format,
      fileBuffer,
      fileUrl,
    }
  } catch (error) {
    console.error('Error generating report:', error)
    throw error
  }
}

/**
 * Generate election results report
 */
async function generateElectionResultsReport(config: ReportConfig): Promise<any[]> {
  if (!config.electionId) {
    throw new Error('Election ID required for election results report')
  }
  
  const { data: results } = await db.supabase
    .from('votes')
    .select(`
      *,
      candidate:candidates(name, position_id),
      position:positions(name),
      election:elections(name, start_date, end_date)
    `)
    .eq('election_id', config.electionId)
  
  // Group by position and candidate
  const grouped: any = {}
  
  results?.forEach((vote: any) => {
    const positionName = vote.position?.name || 'Unknown'
    const candidateName = vote.candidate?.name || 'Unknown'
    const key = `${positionName}_${candidateName}`
    
    if (!grouped[key]) {
      grouped[key] = {
        position: positionName,
        candidate: candidateName,
        votes: 0,
        election: vote.election?.name,
        startDate: vote.election?.start_date,
        endDate: vote.election?.end_date,
      }
    }
    
    grouped[key].votes++
  })
  
  return Object.values(grouped)
}

/**
 * Generate voter analytics report
 */
async function generateVoterAnalyticsReport(config: ReportConfig): Promise<any[]> {
  if (!config.electionId) {
    throw new Error('Election ID required for voter analytics report')
  }
  
  const { data: voters } = await db.supabase
    .from('voters')
    .select('*')
    .eq('election_id', config.electionId)
  
  const { data: votes } = await db.supabase
    .from('votes')
    .select('voter_id, created_at')
    .eq('election_id', config.electionId)
  
  // Combine voter and vote data
  const analytics = voters?.map((voter: any) => {
    const voterVotes = votes?.filter((v: any) => v.voter_id === voter.id) || []
    return {
      voterId: voter.id,
      name: voter.name,
      email: voter.email,
      hasVoted: voter.has_voted,
      voteCount: voterVotes.length,
      lastVoteAt: voterVotes.length > 0 ? voterVotes[voterVotes.length - 1].created_at : null,
    }
  }) || []
  
  return analytics
}

/**
 * Generate security audit report
 */
async function generateSecurityAuditReport(config: ReportConfig): Promise<any[]> {
  if (!config.electionId) {
    throw new Error('Election ID required for security audit report')
  }
  
  const { data: votes } = await db.supabase
    .from('votes')
    .select(`
      *,
      ip_tracking:ip_tracking(ip_address, country, is_vpn, is_proxy, risk_score)
    `)
    .eq('election_id', config.electionId)
    .order('created_at', { ascending: false })
  
  return votes?.map((vote: any) => ({
    voteId: vote.id,
    timestamp: vote.created_at,
    ipAddress: vote.ip_address,
    country: vote.geolocation_country,
    riskScore: vote.risk_score,
    flagged: vote.flagged,
    flagReason: vote.flag_reason,
    blockchainHash: vote.blockchain_hash,
    blockchainTxId: vote.blockchain_tx_id,
  })) || []
}

/**
 * Generate financial report
 */
async function generateFinancialReport(config: ReportConfig): Promise<any[]> {
  if (!config.electionId) {
    throw new Error('Election ID required for financial report')
  }
  
  const { data: transactions } = await db.supabase
    .from('payment_transactions')
    .select('*')
    .eq('election_id', config.electionId)
  
  const { data: invoices } = await db.supabase
    .from('invoices')
    .select('*')
    .eq('election_id', config.electionId)
  
  const financial = [
    ...(transactions?.map((t: any) => ({
      type: 'transaction',
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      date: t.created_at,
    })) || []),
    ...(invoices?.map((i: any) => ({
      type: 'invoice',
      id: i.id,
      amount: i.amount,
      currency: 'GHS', // Default
      status: i.status,
      date: i.created_at,
    })) || []),
  ]
  
  return financial
}

/**
 * Apply filters to data
 */
function applyFilters(data: any[], filters: ReportFilter[]): any[] {
  return data.filter(row => {
    return filters.every(filter => {
      const value = row[filter.field]
      
      switch (filter.operator) {
        case 'equals':
          return value === filter.value
        case 'not_equals':
          return value !== filter.value
        case 'greater_than':
          return Number(value) > Number(filter.value)
        case 'less_than':
          return Number(value) < Number(filter.value)
        case 'contains':
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(value)
        case 'between':
          const [min, max] = Array.isArray(filter.value) ? filter.value : [filter.value, filter.value]
          return Number(value) >= Number(min) && Number(value) <= Number(max)
        default:
          return true
      }
    })
  })
}

/**
 * Sort data
 */
function sortData(data: any[], sortBy: { field: string; direction: 'asc' | 'desc' }): any[] {
  return [...data].sort((a, b) => {
    const aVal = a[sortBy.field]
    const bVal = b[sortBy.field]
    
    if (aVal === bVal) return 0
    
    const comparison = aVal > bVal ? 1 : -1
    return sortBy.direction === 'asc' ? comparison : -comparison
  })
}

/**
 * Generate PDF report
 */
async function generatePDF(data: any[], config: ReportConfig): Promise<Buffer> {
  const doc = new jsPDF()
  
  doc.setFontSize(18)
  doc.text(config.name, 14, 20)
  
  if (config.description) {
    doc.setFontSize(12)
    doc.text(config.description, 14, 30)
  }
  
  if (data.length === 0) {
    doc.text('No data available', 14, 50)
    return Buffer.from(doc.output('arraybuffer'))
  }
  
  // Get column headers
  const columns = config.columns.length > 0 ? config.columns : Object.keys(data[0])
  const rows = data.map(row => columns.map(col => String(row[col] || '')))
  
  ;(doc as any).autoTable({
    startY: 40,
    head: [columns],
    body: rows,
    theme: 'grid',
  })
  
  return Buffer.from(doc.output('arraybuffer'))
}

/**
 * Generate Excel report
 */
async function generateExcel(data: any[], config: ReportConfig): Promise<Buffer> {
  const columns = config.columns.length > 0 ? config.columns : (data.length > 0 ? Object.keys(data[0]) : [])
  const rows = data.map(row => columns.map(col => row[col] || ''))
  
  const worksheet = XLSX.utils.aoa_to_sheet([columns, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
  
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}

/**
 * Generate CSV report
 */
async function generateCSV(data: any[], config: ReportConfig): Promise<Buffer> {
  if (data.length === 0) {
    return Buffer.from('')
  }
  
  const columns = config.columns.length > 0 ? config.columns : Object.keys(data[0])
  const rows = data.map(row => columns.map(col => {
    const value = row[col] || ''
    // Escape CSV values
    if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
      return `"${String(value).replace(/"/g, '""')}"`
    }
    return String(value)
  }))
  
  const csv = [columns.join(','), ...rows.map(row => row.join(','))].join('\n')
  return Buffer.from(csv, 'utf-8')
}


