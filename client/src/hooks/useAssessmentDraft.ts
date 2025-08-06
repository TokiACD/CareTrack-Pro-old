import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '../services/api'
import AssessmentDraftStorage, { AssessmentDraftData } from '../utils/draftStorage'
import { useSmartMutation } from './useSmartMutation'

export type SaveStatus = 'idle' | 'saving_local' | 'saving_server' | 'saved_local' | 'saved_server' | 'error'

export interface DraftResolution {
  action: 'use_local' | 'use_server' | 'merge'
  localData: AssessmentDraftData
  serverData: AssessmentDraftData
  localAge: number
  serverAge: number
}

interface UseAssessmentDraftProps {
  assessmentId: string
  carerId: string
  enabled?: boolean
}

interface UseAssessmentDraftReturn {
  // Draft data and status
  draftData: AssessmentDraftData | null
  saveStatus: SaveStatus
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  
  // Draft operations
  saveDraftLocal: (data: AssessmentDraftData, isComplete?: boolean) => void
  saveDraftToServer: () => Promise<void>
  deleteDraft: () => Promise<void>
  loadDraft: () => void
  
  // Conflict resolution
  draftConflict: DraftResolution | null
  resolveDraftConflict: (resolution: 'use_local' | 'use_server' | 'merge') => void
  
  // Auto-save configuration
  setAutoSaveEnabled: (enabled: boolean) => void
  triggerServerSync: () => void
}

export function useAssessmentDraft({
  assessmentId,
  carerId,
  enabled = true
}: UseAssessmentDraftProps): UseAssessmentDraftReturn {
  const [draftData, setDraftData] = useState<AssessmentDraftData | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [draftConflict, setDraftConflict] = useState<DraftResolution | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)

  // Refs for debouncing and tracking
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const serverSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load server draft on mount
  const { data: serverDraft } = useQuery({
    queryKey: ['assessment-draft', assessmentId, carerId],
    queryFn: () => apiService.getDraftResponse<any>(assessmentId, carerId),
    enabled: enabled && !!assessmentId && !!carerId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0   // Don't cache draft data
  })

  // Save draft to server mutation
  const saveDraftMutation = useSmartMutation<any, Error, AssessmentDraftData>(
    async (data: AssessmentDraftData) => {
      return await apiService.saveDraftResponse(assessmentId, carerId, data)
    },
    {
      mutationType: 'assessments.saveDraft',
      onSuccess: () => {
        setSaveStatus('saved_server')
        AssessmentDraftStorage.markSynced(assessmentId, carerId)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        
        // Clear saved status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle')
        }, 3000)
      },
      onError: (error: any) => {
        console.error('Failed to save draft to server:', error)
        setSaveStatus('error')
        
        // Revert to local saved status
        setTimeout(() => {
          setSaveStatus('saved_local')
        }, 2000)
      }
    }
  )

  // Delete draft mutation
  const deleteDraftMutation = useSmartMutation<void, Error, void>(
    async () => {
      await apiService.deleteDraftResponse(assessmentId, carerId)
    },
    {
      mutationType: 'assessments.deleteDraft',
      onSuccess: () => {
        AssessmentDraftStorage.deleteDraft(assessmentId, carerId)
        setDraftData(null)
        setHasUnsavedChanges(false)
        setSaveStatus('idle')
        setLastSaved(null)
      }
    }
  )

  // Save to localStorage (immediate)
  const saveDraftLocal = useCallback((data: AssessmentDraftData, isComplete = false) => {
    setSaveStatus('saving_local')
    
    try {
      AssessmentDraftStorage.saveDraft(assessmentId, carerId, data, {
        isComplete,
        syncedToServer: false
      })
      
      setSaveStatus('saved_local')
      setLastSaved(new Date())
      setDraftData(data)
      setHasUnsavedChanges(true)
      
      // Clear status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)

      // Schedule server sync if auto-save is enabled
      if (autoSaveEnabled) {
        scheduleServerSync()
      }
    } catch (error) {
      console.error('Failed to save draft locally:', error)
      setSaveStatus('error')
    }
  }, [assessmentId, carerId, autoSaveEnabled])

  // Schedule server sync with debouncing
  const scheduleServerSync = useCallback(() => {
    if (serverSyncTimeoutRef.current) {
      clearTimeout(serverSyncTimeoutRef.current)
    }
    
    // Sync to server after 2 seconds of inactivity
    serverSyncTimeoutRef.current = setTimeout(() => {
      if (draftData && hasUnsavedChanges) {
        saveDraftToServer()
      }
    }, 2000)
  }, [draftData, hasUnsavedChanges])

  // Save draft to server
  const saveDraftToServer = useCallback(async () => {
    if (!draftData) return
    
    setSaveStatus('saving_server')
    await saveDraftMutation.mutateAsync(draftData)
  }, [draftData, saveDraftMutation])

  // Trigger immediate server sync
  const triggerServerSync = useCallback(() => {
    if (serverSyncTimeoutRef.current) {
      clearTimeout(serverSyncTimeoutRef.current)
    }
    saveDraftToServer()
  }, [saveDraftToServer])

  // Delete draft
  const deleteDraft = useCallback(async () => {
    await deleteDraftMutation.mutateAsync()
  }, [deleteDraftMutation])

  // Load draft from localStorage or server
  const loadDraft = useCallback(() => {
    const localDraft = AssessmentDraftStorage.loadDraft(assessmentId, carerId)
    
    if (localDraft && serverDraft) {
      // Compare timestamps and detect conflicts
      const comparison = AssessmentDraftStorage.compareDrafts(localDraft, {
        draftData: serverDraft.draftData,
        lastSaved: serverDraft.lastSaved
      })
      
      if (comparison !== 'same') {
        // Conflict detected
        const localAge = AssessmentDraftStorage.getDraftAge(assessmentId, carerId) || 0
        const serverAge = Math.round((Date.now() - new Date(serverDraft.lastSaved).getTime()) / 60000)
        
        setDraftConflict({
          action: comparison === 'local_newer' ? 'use_local' : 'use_server',
          localData: localDraft.data,
          serverData: serverDraft.draftData,
          localAge,
          serverAge
        })
        return
      }
    }
    
    // No conflict, use local or server draft
    const draftToUse = localDraft?.data || serverDraft?.draftData
    if (draftToUse) {
      setDraftData(draftToUse)
      setHasUnsavedChanges(localDraft?.metadata?.syncedToServer === false)
      
      const timestamp = localDraft ? 
        new Date(localDraft.metadata.lastSaved) : 
        new Date(serverDraft?.lastSaved || Date.now())
      setLastSaved(timestamp)
    }
  }, [assessmentId, carerId, serverDraft])

  // Resolve draft conflict
  const resolveDraftConflict = useCallback((resolution: 'use_local' | 'use_server' | 'merge') => {
    if (!draftConflict) return
    
    let resolvedData: AssessmentDraftData
    
    switch (resolution) {
      case 'use_local':
        resolvedData = draftConflict.localData
        break
      case 'use_server':
        resolvedData = draftConflict.serverData
        break
      case 'merge':
        resolvedData = AssessmentDraftStorage.mergeDrafts(
          draftConflict.localData,
          draftConflict.serverData
        )
        break
    }
    
    // Update local storage and state
    saveDraftLocal(resolvedData)
    setDraftConflict(null)
  }, [draftConflict, saveDraftLocal])

  // Load draft when component mounts or dependencies change
  useEffect(() => {
    if (enabled && assessmentId && carerId) {
      loadDraft()
    }
  }, [enabled, assessmentId, carerId, serverDraft, loadDraft])

  // Auto-save on window events
  useEffect(() => {
    if (!autoSaveEnabled || !draftData || !hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Try to sync to server immediately
        navigator.sendBeacon && navigator.sendBeacon(
          `/api/assessments/${assessmentId}/carer/${carerId}/draft`,
          JSON.stringify({ draftData })
        )
        
        // Browser warning
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && hasUnsavedChanges) {
        // Page is being hidden, trigger server sync
        triggerServerSync()
      }
    }

    const handleFocus = () => {
      if (!document.hidden && hasUnsavedChanges) {
        // Page regained focus, sync any local changes
        scheduleServerSync()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [autoSaveEnabled, draftData, hasUnsavedChanges, assessmentId, carerId, triggerServerSync, scheduleServerSync])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (serverSyncTimeoutRef.current) clearTimeout(serverSyncTimeoutRef.current)
    }
  }, [])

  return {
    draftData,
    saveStatus,
    lastSaved,
    hasUnsavedChanges,
    saveDraftLocal,
    saveDraftToServer,
    deleteDraft,
    loadDraft,
    draftConflict,
    resolveDraftConflict,
    setAutoSaveEnabled,
    triggerServerSync
  }
}