/**
 * LocalStorage utility for assessment draft persistence
 * Handles hybrid storage strategy with smart conflict resolution
 */

export interface AssessmentDraftData {
  carerId: string;
  assessorUniqueId?: string;
  overallRating: string;
  knowledgeResponses: Array<{
    questionId: string;
    carerAnswer: string;
  }>;
  practicalResponses: Array<{
    skillId: string;
    rating: string;
  }>;
  emergencyResponses: Array<{
    questionId: string;
    carerAnswer: string;
  }>;
}

export interface DraftMetadata {
  lastSaved: number; // timestamp
  isComplete: boolean;
  syncedToServer: boolean;
  version: number;
}

export interface StoredDraft {
  data: AssessmentDraftData;
  metadata: DraftMetadata;
}

export class AssessmentDraftStorage {
  private static generateKey(assessmentId: string, carerId: string): string {
    return `assessment_draft_${assessmentId}_${carerId}`;
  }

  /**
   * Save draft data to localStorage with metadata
   */
  static saveDraft(
    assessmentId: string,
    carerId: string,
    data: AssessmentDraftData,
    options: {
      isComplete?: boolean;
      syncedToServer?: boolean;
    } = {}
  ): void {
    try {
      const key = this.generateKey(assessmentId, carerId);
      const existing = this.loadDraft(assessmentId, carerId);
      
      const draft: StoredDraft = {
        data,
        metadata: {
          lastSaved: Date.now(),
          isComplete: options.isComplete || false,
          syncedToServer: options.syncedToServer || false,
          version: existing ? existing.metadata.version + 1 : 1
        }
      };

      localStorage.setItem(key, JSON.stringify(draft));
      
      // Clean up old drafts if storage is getting full
      this.cleanupOldDrafts();
    } catch (error) {
      console.warn('Failed to save draft to localStorage:', error);
    }
  }

  /**
   * Load draft data from localStorage
   */
  static loadDraft(assessmentId: string, carerId: string): StoredDraft | null {
    try {
      const key = this.generateKey(assessmentId, carerId);
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      const draft: StoredDraft = JSON.parse(stored);
      
      // Validate structure
      if (!draft.data || !draft.metadata) {
        console.warn('Invalid draft structure, removing:', key);
        this.deleteDraft(assessmentId, carerId);
        return null;
      }
      
      return draft;
    } catch (error) {
      console.warn('Failed to load draft from localStorage:', error);
      return null;
    }
  }

  /**
   * Delete draft from localStorage
   */
  static deleteDraft(assessmentId: string, carerId: string): void {
    try {
      const key = this.generateKey(assessmentId, carerId);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to delete draft from localStorage:', error);
    }
  }

  /**
   * Check if a draft exists
   */
  static hasDraft(assessmentId: string, carerId: string): boolean {
    return this.loadDraft(assessmentId, carerId) !== null;
  }

  /**
   * Get draft age in minutes
   */
  static getDraftAge(assessmentId: string, carerId: string): number | null {
    const draft = this.loadDraft(assessmentId, carerId);
    if (!draft) return null;
    
    return Math.round((Date.now() - draft.metadata.lastSaved) / 60000);
  }

  /**
   * Mark draft as synced to server
   */
  static markSynced(assessmentId: string, carerId: string): void {
    const draft = this.loadDraft(assessmentId, carerId);
    if (!draft) return;
    
    draft.metadata.syncedToServer = true;
    draft.metadata.lastSaved = Date.now();
    
    try {
      const key = this.generateKey(assessmentId, carerId);
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (error) {
      console.warn('Failed to mark draft as synced:', error);
    }
  }

  /**
   * Get all assessment drafts for cleanup/debugging
   */
  static getAllDrafts(): Array<{ key: string; draft: StoredDraft; age: number }> {
    const drafts: Array<{ key: string; draft: StoredDraft; age: number }> = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('assessment_draft_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const draft: StoredDraft = JSON.parse(stored);
              const age = Math.round((Date.now() - draft.metadata.lastSaved) / 60000);
              drafts.push({ key, draft, age });
            } catch {
              // Invalid draft, skip
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get all drafts:', error);
    }
    
    return drafts;
  }

  /**
   * Clean up old drafts to prevent localStorage bloat
   */
  static cleanupOldDrafts(): void {
    try {
      const allDrafts = this.getAllDrafts();
      const thirtyDaysAgo = 30 * 24 * 60; // 30 days in minutes
      
      // Remove drafts older than 30 days
      allDrafts.forEach(({ key, age }) => {
        if (age > thirtyDaysAgo) {
          localStorage.removeItem(key);
        }
      });
      
      // If we still have too many drafts, remove the oldest completed ones
      const completedDrafts = allDrafts
        .filter(({ draft }) => draft.metadata.isComplete && draft.metadata.syncedToServer)
        .sort((a, b) => b.age - a.age); // oldest first
      
      if (completedDrafts.length > 10) {
        completedDrafts.slice(10).forEach(({ key }) => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.warn('Failed to cleanup old drafts:', error);
    }
  }

  /**
   * Compare local draft with server draft for conflict resolution
   */
  static compareDrafts(
    localDraft: StoredDraft,
    serverDraft: { draftData: AssessmentDraftData; lastSaved: string }
  ): 'local_newer' | 'server_newer' | 'same' {
    const localTimestamp = localDraft.metadata.lastSaved;
    const serverTimestamp = new Date(serverDraft.lastSaved).getTime();
    
    const timeDiff = Math.abs(localTimestamp - serverTimestamp);
    
    // If timestamps are within 5 seconds, consider them the same
    if (timeDiff < 5000) return 'same';
    
    return localTimestamp > serverTimestamp ? 'local_newer' : 'server_newer';
  }

  /**
   * Merge draft data intelligently (prefer non-empty values)
   */
  static mergeDrafts(
    localData: AssessmentDraftData,
    serverData: AssessmentDraftData
  ): AssessmentDraftData {
    return {
      carerId: localData.carerId, // Should be the same
      assessorUniqueId: localData.assessorUniqueId || serverData.assessorUniqueId,
      overallRating: localData.overallRating !== 'NOT_ASSESSED' ? localData.overallRating : serverData.overallRating,
      knowledgeResponses: this.mergeResponses(
        localData.knowledgeResponses,
        serverData.knowledgeResponses,
        'questionId',
        'carerAnswer'
      ),
      practicalResponses: this.mergeResponses(
        localData.practicalResponses,
        serverData.practicalResponses,
        'skillId',
        'rating'
      ),
      emergencyResponses: this.mergeResponses(
        localData.emergencyResponses,
        serverData.emergencyResponses,
        'questionId',
        'carerAnswer'
      )
    };
  }

  /**
   * Helper to merge response arrays
   */
  private static mergeResponses<T extends Record<string, any>>(
    localResponses: T[],
    serverResponses: T[],
    idField: keyof T,
    valueField: keyof T
  ): T[] {
    const merged = new Map<string, T>();
    
    // Start with server responses
    serverResponses.forEach(response => {
      merged.set(response[idField] as string, response);
    });
    
    // Override with local responses that have values
    localResponses.forEach(localResponse => {
      const id = localResponse[idField] as string;
      const serverResponse = merged.get(id);
      
      // Prefer local if it has a meaningful value
      const localValue = localResponse[valueField];
      const hasLocalValue = localValue && 
        (typeof localValue === 'string' ? localValue.trim() : true);
      
      if (hasLocalValue || !serverResponse) {
        merged.set(id, localResponse);
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * Clear all assessment drafts (for testing/debugging)
   */
  static clearAllDrafts(): void {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('assessment_draft_')) {
          keys.push(key);
        }
      }
      
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear all drafts:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  static getStorageStats(): {
    totalDrafts: number;
    totalSize: number;
    oldestDraft: number | null;
    newestDraft: number | null;
  } {
    const allDrafts = this.getAllDrafts();
    const totalSize = allDrafts.reduce((size, { key }) => {
      const stored = localStorage.getItem(key);
      return size + (stored ? stored.length : 0);
    }, 0);
    
    const ages = allDrafts.map(({ age }) => age).sort((a, b) => a - b);
    
    return {
      totalDrafts: allDrafts.length,
      totalSize,
      oldestDraft: ages.length > 0 ? ages[ages.length - 1] : null,
      newestDraft: ages.length > 0 ? ages[0] : null
    };
  }
}

// Export for ease of use
export default AssessmentDraftStorage;