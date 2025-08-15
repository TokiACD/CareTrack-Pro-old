import Redis from 'ioredis'
import { 
  redisConfig, 
  jobQueueRedisConfig, 
  sessionRedisConfig, 
  cacheRedisConfig,
  validateRedisConnection 
} from '../config/redis'

export class RedisService {
  private static instance: RedisService
  private mainRedis: Redis | null = null
  private jobQueueRedis: Redis | null = null
  private sessionRedis: Redis | null = null
  private cacheRedis: Redis | null = null
  private connectionStatus = {
    main: false,
    jobQueue: false,
    session: false,
    cache: false
  }

  private constructor() {}

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService()
    }
    return RedisService.instance
  }

  /**
   * Initialize all Redis connections
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing Redis connections...')

      // Initialize main Redis connection
      await this.initializeMainRedis()
      
      // Initialize job queue Redis connection
      await this.initializeJobQueueRedis()
      
      // Initialize session Redis connection
      await this.initializeSessionRedis()
      
      // Initialize cache Redis connection
      await this.initializeCacheRedis()

      console.log('✅ All Redis connections initialized successfully')
      this.logConnectionStatus()
    } catch (error) {
      console.error('❌ Failed to initialize Redis connections:', error)
      throw error
    }
  }

  /**
   * Initialize main Redis connection
   */
  private async initializeMainRedis(): Promise<void> {
    this.mainRedis = new Redis(redisConfig)
    
    this.mainRedis.on('connect', () => {
      console.log('📡 Main Redis: Connected')
      this.connectionStatus.main = true
    })

    this.mainRedis.on('error', (error) => {
      console.error('❌ Main Redis Error:', error)
      this.connectionStatus.main = false
    })

    this.mainRedis.on('ready', () => {
      console.log('🟢 Main Redis: Ready')
    })

    this.mainRedis.on('close', () => {
      console.log('🔴 Main Redis: Connection closed')
      this.connectionStatus.main = false
    })

    // Wait for connection and validate
    await this.waitForConnection(this.mainRedis, 'Main Redis')
    const isValid = await validateRedisConnection(this.mainRedis)
    if (!isValid) {
      throw new Error('Main Redis connection validation failed')
    }
  }

  /**
   * Initialize job queue Redis connection
   */
  private async initializeJobQueueRedis(): Promise<void> {
    this.jobQueueRedis = new Redis(jobQueueRedisConfig)
    
    this.jobQueueRedis.on('connect', () => {
      console.log('📡 Job Queue Redis: Connected')
      this.connectionStatus.jobQueue = true
    })

    this.jobQueueRedis.on('error', (error) => {
      console.error('❌ Job Queue Redis Error:', error)
      this.connectionStatus.jobQueue = false
    })

    await this.waitForConnection(this.jobQueueRedis, 'Job Queue Redis')
  }

  /**
   * Initialize session Redis connection
   */
  private async initializeSessionRedis(): Promise<void> {
    this.sessionRedis = new Redis(sessionRedisConfig)
    
    this.sessionRedis.on('connect', () => {
      console.log('📡 Session Redis: Connected')
      this.connectionStatus.session = true
    })

    this.sessionRedis.on('error', (error) => {
      console.error('❌ Session Redis Error:', error)
      this.connectionStatus.session = false
    })

    await this.waitForConnection(this.sessionRedis, 'Session Redis')
  }

  /**
   * Initialize cache Redis connection
   */
  private async initializeCacheRedis(): Promise<void> {
    this.cacheRedis = new Redis(cacheRedisConfig)
    
    this.cacheRedis.on('connect', () => {
      console.log('📡 Cache Redis: Connected')
      this.connectionStatus.cache = true
    })

    this.cacheRedis.on('error', (error) => {
      console.error('❌ Cache Redis Error:', error)
      this.connectionStatus.cache = false
    })

    await this.waitForConnection(this.cacheRedis, 'Cache Redis')
  }

  /**
   * Wait for Redis connection to be ready
   */
  private async waitForConnection(redis: Redis, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${name} connection timeout`))
      }, 10000) // 10 second timeout

      redis.once('ready', () => {
        clearTimeout(timeout)
        resolve()
      })

      redis.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })

      // Try to connect if not already connecting
      if (redis.status === 'wait') {
        redis.connect().catch(reject)
      }
    })
  }

  /**
   * Get main Redis instance
   */
  public getMainRedis(): Redis {
    if (!this.mainRedis) {
      throw new Error('Main Redis not initialized. Call initialize() first.')
    }
    return this.mainRedis
  }

  /**
   * Get job queue Redis instance
   */
  public getJobQueueRedis(): Redis {
    if (!this.jobQueueRedis) {
      throw new Error('Job Queue Redis not initialized. Call initialize() first.')
    }
    return this.jobQueueRedis
  }

  /**
   * Get session Redis instance
   */
  public getSessionRedis(): Redis {
    if (!this.sessionRedis) {
      throw new Error('Session Redis not initialized. Call initialize() first.')
    }
    return this.sessionRedis
  }

  /**
   * Get cache Redis instance
   */
  public getCacheRedis(): Redis {
    if (!this.cacheRedis) {
      throw new Error('Cache Redis not initialized. Call initialize() first.')
    }
    return this.cacheRedis
  }

  /**
   * Check if all connections are healthy
   */
  public async healthCheck(): Promise<{
    healthy: boolean
    connections: typeof this.connectionStatus
    details: Record<string, any>
  }> {
    const details: Record<string, any> = {}

    try {
      // Check main Redis
      if (this.mainRedis) {
        const mainPing = await this.mainRedis.ping()
        details.main = { ping: mainPing, status: this.mainRedis.status }
      }

      // Check job queue Redis
      if (this.jobQueueRedis) {
        const jobQueuePing = await this.jobQueueRedis.ping()
        details.jobQueue = { ping: jobQueuePing, status: this.jobQueueRedis.status }
      }

      // Check session Redis
      if (this.sessionRedis) {
        const sessionPing = await this.sessionRedis.ping()
        details.session = { ping: sessionPing, status: this.sessionRedis.status }
      }

      // Check cache Redis
      if (this.cacheRedis) {
        const cachePing = await this.cacheRedis.ping()
        details.cache = { ping: cachePing, status: this.cacheRedis.status }
      }

      const healthy = Object.values(this.connectionStatus).every(status => status)

      return {
        healthy,
        connections: this.connectionStatus,
        details
      }
    } catch (error) {
      return {
        healthy: false,
        connections: this.connectionStatus,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Log connection status
   */
  private logConnectionStatus(): void {
    console.log('📊 Redis Connection Status:')
    console.log(`   Main Redis: ${this.connectionStatus.main ? '✅' : '❌'}`)
    console.log(`   Job Queue Redis: ${this.connectionStatus.jobQueue ? '✅' : '❌'}`)
    console.log(`   Session Redis: ${this.connectionStatus.session ? '✅' : '❌'}`)
    console.log(`   Cache Redis: ${this.connectionStatus.cache ? '✅' : '❌'}`)
  }

  /**
   * Gracefully close all Redis connections
   */
  public async disconnect(): Promise<void> {
    console.log('🔄 Closing Redis connections...')

    const promises = []

    if (this.mainRedis) {
      promises.push(this.mainRedis.disconnect())
    }

    if (this.jobQueueRedis) {
      promises.push(this.jobQueueRedis.disconnect())
    }

    if (this.sessionRedis) {
      promises.push(this.sessionRedis.disconnect())
    }

    if (this.cacheRedis) {
      promises.push(this.cacheRedis.disconnect())
    }

    await Promise.all(promises)
    console.log('✅ All Redis connections closed')
  }
}

// Export singleton instance
export const redisService = RedisService.getInstance()