import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '../services/logger'

interface UseSmartRefreshOptions {
  queryKeysToRefresh?: string[][]
  enabled?: boolean
  onRefresh?: () => void
  refreshOnMount?: boolean // New option to refresh data when component mounts
}

/**
 * Smart refresh hook that provides reliable data updates through:
 * 1. Manual refresh capability
 * 2. Auto-refresh on page focus (when returning to browser tab)
 * 3. Auto-refresh on navigation (when navigating between admin sections)
 */
export const useSmartRefresh = (options: UseSmartRefreshOptions = {}) => {
  const {
    queryKeysToRefresh = [],
    enabled = true,
    onRefresh,
    refreshOnMount = false
  } = options

  const queryClient = useQueryClient()
  const lastRefreshRef = useRef<number>(0)

  // Manual refresh function that invalidates and refetches all relevant queries
  const refresh = useCallback((force = false) => {
    if (!enabled) return

    // Enhanced debounce to prevent excessive refreshes (minimum 5 seconds between refreshes)
    // BUT allow force refresh to bypass debounce for critical operations
    const now = Date.now()
    if (!force && now - lastRefreshRef.current < 5000) {
      logger.debug('🚫 Smart refresh debounced - too soon since last refresh', { 
        timeSinceLastRefresh: now - lastRefreshRef.current,
        minInterval: 5000 
      }, 'refresh')
      return
    }
    lastRefreshRef.current = now

    logger.debug('🔄 Smart refresh triggered', { queryKeysToRefresh }, 'refresh')

    // MORE AGGRESSIVE: Remove queries from cache entirely, then refetch
    const queryPredicate = (query: any) => {
      const queryKey = query.queryKey
      if (!Array.isArray(queryKey)) return false
      
      // Match queries that start with these patterns
      return (
        (queryKey.length >= 2 && queryKey[0] === 'users' && (queryKey[1] === 'admins' || queryKey[1] === 'carers')) ||
        (queryKey.length >= 1 && queryKey[0] === 'invitations') ||
        (queryKey.length >= 1 && queryKey[0] === 'invitations-pending-count') ||
        (queryKey.length >= 1 && queryKey[0] === 'carers-ready-for-assessment') ||
        (queryKey.length >= 1 && queryKey[0] === 'confirmed-shifts-count') ||
        (queryKey.length >= 1 && queryKey[0] === 'recycle-bin') ||
        (queryKey.length >= 1 && queryKey[0] === 'recycle-bin-summary')
      )
    }

    // STAGGERED APPROACH: Invalidate queries in batches to prevent rate limiting
    console.log('🎯 Starting staggered cache invalidation...');
    
    // Step 1: Invalidate specific query keys first (user-provided) with longer delays
    queryKeysToRefresh.forEach((queryKey, index) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey })
        console.log(`✅ Invalidated specific query [${index}]:`, queryKey);
      }, index * 200) // Increased to 200ms between each specific invalidation
    })
    
    // Step 2: Stagger invalidation of broader query patterns with even more delay
    const staggerDelay = queryKeysToRefresh.length * 200 + 500; // Increased delays
    setTimeout(() => {
      console.log('🔄 Invalidating broader query patterns...');
      
      // Invalidate user queries one by one with delays to prevent overwhelming
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['users', 'admins'],
          exact: false 
        });
        console.log('✅ Invalidated users.admins queries');
      }, 0);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['users', 'carers'],
          exact: false 
        });
        console.log('✅ Invalidated users.carers queries');
      }, 300); // 300ms delay between each pattern
      
      console.log('✅ All broader patterns scheduled for invalidation');
    }, staggerDelay);

    // Call custom refresh handler
    if (onRefresh) {
      onRefresh()
    }

    logger.info('✅ Smart refresh completed', {}, 'refresh')
  }, [enabled, queryKeysToRefresh, queryClient, onRefresh])

  // Auto-refresh on page focus (when user returns to browser tab)
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.debug('👀 Page became visible, triggering gentle refresh', {}, 'refresh')
        // Small delay to ensure page is fully visible, and don't force refresh
        setTimeout(() => refresh(false), 1000) // Longer delay and gentle refresh
      }
    }

    const handleFocus = () => {
      logger.debug('🎯 Window focused, triggering gentle refresh', {}, 'refresh')
      refresh(false) // Don't force refresh to respect debounce
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [enabled, refresh])

  // Refresh on mount if requested
  useEffect(() => {
    if (refreshOnMount && enabled) {
      logger.debug('🚀 Component mounted, triggering initial refresh', {}, 'refresh')
      // Small delay to ensure component is fully mounted and queries are ready
      setTimeout(refresh, 100)
    }
  }, [refreshOnMount, enabled, refresh])

  // Navigation refresh - to be called when navigating between admin sections
  const refreshOnNavigation = useCallback((section: string) => {
    logger.debug(`🧭 Navigation to ${section}, triggering gentle refresh`, {}, 'refresh')
    refresh(false) // Don't force refresh to respect debounce timing
  }, [refresh])

  return {
    refresh,
    refreshOnNavigation,
    isEnabled: enabled
  }
}

// Utility hook for triggering refresh across the entire admin dashboard
export const useAdminDashboardRefresh = (options: { refreshOnMount?: boolean } = {}) => {
  return useSmartRefresh({
    queryKeysToRefresh: [
      ['users', 'admins'],
      ['users', 'carers'],
      ['invitations'],
      ['invitations-pending-count']
    ],
    enabled: true,
    refreshOnMount: options.refreshOnMount ?? false // Default to NOT refresh on mount to prevent excessive calls
  })
}