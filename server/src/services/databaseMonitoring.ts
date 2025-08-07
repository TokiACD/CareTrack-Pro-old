import { getPrismaClient, performHealthCheck, databaseConfig } from '../config/database'
import { auditLogger } from './auditService'

interface QueryPerformanceMetrics {
  queryCount: number
  avgResponseTime: number
  slowQueries: number
  totalResponseTime: number
  queryTypes: Record<string, number>
}

interface DatabaseMetrics {
  connectionPool: {
    active: number
    idle: number
    total: number
    waiting: number
  }
  performance: QueryPerformanceMetrics
  storage: {
    totalSize: string
    indexSize: string
    tableSize: string
  }
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    responseTime: number
    lastCheck: Date
  }
}

class DatabaseMonitoringService {
  private metrics: QueryPerformanceMetrics = {
    queryCount: 0,
    avgResponseTime: 0,
    slowQueries: 0,
    totalResponseTime: 0,
    queryTypes: {}
  }
  
  private healthStatus: DatabaseMetrics['health'] = {
    status: 'healthy',
    responseTime: 0,
    lastCheck: new Date()
  }
  
  private monitoringInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.startMonitoring()
  }
  
  /**
   * Start continuous database monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics()
      await this.checkHealth()
      await this.analyzePerformance()
    }, databaseConfig.healthCheckInterval)
    
    console.log('Database monitoring started')
  }
  
  /**
   * Stop database monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    console.log('Database monitoring stopped')
  }
  
  /**
   * Collect comprehensive database metrics
   */
  async collectMetrics(): Promise<DatabaseMetrics> {
    const prisma = getPrismaClient()
    
    try {
      // Connection pool metrics
      const connectionPoolMetrics = await this.getConnectionPoolMetrics()
      
      // Storage metrics
      const storageMetrics = await this.getStorageMetrics()
      
      // Health check
      const healthCheck = await performHealthCheck()
      this.healthStatus = {
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
        lastCheck: new Date()
      }
      
      const metrics: DatabaseMetrics = {
        connectionPool: connectionPoolMetrics,
        performance: { ...this.metrics },
        storage: storageMetrics,
        health: this.healthStatus
      }
      
      // Log metrics for monitoring systems
      if (this.healthStatus.status !== 'healthy') {
        await auditLogger.logSystemEvent({
          action: 'DATABASE_HEALTH_DEGRADED',
          entityType: 'DATABASE',
          entityId: 'main',
          severity: this.healthStatus.status === 'unhealthy' ? 'ERROR' : 'WARN',
          details: {
            metrics,
            responseTime: healthCheck.responseTime,
            connectionCount: healthCheck.connectionCount,
            errors: healthCheck.errors
          }
        })
      }
      
      return metrics
      
    } catch (error) {
      console.error('Error collecting database metrics:', error)
      
      await auditLogger.logSystemEvent({
        action: 'DATABASE_MONITORING_ERROR',
        entityType: 'DATABASE',
        entityId: 'main',
        severity: 'ERROR',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      
      throw error
    }
  }
  
  /**
   * Get connection pool metrics
   */
  private async getConnectionPoolMetrics(): Promise<DatabaseMetrics['connectionPool']> {
    const prisma = getPrismaClient()
    
    try {
      const result = await prisma.$queryRaw<Array<{
        state: string
        count: bigint
      }>>`
        SELECT 
          state,
          count(*) as count
        FROM pg_stat_activity 
        WHERE application_name LIKE '%prisma%'
        GROUP BY state
      `
      
      const connectionStates = result.reduce((acc, row) => {
        acc[row.state] = Number(row.count)
        return acc
      }, {} as Record<string, number>)
      
      return {
        active: connectionStates.active || 0,
        idle: connectionStates.idle || 0,
        total: Object.values(connectionStates).reduce((sum, count) => sum + count, 0),
        waiting: connectionStates.waiting || 0
      }
      
    } catch (error) {
      console.error('Error getting connection pool metrics:', error)
      return { active: 0, idle: 0, total: 0, waiting: 0 }
    }
  }
  
  /**
   * Get database storage metrics
   */
  private async getStorageMetrics(): Promise<DatabaseMetrics['storage']> {
    const prisma = getPrismaClient()
    
    try {
      const result = await prisma.$queryRaw<Array<{
        total_size: string
        index_size: string
        table_size: string
      }>>`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as total_size,
          pg_size_pretty(
            sum(pg_total_relation_size(schemaname||'.'||indexrelname)::bigint)
          ) as index_size,
          pg_size_pretty(
            sum(pg_total_relation_size(schemaname||'.'||tablename)::bigint)
          ) as table_size
        FROM pg_tables 
        WHERE schemaname = 'public'
      `
      
      const metrics = result[0] || { total_size: '0 bytes', index_size: '0 bytes', table_size: '0 bytes' }
      
      return {
        totalSize: metrics.total_size,
        indexSize: metrics.index_size,
        tableSize: metrics.table_size
      }
      
    } catch (error) {
      console.error('Error getting storage metrics:', error)
      return { totalSize: '0 bytes', indexSize: '0 bytes', tableSize: '0 bytes' }
    }
  }
  
  /**
   * Check database health and performance
   */
  private async checkHealth(): Promise<void> {
    try {
      const healthCheck = await performHealthCheck()
      
      // Update health status
      this.healthStatus = {
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
        lastCheck: new Date()
      }
      
      // Alert on health degradation
      if (healthCheck.status === 'unhealthy') {
        console.error('Database health check failed:', healthCheck.errors)
        
        await auditLogger.logSystemEvent({
          action: 'DATABASE_UNHEALTHY',
          entityType: 'DATABASE',
          entityId: 'main',
          severity: 'ERROR',
          details: {
            responseTime: healthCheck.responseTime,
            connectionCount: healthCheck.connectionCount,
            errors: healthCheck.errors
          }
        })
      } else if (healthCheck.status === 'degraded') {
        console.warn('Database performance degraded:', healthCheck.errors)
        
        await auditLogger.logSystemEvent({
          action: 'DATABASE_DEGRADED',
          entityType: 'DATABASE',
          entityId: 'main',
          severity: 'WARN',
          details: {
            responseTime: healthCheck.responseTime,
            connectionCount: healthCheck.connectionCount,
            errors: healthCheck.errors
          }
        })
      }
      
    } catch (error) {
      console.error('Database health check error:', error)
      
      this.healthStatus = {
        status: 'unhealthy',
        responseTime: 0,
        lastCheck: new Date()
      }
    }
  }
  
  /**
   * Analyze query performance and identify bottlenecks
   */
  private async analyzePerformance(): Promise<void> {
    const prisma = getPrismaClient()
    
    try {
      // Get slow query statistics
      const slowQueries = await prisma.$queryRaw<Array<{
        query: string
        calls: bigint
        total_exec_time: number
        mean_exec_time: number
        rows: bigint
      }>>`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_exec_time > ${databaseConfig.slowQueryThreshold}
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `
      
      if (slowQueries.length > 0) {
        console.warn(`Found ${slowQueries.length} slow queries:`)
        slowQueries.forEach((query, index) => {
          console.warn(`${index + 1}. Average: ${query.mean_exec_time}ms, Calls: ${query.calls}`)
          console.warn(`   Query: ${query.query.substring(0, 100)}...`)
        })
        
        await auditLogger.logSystemEvent({
          action: 'SLOW_QUERIES_DETECTED',
          entityType: 'DATABASE',
          entityId: 'main',
          severity: 'WARN',
          details: {
            slowQueryCount: slowQueries.length,
            queries: slowQueries.map(q => ({
              query: q.query.substring(0, 200),
              meanTime: q.mean_exec_time,
              calls: Number(q.calls)
            }))
          }
        })
      }
      
      // Check for missing indexes
      await this.checkMissingIndexes()
      
      // Check for table bloat
      await this.checkTableBloat()
      
    } catch (error) {
      console.error('Performance analysis error:', error)
    }
  }
  
  /**
   * Check for missing indexes that could improve performance
   */
  private async checkMissingIndexes(): Promise<void> {
    const prisma = getPrismaClient()
    
    try {
      const missingIndexes = await prisma.$queryRaw<Array<{
        schemaname: string
        tablename: string
        attname: string
        n_distinct: number
        correlation: number
      }>>`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname = 'public'
        AND n_distinct > 10
        AND correlation < 0.1
        AND attname NOT IN (
          SELECT column_name 
          FROM information_schema.statistics 
          WHERE table_schema = 'public'
        )
        ORDER BY n_distinct DESC
      `
      
      if (missingIndexes.length > 0) {
        console.warn(`Potential missing indexes detected on ${missingIndexes.length} columns`)
        
        await auditLogger.logSystemEvent({
          action: 'MISSING_INDEXES_DETECTED',
          entityType: 'DATABASE',
          entityId: 'main',
          severity: 'INFO',
          details: {
            missingIndexes: missingIndexes.slice(0, 5) // Limit to top 5
          }
        })
      }
      
    } catch (error) {
      // Missing pg_stats is not critical
      console.debug('Could not check for missing indexes:', error)
    }
  }
  
  /**
   * Check for table bloat that might affect performance
   */
  private async checkTableBloat(): Promise<void> {
    const prisma = getPrismaClient()
    
    try {
      const tableStats = await prisma.$queryRaw<Array<{
        tablename: string
        n_tup_ins: bigint
        n_tup_upd: bigint
        n_tup_del: bigint
        n_dead_tup: bigint
        last_vacuum: Date | null
        last_autovacuum: Date | null
      }>>`
        SELECT 
          relname as tablename,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_dead_tup,
          last_vacuum,
          last_autovacuum
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000
        ORDER BY n_dead_tup DESC
      `
      
      if (tableStats.length > 0) {
        console.warn(`Tables with high dead tuple count detected: ${tableStats.length}`)
        
        await auditLogger.logSystemEvent({
          action: 'TABLE_BLOAT_DETECTED',
          entityType: 'DATABASE',
          entityId: 'main',
          severity: 'WARN',
          details: {
            bloatedTables: tableStats.slice(0, 3).map(table => ({
              tablename: table.tablename,
              deadTuples: Number(table.n_dead_tup),
              lastVacuum: table.last_vacuum,
              lastAutovacuum: table.last_autovacuum
            }))
          }
        })
      }
      
    } catch (error) {
      console.debug('Could not check table bloat:', error)
    }
  }
  
  /**
   * Record query performance for monitoring
   */
  recordQuery(queryType: string, responseTime: number): void {
    this.metrics.queryCount++
    this.metrics.totalResponseTime += responseTime
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.queryCount
    
    if (responseTime > databaseConfig.slowQueryThreshold) {
      this.metrics.slowQueries++
    }
    
    this.metrics.queryTypes[queryType] = (this.metrics.queryTypes[queryType] || 0) + 1
  }
  
  /**
   * Get current database metrics
   */
  getCurrentMetrics(): DatabaseMetrics {
    return {
      connectionPool: { active: 0, idle: 0, total: 0, waiting: 0 }, // Will be populated by collectMetrics
      performance: { ...this.metrics },
      storage: { totalSize: '0 bytes', indexSize: '0 bytes', tableSize: '0 bytes' }, // Will be populated by collectMetrics
      health: { ...this.healthStatus }
    }
  }
  
  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      queryCount: 0,
      avgResponseTime: 0,
      slowQueries: 0,
      totalResponseTime: 0,
      queryTypes: {}
    }
  }
  
  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<{
    summary: string
    metrics: DatabaseMetrics
    recommendations: string[]
  }> {
    const metrics = await this.collectMetrics()
    const recommendations: string[] = []
    
    // Generate recommendations based on metrics
    if (metrics.performance.slowQueries > metrics.performance.queryCount * 0.1) {
      recommendations.push('Consider optimizing slow queries or adding missing indexes')
    }
    
    if (metrics.connectionPool.active > metrics.connectionPool.total * 0.8) {
      recommendations.push('Consider increasing connection pool size')
    }
    
    if (metrics.health.responseTime > 1000) {
      recommendations.push('Database response time is high, investigate performance bottlenecks')
    }
    
    const summary = `Database Health: ${metrics.health.status.toUpperCase()} | ` +
                   `Response Time: ${metrics.health.responseTime}ms | ` +
                   `Active Connections: ${metrics.connectionPool.active}/${metrics.connectionPool.total} | ` +
                   `Slow Queries: ${metrics.performance.slowQueries}/${metrics.performance.queryCount}`
    
    return {
      summary,
      metrics,
      recommendations
    }
  }
}

// Export singleton instance
export const databaseMonitoring = new DatabaseMonitoringService()

// Export health check endpoint handler
export const healthCheckHandler = async (req: any, res: any) => {
  try {
    const report = await databaseMonitoring.generatePerformanceReport()
    
    res.json({
      success: true,
      data: {
        status: report.metrics.health.status,
        timestamp: report.metrics.health.lastCheck,
        summary: report.summary,
        metrics: report.metrics,
        recommendations: report.recommendations
      }
    })
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export default databaseMonitoring