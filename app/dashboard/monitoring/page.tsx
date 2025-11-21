'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import Badge from '@/components/Badge'
import { useRouter } from 'next/navigation'

interface SystemHealth {
  activeElections: number
  totalVotesToday: number
  averageResponseTime: number
  errorRate: number
  status: 'healthy' | 'degraded' | 'down'
}

export default function MonitoringDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const loadHealth = async () => {
    try {
      const response = await fetch('/api/monitoring/health')
      const data = await response.json()
      if (data.success) {
        setHealth(data.data)
      }
    } catch (error) {
      console.error('Failed to load system health:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadHealth()
    const interval = setInterval(loadHealth, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadHealth()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success'
      case 'degraded':
        return 'warning'
      case 'down':
        return 'error'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading system health...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {health && (
        <>
          {/* System Status */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
              <Badge variant={getStatusColor(health.status)}>
                {health.status.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Active Elections</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{health.activeElections}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Votes Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{health.totalVotesToday.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{health.averageResponseTime.toFixed(0)}ms</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{health.errorRate.toFixed(2)}%</p>
              </div>
            </div>
          </Card>

          {/* Health Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current</span>
                  <span className={`font-medium ${health.averageResponseTime > 2000 ? 'text-red-600' : health.averageResponseTime > 1000 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {health.averageResponseTime.toFixed(0)}ms
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      health.averageResponseTime > 2000 ? 'bg-red-600' :
                      health.averageResponseTime > 1000 ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min((health.averageResponseTime / 5000) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {health.averageResponseTime < 1000 ? 'Excellent' :
                   health.averageResponseTime < 2000 ? 'Good' : 'Needs Attention'}
                </p>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Rate</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current</span>
                  <span className={`font-medium ${health.errorRate > 10 ? 'text-red-600' : health.errorRate > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {health.errorRate.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      health.errorRate > 10 ? 'bg-red-600' :
                      health.errorRate > 5 ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(health.errorRate * 10, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {health.errorRate < 1 ? 'Excellent' :
                   health.errorRate < 5 ? 'Good' : 'Needs Attention'}
                </p>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/dashboard/alerts')}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
              >
                View Alerts
              </button>
              <button
                onClick={() => router.push('/dashboard/reports')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Generate Report
              </button>
              <button
                onClick={() => router.push('/dashboard/votes')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                View Elections
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}


