'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Card from '@/components/Card'
import Button from '@/components/Button'
import AlertDialog, { ConfirmDialog } from '@/components/AlertDialog'
import { useAlert, useConfirm } from '@/lib/useAlert'
import { db, type Election } from '@/lib/supabaseClient'
import { uploadImage, validateImageFile, deleteImage } from '@/lib/imageUpload'

interface PositionsTabProps {
  electionId: string
  election: Election | null
  onUpdate: () => void
}

export default function PositionsTab({ electionId, election, onUpdate }: PositionsTabProps) {
  const [positions, setPositions] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPositionModal, setShowAddPositionModal] = useState(false)
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false)
  const [editingPosition, setEditingPosition] = useState<any>(null)
  const [editingCandidate, setEditingCandidate] = useState<any>(null)

  // Form states
  const [positionName, setPositionName] = useState('')
  const [positionDescription, setPositionDescription] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [candidateBio, setCandidateBio] = useState('')
  const [candidatePhotoUrl, setCandidatePhotoUrl] = useState('')
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [savingPosition, setSavingPosition] = useState(false)
  const [savingCandidate, setSavingCandidate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { alert, showAlert, closeAlert } = useAlert()
  const { confirm, showConfirm, closeConfirm } = useConfirm()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // Use optimized batch function instead of separate queries
      const { positions: positionsData, candidates: candidatesData } = await db.getPositionsAndCandidates(electionId)
      setPositions(positionsData)
      setCandidates(candidatesData)
    } catch (error) {
      console.error('Failed to load positions and candidates:', error)
    } finally {
      setLoading(false)
    }
  }, [electionId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openAddPositionModal() {
    setPositionName('')
    setPositionDescription('')
    setEditingPosition(null)
    setShowAddPositionModal(true)
  }

  function openEditPositionModal(position: any) {
    setPositionName(position.name)
    setPositionDescription(position.description || '')
    setEditingPosition(position)
    setShowAddPositionModal(true)
  }

  function openAddCandidateModal(presetPositionId?: string) {
    if (positions.length === 0) {
      showAlert('Please add at least one position before adding candidates.', {
        title: 'No Positions',
        type: 'warning',
      })
      return
    }
    if (!presetPositionId && positions.length > 0 && !positions[0]?.id) {
      console.error('Invalid position data:', positions)
      showAlert('Error: Invalid position data. Please refresh the page.', {
        title: 'Error',
        type: 'error',
      })
      return
    }
    setCandidateName('')
    setCandidateBio('')
    setCandidatePhotoUrl('')
    setImagePreview(null)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    const positionId = presetPositionId || (positions.length > 0 ? positions[0].id : '')
    if (!positionId) {
      showAlert('No position available. Please add a position first.', {
        title: 'No Position',
        type: 'warning',
      })
      return
    }
    setSelectedPositionId(positionId)
    setEditingCandidate(null)
    setShowAddCandidateModal(true)
  }

  function openEditCandidateModal(candidate: any) {
    setCandidateName(candidate.name)
    setCandidateBio(candidate.bio || '')
    setCandidatePhotoUrl(candidate.photo_url || '')
    setImagePreview(candidate.photo_url || null)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setSelectedPositionId(candidate.position_id)
    setEditingCandidate(candidate)
    setShowAddCandidateModal(true)
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      showAlert(validation.error || 'Invalid image file', {
        title: 'Invalid File',
        type: 'error',
      })
      return
    }

    setImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleImageUpload(): Promise<string | null> {
    if (!imageFile) return candidatePhotoUrl

    try {
      setUploadingImage(true)
      
      // Delete old image if editing and has existing photo
      if (editingCandidate?.photo_url && editingCandidate.photo_url !== candidatePhotoUrl) {
        await deleteImage(editingCandidate.photo_url)
      }

      // Upload new image
      const uploadedUrl = await uploadImage(imageFile, 'candidates')
      setCandidatePhotoUrl(uploadedUrl)
      setImagePreview(uploadedUrl)
      return uploadedUrl
    } catch (error: any) {
      showAlert(error.message || 'Failed to upload image', {
        title: 'Upload Failed',
        type: 'error',
      })
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSavePosition(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent double submission
    if (savingPosition) return
    
    if (!positionName.trim()) {
      showAlert('Position name is required', {
        title: 'Validation Error',
        type: 'warning',
      })
      return
    }

    setSavingPosition(true)
    try {
      if (editingPosition) {
        await db.updatePosition(editingPosition.id, {
          name: positionName,
          description: positionDescription,
        })
      } else {
        await db.createPosition(electionId, {
          name: positionName,
          description: positionDescription,
        })
      }
      setShowAddPositionModal(false)
      setPositionName('')
      setPositionDescription('')
      setEditingPosition(null)
      await loadData()
      onUpdate()
    } catch (error: any) {
      showAlert(error.message || 'Failed to save position', {
        title: 'Error',
        type: 'error',
      })
    } finally {
      setSavingPosition(false)
    }
  }

  async function handleSaveCandidate(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent double submission
    if (savingCandidate) return
    
    if (!candidateName.trim()) {
      showAlert('Candidate name is required', {
        title: 'Validation Error',
        type: 'warning',
      })
      return
    }
    if (!selectedPositionId) {
      showAlert('Please select a position', {
        title: 'Validation Error',
        type: 'warning',
      })
      return
    }

    setSavingCandidate(true)
    try {
      // Upload image if a new file was selected
      let finalPhotoUrl = candidatePhotoUrl
      if (imageFile) {
        const uploadedUrl = await handleImageUpload()
        if (!uploadedUrl) {
          setSavingCandidate(false)
          return // Upload failed, error already shown
        }
        finalPhotoUrl = uploadedUrl
      }

      if (editingCandidate) {
        await db.updateCandidate(editingCandidate.id, {
          name: candidateName,
          bio: candidateBio,
          photo_url: finalPhotoUrl,
        })
      } else {
        await db.createCandidate(electionId, {
          position_id: selectedPositionId,
          name: candidateName,
          bio: candidateBio,
          photo_url: finalPhotoUrl,
        })
      }
      setShowAddCandidateModal(false)
      setCandidateName('')
      setCandidateBio('')
      setCandidatePhotoUrl('')
      setImageFile(null)
      setImagePreview(null)
      setEditingCandidate(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await loadData()
      onUpdate()
    } catch (error: any) {
      console.error('Error saving candidate:', error)
      showAlert(error.message || 'Failed to save candidate', {
        title: 'Error',
        type: 'error',
      })
    } finally {
      setSavingCandidate(false)
    }
  }

  async function handleDeletePosition(positionId: string, positionName: string) {
    showConfirm(
      `Are you sure you want to delete the position "${positionName}"? This will also delete all candidates for this position.`,
      async () => {
        try {
          await db.deletePosition(positionId)
          await loadData()
          onUpdate()
        } catch (error: any) {
          showAlert(error.message || 'Failed to delete position', {
            title: 'Error',
            type: 'error',
          })
        }
      },
      {
        title: 'Delete Position',
        type: 'danger',
        confirmText: 'Delete',
      }
    )
  }

  async function handleDeleteCandidate(candidateId: string, candidateName: string) {
    showConfirm(
      `Are you sure you want to delete candidate "${candidateName}"?`,
      async () => {
        try {
          await db.deleteCandidate(candidateId)
          await loadData()
          onUpdate()
        } catch (error: any) {
          showAlert(error.message || 'Failed to delete candidate', {
            title: 'Error',
            type: 'error',
          })
        }
      },
      {
        title: 'Delete Candidate',
        type: 'danger',
        confirmText: 'Delete',
      }
    )
  }

  // Hooks must be called before any early returns
  // Group candidates by position - memoized for performance
  const candidatesByPosition = useMemo(() => {
    const map = new Map<string, any[]>()
    positions.forEach(position => {
      map.set(position.id, [])
    })
    candidates.forEach(candidate => {
      const positionCandidates = map.get(candidate.position_id) || []
      positionCandidates.push(candidate)
      map.set(candidate.position_id, positionCandidates)
    })
    return map
  }, [positions, candidates])

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading positions and candidates...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Positions & Candidates</h2>
        <div className="flex gap-2">
          <Button 
            onClick={(e) => {
              e.preventDefault()
              openAddCandidateModal()
            }}
            className={positions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Add Candidate
          </Button>
          <Button onClick={openAddPositionModal}>
            Add Position
          </Button>
        </div>
      </div>

      {positions.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600">No positions added yet.</p>
            <p className="text-sm text-gray-500 mt-2">Click "Add Position" to get started.</p>
          </div>
        </Card>
      ) : (
        positions.map((position) => {
          const positionCandidates = candidatesByPosition.get(position.id) || []
          return (
            <Card key={position.id}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{position.name}</h3>
                  {position.description && (
                    <p className="text-sm text-gray-600 mt-1">{position.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEditPositionModal(position)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeletePosition(position.id, position.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">
                  Candidates ({positionCandidates.length}):
                </p>
                {positionCandidates.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No candidates added yet</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {positionCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-primary/50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {candidate.photo_url && (
                              <img
                                src={candidate.photo_url}
                                alt={candidate.name}
                                className="w-16 h-16 rounded-full object-cover mb-2"
                              />
                            )}
                            <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                            {candidate.bio && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{candidate.bio}</p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => openEditCandidateModal(candidate)}
                              className="text-gray-400 hover:text-primary"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCandidate(candidate.id, candidate.name)}
                              className="text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => openAddCandidateModal(position.id)}
                >
                  + Add Candidate to {position.name}
                </Button>
              </div>
            </Card>
          )
        })
      )}

      {/* Add/Edit Position Modal */}
      {showAddPositionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingPosition ? 'Edit Position' : 'Add Position'}
            </h3>
            <form onSubmit={handleSavePosition} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={positionName}
                  onChange={(e) => setPositionName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="e.g. President"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  value={positionDescription}
                  onChange={(e) => setPositionDescription(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Brief description of the position..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddPositionModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingPosition}>
                  {savingPosition ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Saving...
                    </>
                  ) : (
                    editingPosition ? 'Update' : 'Add'
                  )} Position
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add/Edit Candidate Modal */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddCandidateModal(false)
          }
        }}>
          <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingCandidate ? 'Edit Candidate' : 'Add Candidate'}
              </h3>
              <button
                onClick={() => setShowAddCandidateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {positions.length === 0 ? (
              <div className="space-y-4">
                <p className="text-red-600">No positions available. Please add a position first.</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddCandidateModal(false)
                    openAddPositionModal()
                  }}
                >
                  Add Position
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSaveCandidate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedPositionId}
                    onChange={(e) => setSelectedPositionId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    disabled={editingCandidate !== null}
                  >
                    {!selectedPositionId && <option value="">Select a position</option>}
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                  </select>
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio (optional)
                </label>
                <textarea
                  rows={3}
                  value={candidateBio}
                  onChange={(e) => setCandidateBio(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Brief biography or description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Photo (optional)
                </label>
                <div className="space-y-3">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleImageSelect}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary file:text-white
                        hover:file:bg-primary-dark
                        file:cursor-pointer
                        cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Supported formats: JPEG, PNG, WebP, GIF (Max 5MB)
                    </p>
                  </div>
                  
                  {(imagePreview || candidatePhotoUrl) && (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview || candidatePhotoUrl}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      {imageFile && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}

                  {uploadingImage && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Uploading image...</span>
                    </div>
                  )}

                  {/* Fallback: Manual URL input */}
                  <details className="mt-2">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-primary">
                      Or enter image URL manually
                    </summary>
                    <input
                      type="url"
                      value={candidatePhotoUrl}
                      onChange={(e) => {
                        setCandidatePhotoUrl(e.target.value)
                        if (!imageFile) {
                          setImagePreview(e.target.value)
                        }
                      }}
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm"
                      placeholder="https://example.com/photo.jpg"
                    />
                  </details>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddCandidateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingCandidate}>
                  {savingCandidate ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Saving...
                    </>
                  ) : (
                    editingCandidate ? 'Update' : 'Add'
                  )} Candidate
                </Button>
              </div>
              </form>
            )}
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


