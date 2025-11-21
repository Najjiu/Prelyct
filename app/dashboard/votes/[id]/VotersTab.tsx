'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import Table, { TableRow, TableCell } from '@/components/Table'
import AlertDialog, { ConfirmDialog } from '@/components/AlertDialog'
import { useAlert, useConfirm } from '@/lib/useAlert'
import { db, type Election } from '@/lib/supabaseClient'

interface VotersTabProps {
  electionId: string
  election: Election | null
}

export default function VotersTab({ electionId, election }: VotersTabProps) {
  const [voters, setVoters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const { alert, showAlert, closeAlert } = useAlert()
  const { confirm, showConfirm, closeConfirm } = useConfirm()

  useEffect(() => {
    loadVoters()
  }, [electionId])

  async function loadVoters() {
    if (!election || election.mode !== 'institutional') {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await db.getVoters(electionId)
      setVoters(data)
    } catch (error) {
      console.error('Failed to load voters:', error)
    } finally {
      setLoading(false)
    }
  }

  function parseCSV(file: File): Promise<Array<{ identifier: string; name?: string; email?: string }>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length === 0) {
            reject(new Error('CSV file is empty'))
            return
          }

          // Parse header
          const header = lines[0].split(',').map(h => h.trim().toLowerCase())
          const identifierIndex = header.findIndex(h => h === 'identifier' || h === 'voter id' || h === 'id' || h === 'student id')
          const nameIndex = header.findIndex(h => h === 'name' || h === 'full name' || h === 'student name')
          const emailIndex = header.findIndex(h => h === 'email' || h === 'email address')

          if (identifierIndex === -1) {
            reject(new Error('CSV must contain an "identifier" column (or "voter id", "id", "student id")'))
            return
          }

          // Parse rows
          const voters: Array<{ identifier: string; name?: string; email?: string }> = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim())
            const identifier = values[identifierIndex]
            
            if (!identifier) {
              continue // Skip empty rows
            }

            voters.push({
              identifier,
              name: nameIndex !== -1 ? values[nameIndex] : undefined,
              email: emailIndex !== -1 ? values[emailIndex] : undefined,
            })
          }

          resolve(voters)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  async function handleImport() {
    if (!importFile) return

    try {
      setImporting(true)
      setImportResults(null)

      const voters = await parseCSV(importFile)
      
      if (voters.length === 0) {
        showAlert('No valid voters found in CSV file', {
          title: 'Import Error',
          type: 'warning',
        })
        setImporting(false)
        return
      }

      const results = await db.importVoters(electionId, voters)
      setImportResults(results)

      if (results.success > 0) {
        await loadVoters() // Reload voters list
      }

      if (results.failed > 0) {
        console.warn('Some voters failed to import:', results.errors)
      }
    } catch (error: any) {
      showAlert(error.message || 'Failed to import voters', {
        title: 'Import Failed',
        type: 'error',
      })
    } finally {
      setImporting(false)
    }
  }

  if (!election || election.mode !== 'institutional') {
    return (
      <Card>
        <p className="text-gray-600">Voter management is only available for institutional elections.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Voters</h2>
        <Button onClick={() => setShowImportModal(true)}>Import voters</Button>
      </div>

      {loading ? (
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading voters...</p>
          </div>
        </Card>
      ) : voters.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600">No voters imported yet.</p>
            <p className="text-sm text-gray-500 mt-2">Click "Import voters" to upload a CSV file.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Total voters: <span className="font-semibold">{voters.length}</span> | 
              Voted: <span className="font-semibold text-green-600">{voters.filter(v => v.has_voted).length}</span> | 
              Not voted: <span className="font-semibold text-orange-600">{voters.filter(v => !v.has_voted).length}</span>
            </p>
          </div>
          <Table headers={['Identifier', 'Name', 'Email', 'Status', 'Actions']}>
            {voters.map((voter) => (
              <TableRow key={voter.id}>
                <TableCell className="font-mono text-sm">{voter.identifier}</TableCell>
                <TableCell>{voter.name || '-'}</TableCell>
                <TableCell>{voter.email || '-'}</TableCell>
                <TableCell>
                  {voter.has_voted ? (
                    <Badge variant="success">Voted</Badge>
                  ) : (
                    <Badge variant="warning">Not voted</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      showConfirm(
                        `Delete voter ${voter.identifier}?`,
                        async () => {
                          try {
                            await db.deleteVoter(voter.id)
                            await loadVoters()
                          } catch (error: any) {
                            showAlert(error.message || 'Failed to delete voter', {
                              title: 'Error',
                              type: 'error',
                            })
                          }
                        },
                        {
                          title: 'Delete Voter',
                          type: 'danger',
                          confirmText: 'Delete',
                        }
                      )
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Import Voters from CSV</h3>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setImportResults(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                />
                <p className="mt-2 text-xs text-gray-500">
                  CSV format: identifier, name (optional), email (optional)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">CSV Format Example:</h4>
                <pre className="text-xs text-blue-800 font-mono bg-white p-2 rounded border border-blue-200">
{`identifier,name,email
STU001,John Doe,john@example.com
STU002,Jane Smith,jane@example.com
STU003,Bob Johnson,bob@example.com`}
                </pre>
                <p className="mt-2 text-xs text-blue-700">
                  <strong>Required:</strong> identifier column (can be named "identifier", "voter id", "id", or "student id")<br />
                  <strong>Optional:</strong> name, email columns
                </p>
              </div>

              {importResults && (
                <div className={`rounded-lg p-4 ${
                  importResults.failed === 0 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <h4 className="text-sm font-semibold mb-2">
                    Import Results:
                  </h4>
                  <p className="text-sm">
                    <span className="text-green-600 font-semibold">✓ {importResults.success} voters imported successfully</span>
                    {importResults.failed > 0 && (
                      <span className="text-red-600 font-semibold ml-4">✗ {importResults.failed} failed</span>
                    )}
                  </p>
                  {importResults.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <p className="text-xs font-semibold text-red-700 mb-1">Errors:</p>
                      <ul className="text-xs text-red-600 space-y-1">
                        {importResults.errors.slice(0, 10).map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                        {importResults.errors.length > 10 && (
                          <li className="text-gray-500">... and {importResults.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportResults(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                >
                  {importing ? 'Importing...' : 'Import Voters'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog
        open={alert.open}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        confirmText={alert.confirmText}
        onClose={closeAlert}
        onConfirm={alert.onConfirm}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        type={confirm.type}
        confirmText={confirm.confirmText}
        cancelText={confirm.cancelText}
        onClose={closeConfirm}
        onConfirm={confirm.onConfirm}
      />
    </div>
  )
}

