import { PrismaClient } from '@prisma/client'

// Database configuration with healthcare-specific optimizations
export interface DatabaseConfig {
  // Connection pooling
  connectionLimit: number
  acquireTimeout: number
  timeout: number
  
  // Healthcare compliance
  dataRetentionDays: number
  encryptionEnabled: boolean
  auditLoggingEnabled: boolean
  
  // Performance
  slowQueryThreshold: number
  connectionPoolingEnabled: boolean
  readReplicaEnabled: boolean
  
  // Monitoring
  performanceMonitoringEnabled: boolean
  healthCheckInterval: number
}

const databaseConfig: DatabaseConfig = {
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
  timeout: parseInt(process.env.DB_TIMEOUT || '30000'),
  
  // HIPAA compliance defaults
  dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '2555'), // 7 years default
  encryptionEnabled: process.env.DB_ENCRYPTION_ENABLED !== 'false',
  auditLoggingEnabled: process.env.AUDIT_LOGGING_ENABLED !== 'false',
  
  // Performance settings
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
  connectionPoolingEnabled: process.env.CONNECTION_POOLING_ENABLED !== 'false',
  readReplicaEnabled: process.env.READ_REPLICA_ENABLED === 'true',
  
  // Monitoring
  performanceMonitoringEnabled: process.env.PERFORMANCE_MONITORING_ENABLED !== 'false',
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000')
}

// Create Prisma client with optimized configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' }
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Connection pool optimization
    __internal: {
      engine: {
        // Connection pooling configuration
        connectionTimeout: databaseConfig.acquireTimeout,
        poolTimeout: databaseConfig.timeout,
        ...(databaseConfig.connectionPoolingEnabled && {
          datasourceOverrides: {
            db: {
              connection_limit: databaseConfig.connectionLimit
            }
          }
        })
      }
    }
  })
}

// Singleton instance
let prismaClient: PrismaClient | null = null

export const getPrismaClient = (): PrismaClient => {
  if (!prismaClient) {
    prismaClient = createPrismaClient()
    
    // Setup query logging for performance monitoring
    if (databaseConfig.performanceMonitoringEnabled) {
      prismaClient.$on('query', (e) => {
        const duration = e.duration
        if (duration > databaseConfig.slowQueryThreshold) {
          console.warn(`Slow query detected (${duration}ms):`, {
            query: e.query,
            params: e.params,
            duration: duration,
            timestamp: new Date().toISOString()
          })
        }
      })
      
      prismaClient.$on('error', (e) => {
        console.error('Database error:', e)
      })
    }
  }
  
  return prismaClient
}

// Healthcare data encryption utilities
export const encryptSensitiveData = (data: string): string => {
  if (!databaseConfig.encryptionEnabled) return data
  
  // Implement AES-256 encryption for PII data
  const crypto = require('crypto')
  const algorithm = 'aes-256-gcm'
  const secretKey = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'
  
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(algorithm, secretKey)
  
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return `${iv.toString('hex')}:${encrypted}`
}

export const decryptSensitiveData = (encryptedData: string): string => {
  if (!databaseConfig.encryptionEnabled) return encryptedData
  
  const crypto = require('crypto')
  const algorithm = 'aes-256-gcm'
  const secretKey = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'
  
  const [ivHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipher(algorithm, secretKey)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// Database health check utilities
export const performHealthCheck = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  connectionCount: number
  errors?: string[]
}> => {
  const client = getPrismaClient()
  const startTime = Date.now()
  const errors: string[] = []
  
  try {
    // Test basic connectivity
    await client.$queryRaw`SELECT 1`
    
    // Test connection count
    const connectionResult = await client.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM pg_stat_activity 
      WHERE state = 'active' AND application_name LIKE '%prisma%'
    `
    
    const connectionCount = Number(connectionResult[0]?.count || 0)
    const responseTime = Date.now() - startTime
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (responseTime > 1000) {
      status = 'degraded'
      errors.push(`Slow response time: ${responseTime}ms`)
    }
    
    if (connectionCount > databaseConfig.connectionLimit * 0.8) {
      status = 'degraded'
      errors.push(`High connection count: ${connectionCount}/${databaseConfig.connectionLimit}`)
    }
    
    return {
      status,
      responseTime,
      connectionCount,
      ...(errors.length > 0 && { errors })
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      connectionCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    }
  }
}

// Data retention and cleanup utilities
export const scheduleDataRetentionCleanup = () => {
  if (!databaseConfig.auditLoggingEnabled) return
  
  // Schedule cleanup every 24 hours
  setInterval(async () => {
    const client = getPrismaClient()
    const retentionDate = new Date()
    retentionDate.setDate(retentionDate.getDate() - databaseConfig.dataRetentionDays)
    
    try {
      // Clean up old audit logs
      const deletedAuditLogs = await client.auditLog.deleteMany({
        where: {
          performedAt: {
            lt: retentionDate
          }
        }
      })
      
      // Clean up expired password reset tokens
      const deletedTokens = await client.passwordResetToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })
      
      console.log(`Data retention cleanup completed:`, {
        auditLogsDeleted: deletedAuditLogs.count,
        tokensDeleted: deletedTokens.count,
        retentionDate: retentionDate.toISOString()
      })
      
    } catch (error) {
      console.error('Data retention cleanup failed:', error)
    }
  }, 24 * 60 * 60 * 1000) // 24 hours
}

export { databaseConfig }
export default getPrismaClient