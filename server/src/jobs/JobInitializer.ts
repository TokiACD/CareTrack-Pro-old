import { redisService } from '../services/RedisService'
import { jobProcessor } from './JobProcessor'
import EmailJobHandlers from './handlers/EmailJobHandlers'
import { emailService } from '../services/EmailService'

/**
 * Initialize the complete job processing system
 * Sets up Redis connections, job queues, and registers all handlers
 */
export class JobInitializer {
  private static initialized = false

  /**
   * Initialize the complete job system
   */
  static async initialize(): Promise<void> {
    if (JobInitializer.initialized) {
      console.log('⚠️  Job system already initialized')
      return
    }

    try {
      console.log('🚀 Initializing CareTrack Pro Job Processing System...')

      // Step 1: Initialize Redis connections
      console.log('🔄 Step 1: Initializing Redis connections...')
      await redisService.initialize()
      console.log('✅ Redis connections established')

      // Step 2: Test email service connection
      console.log('🔄 Step 2: Testing email service connection...')
      const emailResult = await emailService.initializeService()
      if (!emailResult.success) {
        console.warn(`⚠️  Email service initialization warning: ${emailResult.error}`)
        console.warn('⚠️  Email jobs will be queued but may fail during processing')
      } else {
        console.log('✅ Email service connection verified')
      }

      // Step 3: Initialize job processor
      console.log('🔄 Step 3: Initializing job processor and queues...')
      await jobProcessor.initialize()
      console.log('✅ Job processor and queues ready')

      // Step 4: Register email job handlers
      console.log('🔄 Step 4: Registering email job handlers...')
      EmailJobHandlers.registerHandlers(jobProcessor)
      console.log('✅ Email job handlers registered')

      // Step 5: Health check
      console.log('🔄 Step 5: Performing system health check...')
      const healthCheck = await JobInitializer.performHealthCheck()
      
      if (!healthCheck.healthy) {
        console.warn('⚠️  Health check warnings detected:')
        console.warn(JSON.stringify(healthCheck, null, 2))
      } else {
        console.log('✅ All systems healthy')
      }

      JobInitializer.initialized = true
      console.log('🎉 Job Processing System initialization complete!')
      console.log('')
      console.log('📊 System Status:')
      console.log(`   Redis Connections: ${healthCheck.redis.healthy ? '✅' : '❌'}`)
      console.log(`   Job Processor: ${healthCheck.jobProcessor.healthy ? '✅' : '❌'}`)
      console.log(`   Email Service: ${healthCheck.email ? '✅' : '⚠️'}`)
      console.log('')

    } catch (error) {
      console.error('❌ Failed to initialize job processing system:', error)
      throw error
    }
  }

  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(): Promise<{
    healthy: boolean
    redis: any
    jobProcessor: any
    email: boolean
    timestamp: string
  }> {
    try {
      // Check Redis connections
      const redisHealth = await redisService.healthCheck()
      
      // Check job processor
      const jobProcessorHealth = await jobProcessor.healthCheck()
      
      // Check email service
      const emailHealthy = await emailService.testConnection()

      const overall = redisHealth.healthy && jobProcessorHealth.healthy && emailHealthy

      return {
        healthy: overall,
        redis: redisHealth,
        jobProcessor: jobProcessorHealth,
        email: emailHealthy,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        healthy: false,
        redis: { healthy: false, error: 'Health check failed' },
        jobProcessor: { healthy: false, error: 'Health check failed' },
        email: false,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Gracefully shutdown the job system
   */
  static async shutdown(): Promise<void> {
    if (!JobInitializer.initialized) {
      console.log('Job system not initialized, nothing to shutdown')
      return
    }

    try {
      console.log('🔄 Shutting down job processing system...')

      // Shutdown job processor
      await jobProcessor.shutdown()
      console.log('✅ Job processor shutdown complete')

      // Disconnect Redis
      await redisService.disconnect()
      console.log('✅ Redis connections closed')

      JobInitializer.initialized = false
      console.log('✅ Job processing system shutdown complete')
    } catch (error) {
      console.error('❌ Error during job system shutdown:', error)
      throw error
    }
  }

  /**
   * Get initialization status
   */
  static isInitialized(): boolean {
    return JobInitializer.initialized
  }

  /**
   * Force re-initialization (for development/testing)
   */
  static async reinitialize(): Promise<void> {
    if (JobInitializer.initialized) {
      await JobInitializer.shutdown()
    }
    await JobInitializer.initialize()
  }

  /**
   * Get system status summary
   */
  static async getSystemStatus(): Promise<{
    initialized: boolean
    healthy: boolean
    uptime: string
    queues: Record<string, any>
    connections: any
  }> {
    if (!JobInitializer.initialized) {
      return {
        initialized: false,
        healthy: false,
        uptime: '0s',
        queues: {},
        connections: {}
      }
    }

    try {
      const healthCheck = await JobInitializer.performHealthCheck()
      const queueStats = await jobProcessor.getAllQueueStats()

      return {
        initialized: true,
        healthy: healthCheck.healthy,
        uptime: process.uptime() + 's',
        queues: queueStats,
        connections: {
          redis: healthCheck.redis,
          email: healthCheck.email
        }
      }
    } catch (error) {
      return {
        initialized: true,
        healthy: false,
        uptime: process.uptime() + 's',
        queues: {},
        connections: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }
}

export default JobInitializer