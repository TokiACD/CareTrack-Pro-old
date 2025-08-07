import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@mui/material'

// Hook for managing focus and keyboard navigation
export function useFocusManagement() {
  const focusableElementsRef = useRef<HTMLElement[]>([])
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0)

  const updateFocusableElements = (container: HTMLElement | null) => {
    if (!container) return

    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]',
    ].join(', ')

    focusableElementsRef.current = Array.from(
      container.querySelectorAll(focusableSelectors)
    ) as HTMLElement[]
  }

  const focusElement = (index: number) => {
    const elements = focusableElementsRef.current
    if (elements.length === 0) return

    const targetIndex = Math.max(0, Math.min(index, elements.length - 1))
    const element = elements[targetIndex]
    
    if (element) {
      element.focus()
      setCurrentFocusIndex(targetIndex)
    }
  }

  const focusNext = () => {
    focusElement(currentFocusIndex + 1)
  }

  const focusPrevious = () => {
    focusElement(currentFocusIndex - 1)
  }

  const focusFirst = () => {
    focusElement(0)
  }

  const focusLast = () => {
    focusElement(focusableElementsRef.current.length - 1)
  }

  return {
    updateFocusableElements,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    currentFocusIndex,
  }
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
  onEnter?: () => void,
  onEscape?: () => void,
  onSpace?: () => void,
  onArrowKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
          if (onEnter) {
            event.preventDefault()
            onEnter()
          }
          break
        case 'Escape':
          if (onEscape) {
            event.preventDefault()
            onEscape()
          }
          break
        case ' ':
          if (onSpace) {
            event.preventDefault()
            onSpace()
          }
          break
        case 'ArrowUp':
          if (onArrowKeys) {
            event.preventDefault()
            onArrowKeys('up')
          }
          break
        case 'ArrowDown':
          if (onArrowKeys) {
            event.preventDefault()
            onArrowKeys('down')
          }
          break
        case 'ArrowLeft':
          if (onArrowKeys) {
            event.preventDefault()
            onArrowKeys('left')
          }
          break
        case 'ArrowRight':
          if (onArrowKeys) {
            event.preventDefault()
            onArrowKeys('right')
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onEnter, onEscape, onSpace, onArrowKeys])
}

// Hook for screen reader announcements
export function useScreenReader() {
  const [announcements, setAnnouncements] = useState<string[]>([])

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = `${priority}: ${message}`
    setAnnouncements(prev => [...prev, announcement])
    
    // Clear announcement after it's been read
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a !== announcement))
    }, 1000)
  }

  const announceSuccess = (message: string) => {
    announce(`Success: ${message}`, 'polite')
  }

  const announceError = (message: string) => {
    announce(`Error: ${message}`, 'assertive')
  }

  const announceNavigation = (location: string) => {
    announce(`Navigated to ${location}`, 'polite')
  }

  return {
    announce,
    announceSuccess,
    announceError,
    announceNavigation,
    announcements,
  }
}

// Hook for high contrast mode detection
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false)
  const theme = useTheme()

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const mediaQuery = window.matchMedia('(prefers-contrast: high)')
      setIsHighContrast(mediaQuery.matches)
    }

    checkHighContrast()
    
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    mediaQuery.addEventListener('change', checkHighContrast)
    
    return () => mediaQuery.removeEventListener('change', checkHighContrast)
  }, [])

  const getHighContrastStyles = () => {
    if (!isHighContrast) return {}

    return {
      backgroundColor: '#000000',
      color: '#ffffff',
      borderColor: '#ffffff',
      '& .MuiButton-contained': {
        backgroundColor: '#ffffff',
        color: '#000000',
        border: '2px solid #ffffff',
      },
      '& .MuiCard-root': {
        backgroundColor: '#000000',
        border: '2px solid #ffffff',
      },
    }
  }

  return {
    isHighContrast,
    getHighContrastStyles,
  }
}

// Hook for reduced motion preferences
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const getAnimationStyles = (animations: any) => {
    if (prefersReducedMotion) {
      return {
        animation: 'none',
        transition: 'none',
        transform: 'none',
      }
    }
    return animations
  }

  return {
    prefersReducedMotion,
    getAnimationStyles,
  }
}

// Comprehensive accessibility hook
export function useAccessibility() {
  const focusManagement = useFocusManagement()
  const screenReader = useScreenReader()
  const highContrast = useHighContrast()
  const reducedMotion = useReducedMotion()

  return {
    ...focusManagement,
    ...screenReader,
    ...highContrast,
    ...reducedMotion,
  }
}