import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook to prevent memory leaks from event listeners
 * Automatically cleans up event listeners on unmount
 */
export const useEventListener = (
  eventName: string,
  handler: (event: Event) => void,
  element?: Element | Window | null,
  options?: AddEventListenerOptions
) => {
  const savedHandler = useRef<(event: Event) => void>()

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    const targetElement = element ?? window
    if (!(targetElement && targetElement.addEventListener)) return

    const eventListener = (event: Event) => savedHandler.current?.(event)
    targetElement.addEventListener(eventName, eventListener, options)

    return () => {
      targetElement.removeEventListener(eventName, eventListener, options)
    }
  }, [eventName, element, options])
}

/**
 * Hook to prevent memory leaks from intervals
 * Automatically clears intervals on unmount
 */
export const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef<() => void>()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return

    const tick = () => savedCallback.current?.()
    const id = setInterval(tick, delay)

    return () => clearInterval(id)
  }, [delay])
}

/**
 * Hook to prevent memory leaks from timeouts
 * Automatically clears timeouts on unmount or dependency change
 */
export const useTimeout = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef<() => void>()
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }, [])

  useEffect(() => {
    if (delay === null) return

    timeoutRef.current = setTimeout(() => savedCallback.current?.(), delay)

    return clearCurrentTimeout
  }, [delay, clearCurrentTimeout])

  return clearCurrentTimeout
}

/**
 * Hook to prevent memory leaks from observers
 * Automatically disconnects observers on unmount
 */
export const useIntersectionObserver = (
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
): IntersectionObserverEntry | null => {
  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      options
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [elementRef, options])

  return entry
}

/**
 * Hook to prevent memory leaks from ResizeObserver
 * Automatically disconnects observer on unmount
 */
export const useResizeObserver = (
  elementRef: React.RefObject<Element>,
  callback: (entry: ResizeObserverEntry) => void
) => {
  const savedCallback = useRef<(entry: ResizeObserverEntry) => void>()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => savedCallback.current?.(entry))
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [elementRef])
}

/**
 * Hook to prevent memory leaks from MutationObserver
 * Automatically disconnects observer on unmount
 */
export const useMutationObserver = (
  elementRef: React.RefObject<Element>,
  callback: (mutations: MutationRecord[]) => void,
  options?: MutationObserverInit
) => {
  const savedCallback = useRef<(mutations: MutationRecord[]) => void>()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new MutationObserver((mutations) => {
      savedCallback.current?.(mutations)
    })

    observer.observe(element, options)

    return () => {
      observer.disconnect()
    }
  }, [elementRef, options])
}

/**
 * Hook to track component mount/unmount and log memory usage
 * Useful for debugging memory leaks in development
 */
export const useMemoryTracker = (componentName: string) => {
  const mountTime = useRef<number>(Date.now())

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`🟢 ${componentName} mounted`)
      
      // Log memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory
        console.log(`📊 Memory at mount: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`)
      }
    }

    return () => {
      if (import.meta.env.DEV) {
        const lifeTime = Date.now() - mountTime.current
        console.log(`🔴 ${componentName} unmounted (lived ${lifeTime}ms)`)
        
        // Log memory usage if available
        if ('memory' in performance) {
          const memory = (performance as any).memory
          console.log(`📊 Memory at unmount: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`)
        }
      }
    }
  }, [componentName])
}

/**
 * Hook to clean up async operations and prevent state updates on unmounted components
 * Returns a ref that tracks mount status
 */
export const useIsMounted = () => {
  const isMountedRef = useRef<boolean>(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return useCallback(() => isMountedRef.current, [])
}

/**
 * Hook to safely set state only if component is still mounted
 * Prevents memory leaks from async operations updating unmounted components
 */
export const useSafeState = <T>(initialState: T): [T, (newState: T | ((prevState: T) => T)) => void] => {
  const [state, setState] = React.useState<T>(initialState)
  const isMounted = useIsMounted()

  const safeSetState = useCallback((newState: T | ((prevState: T) => T)) => {
    if (isMounted()) {
      setState(newState)
    } else if (import.meta.env.DEV) {
      console.warn('Attempted to set state on unmounted component')
    }
  }, [isMounted])

  return [state, safeSetState]
}

/**
 * Hook to create an AbortController and automatically abort on unmount
 * Useful for cancelling fetch requests and preventing memory leaks
 */
export const useAbortController = (): AbortController => {
  const abortController = useRef<AbortController>(new AbortController())

  useEffect(() => {
    return () => {
      abortController.current.abort()
    }
  }, [])

  // Create a new controller if the current one is aborted
  if (abortController.current.signal.aborted) {
    abortController.current = new AbortController()
  }

  return abortController.current
}

/**
 * Hook to automatically cleanup resources on unmount
 * Accepts cleanup functions and calls them on unmount
 */
export const useCleanup = (...cleanupFunctions: (() => void)[]) => {
  useEffect(() => {
    return () => {
      cleanupFunctions.forEach((cleanup) => {
        try {
          cleanup()
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error during cleanup:', error)
          }
        }
      })
    }
  }, [cleanupFunctions])
}