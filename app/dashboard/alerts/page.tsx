'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import Badge from '@/components/Badge'
import Button from '@/components/Button'

interface Alert {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  metric_type: string
  metric_value: number
  threshold_value: number
  created_at: string
  election_id?: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all')

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const status = filter === 'all' ? undefined : filter
      const url = status ? `/api/alerts?status=${status}` : '/api/alerts'
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setAlerts(data.data)
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [filter])

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action }),
      })
      const data = await response.json()
      if (data.success) {
        loadAlerts()
      }
    } catch (error) {
      console.error('Failed to update alert:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'default'
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true
    return alert.status === filter
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading alerts...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({alerts.length})
        </Button>
        <Button
          variant={filter === 'active' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active ({alerts.filter(a => a.status === 'active').length})
        </Button>
        <Button
          variant={filter === 'acknowledged' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('acknowledged')}
        >
          Acknowledged ({alerts.filter(a => a.status === 'acknowledged').length})
        </Button>
        <Button
          variant={filter === 'resolved' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('resolved')}
        >
          Resolved ({alerts.filter(a => a.status === 'resolved').length})
        </Button>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600">No {filter === 'all' ? '' : filter} alerts found.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <Card key={alert.id} className={`p-4 ${alert.status === 'active' ? 'border-l-4 border-primary' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <Badge variant={alert.status === 'active' ? 'warning' : 'default'}>
                      {alert.status.toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="font-medium">{alert.metric_type}:</span> {alert.metric_value} 
                    {' '}(threshold: {alert.threshold_value})
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
                {alert.status === 'active' && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAlertAction(alert.id, 'resolve')}
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

