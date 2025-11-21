'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/Card'
import { db, type Election } from '@/lib/supabaseClient'
import { downloadResultsPdf } from '@/lib/resultsExporter'

interface ResultsTabProps {
  electionId: string
  election: Election | null
}

export default function ResultsTab({ electionId, election }: ResultsTabProps) {
  const [results, setResults] = useState<Array<{
    candidate_id: string
    candidate_name: string
    position_id: string
    position_name: string
    votes: number
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadResults = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await db.getElectionResults(electionId)
      setResults(data)
    } catch (err: any) {
      console.error('Failed to load results:', err)
      setError(err.message || 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [electionId])

  useEffect(() => {
    loadResults()
    // Optimized polling: exponential backoff for active elections
    if (election?.status === 'active') {
      let pollCount = 0
      const maxInterval = 30000 // Max 30 seconds
      const baseInterval = 5000 // Start at 5 seconds
      let timeoutId: NodeJS.Timeout | null = null
      
      const scheduleNextPoll = () => {
        // Exponential backoff: 5s, 10s, 20s, 30s, then stay at 30s
        const interval = Math.min(baseInterval * Math.pow(2, pollCount), maxInterval)
        pollCount++
        timeoutId = setTimeout(() => {
          loadResults()
          scheduleNextPoll()
        }, interval)
      }
      
      scheduleNextPoll()
      return () => {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }
  }, [electionId, election?.status, loadResults])


  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading results...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadResults}
            className="mt-4 text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </Card>
    )
  }

  if (results.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-600">No results available yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Results will appear here once voting begins.
          </p>
        </div>
      </Card>
    )
  }

  // Group results by position
  const resultsByPosition = new Map<string, typeof results>()
  results.forEach(result => {
    if (!resultsByPosition.has(result.position_id)) {
      resultsByPosition.set(result.position_id, [])
    }
    resultsByPosition.get(result.position_id)!.push(result)
  })

  // Calculate total votes per position for percentage calculation
  const totalVotesByPosition = new Map<string, number>()
  resultsByPosition.forEach((positionResults, positionId) => {
    const total = positionResults.reduce((sum, r) => sum + r.votes, 0)
    totalVotesByPosition.set(positionId, total)
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Election Results</h2>
        <div className="flex items-center gap-3">
          {election?.status === 'active' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live results</span>
            </div>
          )}
          {election?.status === 'closed' && (
            <button
              onClick={() => {
                downloadResultsPdf(
                  {
                    id: election.id,
                    name: election.name,
                    description: election.description,
                    start_date: election.start_date,
                    end_date: election.end_date,
                  },
                  results
                )
              }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition"
            >
              Download Results (PDF)
            </button>
          )}
        </div>
      </div>

      {Array.from(resultsByPosition.entries()).map(([positionId, positionResults]) => {
        const totalVotes = totalVotesByPosition.get(positionId) || 0
        const sortedResults = [...positionResults].sort((a, b) => b.votes - a.votes)
        const winner = sortedResults[0]
        const isTie = sortedResults.length > 1 && sortedResults[0].votes === sortedResults[1].votes

        return (
          <Card key={positionId}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{positionResults[0].position_name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                Total votes: <span className="font-semibold">{totalVotes.toLocaleString()}</span>
              </p>
            </div>

            <div className="space-y-4">
              {sortedResults.map((result, index) => {
                const percentage = totalVotes > 0 ? (result.votes / totalVotes) * 100 : 0
                const isWinner = !isTie && index === 0 && result.votes > 0

                return (
                  <div key={result.candidate_id}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        {isWinner && (
                          <span className="text-yellow-500" title="Winner">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </span>
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900">{result.candidate_name}</h4>
                          <p className="text-xs text-gray-500">
                            {result.votes.toLocaleString()} {result.votes === 1 ? 'vote' : 'votes'} 
                            {totalVotes > 0 && ` (${percentage.toFixed(1)}%)`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{result.votes.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          isWinner ? 'bg-yellow-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {isTie && winner.votes > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> There is a tie for this position.
                </p>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}


