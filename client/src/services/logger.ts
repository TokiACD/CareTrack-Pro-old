/**
 * Centralized logging service for production-safe logging
 * Logs are only shown in development mode by default
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: Date
  context?: string
}

class Logger {
  private isDevelopment = import.meta.env.DEV
  private logLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info'
  private logs: LogEntry[] = []
  private maxLogs = 1000

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
      context
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
          break
      }
    }

    // In production, you might want to send errors to a monitoring service
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoring(entry)
    }
  }

  private sendToMonitoring(entry: LogEntry) {
    // Implement integration with error monitoring service
    // e.g., Sentry, LogRocket, etc.
    // This is a placeholder for production error reporting
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

  // Get stored logs for debugging
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level)
    }
    return this.logs
  }

  // Clear stored logs
  clearLogs() {
    this.logs = []
  }
}

export const logger = new Logger()