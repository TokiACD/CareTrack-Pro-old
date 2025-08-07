import { Request, Response, NextFunction } from 'express'
import { getPrismaClient, performHealthCheck, databaseConfig } from '../config/database'
import { validateConstraints } from '../middleware/dataIntegrity'
import { auditLogger } from '../services/auditService'
import { databaseMonitoring } from '../services/databaseMonitoring'

interface DatabaseOperationRequest extends Request {
  body: {
    operation: 'vacuum' | 'reindex' | 'analyze' | 'backup' | 'validate'
    options?: any
  }
}

export class DatabaseController {
  private prisma = getPrismaClient()

  /**
   * Execute database maintenance operations
   */
  async performMaintenance(req: DatabaseOperationRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      const { operation, options = {} } = req.body

      if (!operation) {
        return res.status(400).json({
          success: false,
          error: 'Operation type is required'
        })
      }

      const validOperations = ['vacuum', 'reindex', 'analyze', 'backup', 'validate']
      if (!validOperations.includes(operation)) {
        return res.status(400).json({
          success: false,
          error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
        })
      }

      // Log the maintenance operation request
      await auditLogger.logSystemEvent({
        action: 'DATABASE_MAINTENANCE_REQUESTED',
        entityType: 'DATABASE',
        entityId: 'main',
        severity: 'INFO',
        details: { operation, options },
        performedByAdminId: adminId,
        performedByAdminName: req.user?.name || 'Unknown',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })

      const startTime = Date.now()
      let result: any

      switch (operation) {
        case 'vacuum':
          result = await this.performVacuum()
          break
        case 'reindex':
          result = await this.performReindex()
          break
        case 'analyze':
          result = await this.performAnalyze()
          break
        case 'backup':
          result = await this.performBackup(options)
          break
        case 'validate':
          result = await this.validateIntegrity()
          break
        default:
          throw new Error(`Unsupported operation: ${operation}`)
      }

      const duration = Date.now() - startTime

      await auditLogger.logSystemEvent({
        action: 'DATABASE_MAINTENANCE_COMPLETED',
        entityType: 'DATABASE',
        entityId: 'main',
        severity: result.success ? 'INFO' : 'WARN',
        details: {
          operation,
          duration,
          result: result.success,
          details: result.details
        },
        performedByAdminId: adminId,
        performedByAdminName: req.user?.name || 'Unknown',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })

      res.json({
        success: result.success,
        data: {
          operation,
          duration,
          ...result
        },
        message: `Database ${operation} ${result.success ? 'completed successfully' : 'completed with issues'}`
      })

    } catch (error) {
      console.error('Database maintenance error:', error)
      
      await auditLogger.logSystemEvent({
        action: 'DATABASE_MAINTENANCE_FAILED',
        entityType: 'DATABASE',
        entityId: 'main',
        severity: 'ERROR',
        details: {
          operation: req.body.operation,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        performedByAdminId: req.user?.id || 'unknown',
        performedByAdminName: req.user?.name || 'Unknown',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })

      next(error)
    }
  }

  /**
   * Get database connection statistics
   */
  async getConnectionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.prisma.$queryRaw<Array<{
        state: string
        count: bigint
        application_name: string
      }>>`
        SELECT 
          state,
          count(*) as count,
          application_name
        FROM pg_stat_activity 
        WHERE application_name LIKE '%prisma%'
        GROUP BY state, application_name
        ORDER BY count DESC
      `

      const connectionInfo = await this.prisma.$queryRaw<Array<{
        max_connections: number
        current_connections: bigint
      }>>`
        SELECT 
          setting::int as max_connections,
          (SELECT count(*) FROM pg_stat_activity) as current_connections
        FROM pg_settings 
        WHERE name = 'max_connections'
      `

      res.json({
        success: true,
        data: {
          connectionStats: stats.map(stat => ({
            state: stat.state,
            count: Number(stat.count),
            application: stat.application_name
          })),
          connectionLimits: connectionInfo[0] ? {
            maxConnections: connectionInfo[0].max_connections,
            currentConnections: Number(connectionInfo[0].current_connections)
          } : null
        }
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get table statistics
   */
  async getTableStats(req: Request, res: Response, next: NextFunction) {
    try {
      const tableStats = await this.prisma.$queryRaw<Array<{
        table_name: string
        row_count: bigint
        table_size: string
        index_size: string
        total_size: string
      }>>`
        SELECT 
          schemaname||'.'||tablename as table_name,
          n_tup_ins + n_tup_upd + n_tup_del as row_count,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `

      res.json({
        success: true,
        data: {
          tables: tableStats.map(table => ({
            name: table.table_name,
            rowCount: Number(table.row_count),
            tableSize: table.table_size,
            indexSize: table.index_size,
            totalSize: table.total_size
          }))
        }
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get query performance statistics
   */
  async getQueryStats(req: Request, res: Response, next: NextFunction) {
    try {
      const queryStats = await this.prisma.$queryRaw<Array<{
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
        ORDER BY total_exec_time DESC
        LIMIT 20
      `

      res.json({
        success: true,
        data: {
          queries: queryStats.map(query => ({
            query: query.query.length > 200 ? query.query.substring(0, 200) + '...' : query.query,
            calls: Number(query.calls),
            totalTime: query.total_exec_time,
            avgTime: query.mean_exec_time,
            rows: Number(query.rows)
          }))
        }
      })

    } catch (error) {
      // pg_stat_statements extension might not be available
      res.json({
        success: true,
        data: {
          queries: [],
          message: 'Query statistics not available (pg_stat_statements extension may not be installed)'
        }
      })
    }
  }

  /**
   * Validate specific record constraints
   */
  async validateRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { modelName, operation, data, id } = req.body

      if (!modelName || !operation) {
        return res.status(400).json({
          success: false,
          error: 'Model name and operation are required'
        })
      }

      const validation = await validateConstraints(modelName, operation, data, id)

      res.json({
        success: validation.isValid,
        data: validation,
        message: validation.isValid ? 'Validation passed' : 'Validation failed'
      })

    } catch (error) {
      next(error)
    }
  }

  // Private helper methods

  private async performVacuum(): Promise<{ success: boolean; details?: any }> {
    try {
      await this.prisma.$executeRaw`VACUUM ANALYZE`
      return { success: true, details: 'All tables vacuumed and analyzed' }
    } catch (error) {
      return { 
        success: false, 
        details: error instanceof Error ? error.message : 'Vacuum failed' 
      }
    }
  }

  private async performReindex(): Promise<{ success: boolean; details?: any }> {
    try {
      // Get all non-primary key indexes
      const indexes = await this.prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname NOT LIKE '%_pkey'
      `

      const results: Record<string, boolean> = {}
      for (const index of indexes) {
        try {
          await this.prisma.$executeRawUnsafe(`REINDEX INDEX "${index.indexname}"`)
          results[index.indexname] = true
        } catch (error) {
          results[index.indexname] = false
        }
      }

      const successful = Object.values(results).filter(Boolean).length
      const total = indexes.length

      return {
        success: successful === total,
        details: {
          reindexedIndexes: successful,
          totalIndexes: total,
          results
        }
      }
    } catch (error) {
      return { 
        success: false, 
        details: error instanceof Error ? error.message : 'Reindex failed' 
      }
    }
  }

  private async performAnalyze(): Promise<{ success: boolean; details?: any }> {
    try {
      await this.prisma.$executeRaw`ANALYZE`
      return { success: true, details: 'All tables analyzed successfully' }
    } catch (error) {
      return { 
        success: false, 
        details: error instanceof Error ? error.message : 'Analyze failed' 
      }
    }
  }

  private async performBackup(options: any): Promise<{ success: boolean; details?: any }> {
    // This would typically integrate with a backup service
    return {
      success: false,
      details: 'Backup functionality requires external backup service integration'
    }
  }

  private async validateIntegrity(): Promise<{ success: boolean; details?: any }> {
    try {
      const issues: string[] = []

      // Check for orphaned records
      const orphanChecks = [
        {
          name: 'Assessment responses without carers',
          count: await this.prisma.assessmentResponse.count({
            where: { carer: null }
          })
        },
        {
          name: 'Competency ratings without carers',
          count: await this.prisma.competencyRating.count({
            where: { carer: null }
          })
        }
      ]

      for (const check of orphanChecks) {
        if (check.count > 0) {
          issues.push(`${check.name}: ${check.count} records`)
        }
      }

      return {
        success: issues.length === 0,
        details: {
          issues,
          checksPerformed: orphanChecks.length
        }
      }
    } catch (error) {
      return { 
        success: false, 
        details: error instanceof Error ? error.message : 'Integrity validation failed' 
      }
    }
  }
}

export const databaseController = new DatabaseController()