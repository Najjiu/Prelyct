/**
 * System monitoring service
 * Tracks system health, active elections, vote counts, and performance metrics
 */

import { db } from './supabaseClient'

export interface MonitoringMetric {
  electionId?: string
  metricType: 'vote_count' | 'turnout' | 'error_rate' | 'response_time' | 'active_elections' | 'system_health'
  metricValue: number
  thresholdValue?: number
  status: 'normal' | 'warning' | 'critical'
  message?: string
  metadata?: Record<string, any>
}

/**
 * Record a monitoring metric
 */
export async function recordMetric(metric: MonitoringMetric): Promise<void> {
  try {
    const { error } = await db.supabase
      .from('system_monitoring')
      .insert({
        election_id: metric.electionId || null,
        metric_type: metric.metricType,
        metric_value: metric.metricValue,
        threshold_value: metric.thresholdValue || null,
        status: metric.status,
        message: metric.message || null,
        metadata: metric.metadata || {},
      })
    
    if (error) {
      console.error('Error recording metric:', error)
    }
  } catch (error) {
    console.error('Error recording metric:', error)
  }
}

/**
 * Get system health metrics
 */
export async function getSystemHealth(): Promise<{
  activeElections: number
  totalVotesToday: number
  averageResponseTime: number
  errorRate: number
  status: 'healthy' | 'degraded' | 'down'
}> {
  try {
    // Get active elections count
    const { count: activeElections } = await db.supabase
      .from('elections')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    
    // Get votes today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: totalVotesToday } = await db.supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
    
    // Get recent metrics for response time and error rate
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const { data: recentMetrics } = await db.supabase
      .from('system_monitoring')
      .select('*')
      .gte('recorded_at', oneHourAgo.toISOString())
      .in('metric_type', ['response_time', 'error_rate'])
    
    const responseTimeMetrics = recentMetrics?.filter(m => m.metric_type === 'response_time') || []
    const errorRateMetrics = recentMetrics?.filter(m => m.metric_type === 'error_rate') || []
    
    const averageResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + Number(m.metric_value), 0) / responseTimeMetrics.length
      : 0
    
    const errorRate = errorRateMetrics.length > 0
      ? errorRateMetrics.reduce((sum, m) => sum + Number(m.metric_value), 0) / errorRateMetrics.length
      : 0
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'down' = 'healthy'
    if (errorRate > 10 || averageResponseTime > 5000) {
      status = 'down'
    } else if (errorRate > 5 || averageResponseTime > 2000) {
      status = 'degraded'
    }
    
    return {
      activeElections: activeElections || 0,
      totalVotesToday: totalVotesToday || 0,
      averageResponseTime,
      errorRate,
      status,
    }
  } catch (error) {
    console.error('Error getting system health:', error)
    return {
      activeElections: 0,
      totalVotesToday: 0,
      averageResponseTime: 0,
      errorRate: 100,
      status: 'down',
    }
  }
}

/**
 * Get election-specific metrics
 */
export async function getElectionMetrics(electionId: string): Promise<{
  voteCount: number
  turnout: number
  expectedVoters: number
  votesPerHour: number
  peakVotingHour: string | null
}> {
  try {
    // Get election details
    const { data: election } = await db.supabase
      .from('elections')
      .select('expected_voters')
      .eq('id', electionId)
      .single()
    
    const expectedVoters = election?.expected_voters || 0
    
    // Get vote count
    const { count: voteCount } = await db.supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId)
    
    const turnout = expectedVoters > 0 ? ((voteCount || 0) / expectedVoters) * 100 : 0
    
    // Get votes in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const { count: votesLastHour } = await db.supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId)
      .gte('created_at', oneHourAgo.toISOString())
    
    // Get peak voting hour (simplified - would need more complex query for actual peak)
    const votesPerHour = votesLastHour || 0
    
    return {
      voteCount: voteCount || 0,
      turnout,
      expectedVoters,
      votesPerHour,
      peakVotingHour: null, // TODO: Calculate actual peak hour
    }
  } catch (error) {
    console.error('Error getting election metrics:', error)
    return {
      voteCount: 0,
      turnout: 0,
      expectedVoters: 0,
      votesPerHour: 0,
      peakVotingHour: null,
    }
  }
}

/**
 * Check alert thresholds and trigger alerts if needed
 */
export async function checkAlertThresholds(electionId?: string): Promise<void> {
  try {
    // Get active alert rules
    const { data: alertRules } = await db.supabase
      .from('alert_rules')
      .select('*')
      .eq('is_active', true)
      .or(`election_id.is.null,election_id.eq.${electionId || ''}`)
    
    if (!alertRules || alertRules.length === 0) {
      return
    }
    
    for (const rule of alertRules) {
      // Get current metric value
      const metrics = await getMetricValue(rule.metric_type, rule.election_id || undefined)
      
      if (!metrics) continue
      
      // Check condition
      let shouldAlert = false
      const currentValue = metrics.value
      const threshold = Number(rule.threshold_value)
      
      switch (rule.condition) {
        case 'greater_than':
          shouldAlert = currentValue > threshold
          break
        case 'less_than':
          shouldAlert = currentValue < threshold
          break
        case 'equals':
          shouldAlert = currentValue === threshold
          break
        case 'not_equals':
          shouldAlert = currentValue !== threshold
          break
      }
      
      if (shouldAlert) {
        // Check if alert already exists and is active
        const { data: existingAlert } = await db.supabase
          .from('alerts')
          .select('id')
          .eq('alert_rule_id', rule.id)
          .eq('status', 'active')
          .single()
        
        if (!existingAlert) {
          // Create new alert
          await db.supabase
            .from('alerts')
            .insert({
              alert_rule_id: rule.id,
              election_id: rule.election_id || null,
              user_id: rule.user_id,
              severity: rule.severity,
              title: rule.name,
              message: `${rule.metric_type} is ${currentValue} (threshold: ${threshold})`,
              metric_type: rule.metric_type,
              metric_value: currentValue,
              threshold_value: threshold,
              status: 'active',
            })
        }
      }
    }
  } catch (error) {
    console.error('Error checking alert thresholds:', error)
  }
}

/**
 * Get current value for a metric type
 */
async function getMetricValue(
  metricType: string,
  electionId?: string
): Promise<{ value: number; timestamp: string } | null> {
  try {
    // This is a simplified version - in production, you'd query actual metrics
    // For now, we'll calculate based on current data
    
    switch (metricType) {
      case 'vote_count':
        if (electionId) {
          const { count } = await db.supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('election_id', electionId)
          return { value: count || 0, timestamp: new Date().toISOString() }
        }
        break
      
      case 'turnout':
        if (electionId) {
          const metrics = await getElectionMetrics(electionId)
          return { value: metrics.turnout, timestamp: new Date().toISOString() }
        }
        break
      
      // Add more metric types as needed
    }
    
    return null
  } catch (error) {
    console.error('Error getting metric value:', error)
    return null
  }
}


