/**
 * Enhanced logging service with performance monitoring
 * Production-safe logging with comprehensive performance tracking
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: Date
  context?: string
  stack?: string
  userAgent?: string
  url?: string
}

interface PerformanceEntry {
  name: string
  startTime: number
  duration: number
  category: string
  metadata?: any
}

class Logger {
  private isDevelopment = import.meta.env.DEV
  private logLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info'
  private logs: LogEntry[] = []
  private performanceEntries: PerformanceEntry[] = []
  private maxLogs = 1000
  private maxPerformanceEntries = 500

  constructor() {
    this.initializeErrorHandling()
    this.initializePerformanceMonitoring()
  }

  private initializeErrorHandling() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      }, 'global')
    })

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      }, 'global')
    })
  }

  private initializePerformanceMonitoring() {
    // Monitor page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        const navTiming = performance.timing
        this.recordPerformance('page-load', 0, 'navigation', {
          domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.navigationStart,
          loadComplete: navTiming.loadEventEnd - navTiming.navigationStart
        })
      })
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && level === 'debug') {
      return false
    }
    
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)
    
    return messageLevelIndex >= currentLevelIndex
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const context = entry.context ? `[${entry.context}]` : ''
    return `[${timestamp}] ${entry.level.toUpperCase()} ${context} ${entry.message}`
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    }

    // Add stack trace for errors
    if (level === 'error') {
      entry.stack = new Error().stack
    }

    // Store log entry
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Only output to console if appropriate
    if (this.shouldLog(level)) {
      const formattedMessage = this.formatMessage(entry)
      
      switch (level) {
        case 'debug':
          console.debug(formattedMessage, data || '')
          break
        case 'info':
          console.info(formattedMessage, data || '')
          break
        case 'warn':
          console.warn(formattedMessage, data || '')
          break
        case 'error':
          console.error(formattedMessage, data || '')
          if (entry.stack && this.isDevelopment) {
            console.error(entry.stack)
          }
          break
      }
    }

    // In production, send errors to monitoring service
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoring(entry)
    }
  }

  private sendToMonitoring(entry: LogEntry) {
    try {
      // Store critical errors locally for debugging
      const existingErrors = JSON.parse(localStorage.getItem('app-errors') || '[]')
      existingErrors.push(entry)
      
      // Keep only last 50 errors
      const recentErrors = existingErrors.slice(-50)
      localStorage.setItem('app-errors', JSON.stringify(recentErrors))
    } catch (err) {
      console.error('Failed to store error log:', err)
    }
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context)
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context)
  }

  error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context)
  }

  // Performance monitoring methods
  startTimer(name: string, category: string = 'timing'): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.recordPerformance(name, startTime, category, { duration })
    }
  }

  recordPerformance(name: string, startTime: number, category: string, metadata?: any) {
    const entry: PerformanceEntry = {
      name,
      startTime,
      duration: performance.now() - startTime,
      category,
      metadata
    }

    this.performanceEntries.push(entry)
    if (this.performanceEntries.length > this.maxPerformanceEntries) {
      this.performanceEntries.shift()
    }

    // Log slow operations
    if (entry.duration > 100) { // >100ms
      this.warn(`Slow operation: ${name}`, {
        duration: entry.duration,
        category,
        metadata
      }, 'performance')
    }
  }

  // API call monitoring
  logApiCall(url: string, method: string, duration: number, status: number, error?: any) {
    const category = 'api'
    const isError = status >= 400 || error

    if (isError) {
      this.error(`API Error: ${method} ${url}`, {
        status,
        duration,
        error
      }, category)
    } else if (duration > 2000) { // >2s
      this.warn(`Slow API call: ${method} ${url}`, {
        status,
        duration
      }, category)
    } else {
      this.debug(`API call: ${method} ${url}`, {
        status,
        duration
      }, category)
    }

    this.recordPerformance(`API: ${method} ${url}`, performance.now() - duration, category, {
      status,
      error: !!error
    })
  }

  // React component performance monitoring
  logComponentRender(componentName: string, renderTime: number, props?: any) {
    if (renderTime > 16) { // >16ms (one frame)
      this.warn(`Slow component render: ${componentName}`, {
        renderTime,
        props: Object.keys(props || {})
      }, 'react')
    }

    this.recordPerformance(`React: ${componentName}`, performance.now() - renderTime, 'react', {
      renderTime,
      propsCount: props ? Object.keys(props).length : 0
    })
  }

  // Memory usage monitoring
  logMemoryUsage(context: string = 'general') {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      this.info(`Memory usage: ${context}`, {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        allocated: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      }, 'memory')
    }
  }

  // Get stored logs for debugging
  getLogs(level?: LogLevel, context?: string): LogEntry[] {
    let filtered = this.logs

    if (level) {
      filtered = filtered.filter(log => log.level === level)
    }

    if (context) {
      filtered = filtered.filter(log => log.context === context)
    }

    return filtered
  }

  getPerformanceEntries(category?: string): PerformanceEntry[] {
    if (category) {
      return this.performanceEntries.filter(entry => entry.category === category)
    }
    return this.performanceEntries
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      performance: this.performanceEntries,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }, null, 2)
  }

  // Clear stored logs
  clearLogs() {
    this.logs = []
    this.performanceEntries = []
  }

  // Get performance summary
  getPerformanceSummary() {
    const apiEntries = this.performanceEntries.filter(entry => entry.category === 'api')
    const reactEntries = this.performanceEntries.filter(entry => entry.category === 'react')
    const errors = this.logs.filter(log => log.level === 'error')
    const warnings = this.logs.filter(log => log.level === 'warn')

    return {
      totalApiCalls: apiEntries.length,
      averageApiTime: apiEntries.length > 0 
        ? apiEntries.reduce((sum, entry) => sum + entry.duration, 0) / apiEntries.length 
        : 0,
      slowApiCalls: apiEntries.filter(entry => entry.duration > 2000).length,
      componentRenders: reactEntries.length,
      slowRenders: reactEntries.filter(entry => entry.duration > 16).length,
      errorCount: errors.length,
      warningCount: warnings.length
    }
  }
}

export const logger = new Logger()

// Performance measurement utilities
export const measurePerformance = <T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  category: string = 'function'
): T => {
  return ((...args: any[]) => {
    const endTimer = logger.startTimer(name, category)
    try {
      const result = fn(...args)
      if (result instanceof Promise) {
        return result.finally(endTimer)
      } else {
        endTimer()
        return result
      }
    } catch (error) {
      endTimer()
      throw error
    }
  }) as T
}

// Export default
export default logger